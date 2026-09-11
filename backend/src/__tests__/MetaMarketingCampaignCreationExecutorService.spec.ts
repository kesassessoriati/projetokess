const mockRequestModel = { findOne: jest.fn(), update: jest.fn() };
const mockAccount = { findOne: jest.fn() };
const mockConnection = { findOne: jest.fn() };
const mockPreflight = jest.fn();
const mockValidate = jest.fn();
const mockTransition = jest.fn();
const mockDecrypt = jest.fn();
const mockFindMarker = jest.fn();
const mockCreateCampaign = jest.fn();
const mockCreateAdSet = jest.fn();
const mockCreateAd = jest.fn();
const mockAudit = jest.fn();
const mockAssertCanCreate = jest.fn();
const mockTransaction = jest.fn();

jest.mock("../database", () => ({ __esModule: true, default: { transaction: mockTransaction } }));
jest.mock("../models/MetaCampaignCreationRequest", () => ({ __esModule: true, default: mockRequestModel }));
jest.mock("../models/MetaAdAccount", () => ({ __esModule: true, default: mockAccount }));
jest.mock("../models/MetaMarketingConnection", () => ({ __esModule: true, default: mockConnection }));
jest.mock("../helpers/metaMarketingCrypto", () => ({ decryptMetaMarketingSecret: mockDecrypt }));
jest.mock("../services/MetaMarketingServices/MetaMarketingCampaignPilotService", () => ({
  validateMetaMarketingPilotTemplate: mockValidate,
  preflightMetaMarketingCampaignPilot: mockPreflight
}));
jest.mock("../services/MetaMarketingServices/MetaMarketingCampaignCreationRequestService", () => ({
  transitionMetaMarketingCampaignCreationRequest: mockTransition
}));
jest.mock("../services/MetaMarketingServices/MetaMarketingOAuthService", () => ({
  createMetaMarketingAuditLog: mockAudit,
  assertCanCreateMetaMarketingCampaign: mockAssertCanCreate
}));
jest.mock("../services/MetaMarketingServices/MetaMarketingGraphClient", () => ({
  // The executor owns leases and state transitions; HTTP acceptance is exercised
  // without this mock in MetaMarketingContractValidation.spec.ts.
  MetaMarketingGraphError: class mockMetaMarketingGraphError extends Error {},
  findMetaMarketingObjectByMarker: mockFindMarker,
  createMetaMarketingPausedCampaign: mockCreateCampaign,
  createMetaMarketingPausedAdSet: mockCreateAdSet,
  createMetaMarketingPausedAd: mockCreateAd
}));
jest.mock("../errors/AppError", () => ({ __esModule: true, default: class mockAppError extends Error {} }));

const { executeMetaMarketingCampaignCreationRequest } = require("../services/MetaMarketingServices/MetaMarketingCampaignCreationExecutorService");

describe("Meta Marketing campaign creation executor", () => {
  const template = {
    templateVersion: "meta-pilot-v1", campaignName: "Campaign", adSetName: "Set", adName: "Ad", objective: "OUTCOME_LEADS",
    dailyBudgetMinor: "1000", pageId: "1", creativeId: "3", pixelId: "2", specialAdCategories: ["NONE"],
    conversionLocation: "WEBSITE", conversionEvent: "LEAD", targeting: { countries: ["BR"], ageMin: 18, ageMax: 65 },
    placements: { publisherPlatforms: ["facebook"] }
  };
  const request = () => ({
    id: "request-1", companyId: 1, requestedByUserId: 2, adAccountId: 10, payload: template, status: "requested",
    idempotencyMarker: "kes-mm-key", externalCampaignId: null, externalAdSetId: null, externalAdId: null, errorCode: null
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation(async callback => callback({ id: "tx" }));
    mockAudit.mockResolvedValue(undefined);
    mockAssertCanCreate.mockResolvedValue(undefined);
    mockRequestModel.update.mockResolvedValue([1]);
    mockAccount.findOne.mockResolvedValue({ id: 10, connectionId: 20, externalAccountId: "act_123" });
    mockConnection.findOne.mockResolvedValue({ accessTokenCiphertext: "cipher", update: jest.fn() });
    mockDecrypt.mockReturnValue("token");
    mockValidate.mockReturnValue(template);
    mockPreflight.mockResolvedValue(undefined);
    mockFindMarker.mockResolvedValue(null);
    mockCreateCampaign.mockResolvedValue("101");
    mockCreateAdSet.mockResolvedValue("102");
    mockCreateAd.mockResolvedValue("103");
    mockTransition.mockImplementation(async input => {
      input.request.status = input.toStatus;
      return input.request;
    });
  });

  it("creates campaign, ad set and ad paused only after claiming a lease, saving each external id", async () => {
    const creationRequest = request();
    mockRequestModel.findOne.mockResolvedValue(creationRequest);
    await expect(executeMetaMarketingCampaignCreationRequest({ companyId: 1, requestId: "request-1" })).resolves.toMatchObject({
      status: "completed", externalCampaignId: "101", externalAdSetId: "102", externalAdId: "103"
    });
    expect(mockCreateCampaign).toHaveBeenCalledWith(expect.objectContaining({ externalAccountId: "act_123", specialAdCategories: ["NONE"] }));
    expect(mockCreateAdSet).toHaveBeenCalledWith(expect.objectContaining({ campaignId: "101", pageId: "1", pixelId: "2" }));
    expect(mockCreateAd).toHaveBeenCalledWith(expect.objectContaining({ adSetId: "102", creativeId: "3" }));
    expect(mockRequestModel.update).toHaveBeenCalledWith(expect.objectContaining({ executionLeaseToken: expect.any(String) }), expect.anything());
    expect(mockRequestModel.update).toHaveBeenCalledWith(expect.objectContaining({ externalCampaignId: "101" }), expect.anything());
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ metaRequestId: "101" }));
  });

  it("does not call Meta when another executor owns the non-expired lease", async () => {
    mockRequestModel.findOne.mockResolvedValue(request());
    mockRequestModel.update.mockResolvedValueOnce([0]);
    await expect(executeMetaMarketingCampaignCreationRequest({ companyId: 1, requestId: "request-1" })).rejects.toThrow("META_MARKETING_CREATION_IN_PROGRESS");
    expect(mockPreflight).not.toHaveBeenCalled();
    expect(mockCreateCampaign).not.toHaveBeenCalled();
  });

  it("checks the current actor before returning a completed request", async () => {
    const completedRequest = request();
    completedRequest.status = "completed";
    mockRequestModel.findOne.mockResolvedValue(completedRequest);
    await expect(executeMetaMarketingCampaignCreationRequest({ companyId: 1, requestId: "request-1", actorUserId: 9 })).resolves.toBe(completedRequest);
    expect(mockAssertCanCreate).toHaveBeenCalledWith(1, 9);
    expect(mockCreateCampaign).not.toHaveBeenCalled();
  });

  it("reconciles all existing paused objects by marker without a new POST", async () => {
    const creationRequest = request();
    creationRequest.status = "unknown";
    mockRequestModel.findOne.mockResolvedValue(creationRequest);
    mockFindMarker.mockResolvedValueOnce("101").mockResolvedValueOnce("102").mockResolvedValueOnce("103");
    await expect(executeMetaMarketingCampaignCreationRequest({ companyId: 1, requestId: "request-1" })).resolves.toMatchObject({ status: "completed" });
    expect(mockCreateCampaign).not.toHaveBeenCalled();
    expect(mockCreateAdSet).not.toHaveBeenCalled();
    expect(mockCreateAd).not.toHaveBeenCalled();
  });

  it("marks a timed-out write as unknown and reconciles its marker without duplicating the campaign", async () => {
    const creationRequest = request();
    mockRequestModel.findOne.mockResolvedValue(creationRequest);
    mockFindMarker
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("101")
      .mockResolvedValueOnce(null);
    mockCreateCampaign.mockImplementationOnce(async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      throw new Error("timeout");
    });

    await expect(executeMetaMarketingCampaignCreationRequest({ companyId: 1, requestId: "request-1" })).rejects.toThrow("timeout");
    expect(creationRequest.status).toBe("unknown");

    await expect(executeMetaMarketingCampaignCreationRequest({ companyId: 1, requestId: "request-1" })).resolves.toMatchObject({
      status: "completed", externalCampaignId: "101", externalAdSetId: "102", externalAdId: "103"
    });
    expect(mockCreateCampaign).toHaveBeenCalledTimes(1);
    expect(mockCreateAdSet).toHaveBeenCalledTimes(1);
    expect(mockCreateAd).toHaveBeenCalledTimes(1);
  });
});
