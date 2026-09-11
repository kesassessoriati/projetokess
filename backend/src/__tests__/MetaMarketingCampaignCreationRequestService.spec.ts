const mockRequestModel = { findOne: jest.fn(), create: jest.fn(), update: jest.fn() };
const mockPreflight = jest.fn();
const mockValidate = jest.fn();
const mockAudit = jest.fn();
const mockAssertCanCreate = jest.fn();
const mockTransaction = jest.fn();

jest.mock("../database", () => ({ __esModule: true, default: { transaction: mockTransaction } }));
jest.mock("../models/MetaCampaignCreationRequest", () => ({ __esModule: true, default: mockRequestModel }));
jest.mock("../services/MetaMarketingServices/MetaMarketingCampaignPilotService", () => ({
  META_MARKETING_PILOT_TEMPLATE_VERSION: "meta-pilot-v1",
  preflightMetaMarketingCampaignPilot: mockPreflight,
  validateMetaMarketingPilotTemplate: mockValidate
}));
jest.mock("../services/MetaMarketingServices/MetaMarketingOAuthService", () => ({
  assertCanCreateMetaMarketingCampaign: mockAssertCanCreate,
  createMetaMarketingAuditLog: mockAudit
}));
jest.mock("../errors/AppError", () => ({ __esModule: true, default: class mockAppError extends Error {} }));

const {
  hashMetaMarketingCampaignRequestPayload,
  requestMetaMarketingCampaignPilot,
  transitionMetaMarketingCampaignCreationRequest
} = require("../services/MetaMarketingServices/MetaMarketingCampaignCreationRequestService");

describe("Meta Marketing campaign creation requests", () => {
  const key = "86a7b5c2-1cbf-4b4c-84cb-6a978132a1ef";
  const template = () => ({
    templateVersion: "meta-pilot-v1", campaignName: "Campanha", adSetName: "Conjunto", adName: "Anúncio",
    objective: "OUTCOME_LEADS", dailyBudgetMinor: "1000", pageId: "1", creativeId: "2", pixelId: "3",
    specialAdCategories: ["NONE"], conversionLocation: "WEBSITE", conversionEvent: "LEAD",
    targeting: { countries: ["BR"], ageMin: 18, ageMax: 65 }, placements: { publisherPlatforms: ["facebook"] }
  });
  const input = () => ({ companyId: 1, userId: 2, adAccountId: 10, idempotencyKey: key, template: template() });
  const existing = { id: "request-1", companyId: 1, payloadHash: "hash", status: "requested", idempotencyMarker: `kes-mm-${key}` };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation(async callback => callback({ id: "tx" }));
    mockAssertCanCreate.mockResolvedValue(undefined);
    mockPreflight.mockResolvedValue(undefined);
    mockValidate.mockImplementation(value => {
      const { ignored, ...normalized } = value;
      return normalized;
    });
    mockAudit.mockResolvedValue(undefined);
  });

  it("hashes semantically identical normalized payloads with a stable field order", () => {
    expect(hashMetaMarketingCampaignRequestPayload({ adAccountId: 10, template: { b: 2, a: 1 } }))
      .toBe(hashMetaMarketingCampaignRequestPayload({ adAccountId: 10, template: { a: 1, b: 2 } }));
  });

  it("returns the original request for the same Company, key and normalized payload without another preflight", async () => {
    const firstInput = input();
    existing.payloadHash = hashMetaMarketingCampaignRequestPayload({ adAccountId: firstInput.adAccountId, template: firstInput.template });
    mockRequestModel.findOne.mockResolvedValue(existing);
    await expect(requestMetaMarketingCampaignPilot({ ...firstInput, userId: 8 })).resolves.toEqual({ request: existing, created: false });
    expect(mockAssertCanCreate).toHaveBeenCalledWith(1, 8);
    expect(mockPreflight).not.toHaveBeenCalled();
    expect(mockRequestModel.create).not.toHaveBeenCalled();
  });

  it("rejects reuse of an idempotency key with another payload", async () => {
    existing.payloadHash = "other-payload";
    mockRequestModel.findOne.mockResolvedValue(existing);
    await expect(requestMetaMarketingCampaignPilot(input())).rejects.toThrow("META_MARKETING_IDEMPOTENCY_CONFLICT");
    expect(mockPreflight).not.toHaveBeenCalled();
  });

  it("checks write permission before exposing an existing request", async () => {
    mockAssertCanCreate.mockRejectedValue(new Error("META_MARKETING_CAMPAIGN_FORBIDDEN"));
    await expect(requestMetaMarketingCampaignPilot(input())).rejects.toThrow("META_MARKETING_CAMPAIGN_FORBIDDEN");
    expect(mockRequestModel.findOne).not.toHaveBeenCalled();
  });

  it("persists only the normalized template and audits atomically with the request", async () => {
    const created = { id: "request-1", status: "requested", idempotencyMarker: `kes-mm-${key}` };
    const requestInput = { ...input(), template: { ...template(), ignored: "never persist" } };
    mockRequestModel.findOne.mockResolvedValue(null);
    mockRequestModel.create.mockResolvedValue(created);
    await expect(requestMetaMarketingCampaignPilot(requestInput)).resolves.toEqual({ request: created, created: true });
    expect(mockPreflight).toHaveBeenCalledWith(requestInput);
    expect(mockRequestModel.create).toHaveBeenCalledWith(expect.objectContaining({ payload: template() }), { transaction: { id: "tx" } });
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 1, actorUserId: 2, action: "meta_campaign_creation_requested", targetRef: "request-1", transaction: { id: "tx" }
    }));
  });

  it("rolls back the request when its audit cannot be written", async () => {
    mockRequestModel.findOne.mockResolvedValue(null);
    mockRequestModel.create.mockResolvedValue({ id: "request-1", status: "requested" });
    mockAudit.mockRejectedValue(new Error("audit failed"));
    await expect(requestMetaMarketingCampaignPilot(input())).rejects.toThrow("audit failed");
  });

  it("resolves a concurrent unique-key race to the original request without a duplicate audit", async () => {
    const requestInput = input();
    existing.payloadHash = hashMetaMarketingCampaignRequestPayload({ adAccountId: requestInput.adAccountId, template: requestInput.template });
    mockRequestModel.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    mockRequestModel.create.mockRejectedValue({ name: "SequelizeUniqueConstraintError" });
    await expect(requestMetaMarketingCampaignPilot(requestInput)).resolves.toEqual({ request: existing, created: false });
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it("uses a conditional update so a stale worker cannot overwrite a newer state", async () => {
    const request = { id: "request-1", companyId: 1, status: "requested", errorCode: null };
    const updatedRequest = { ...request, status: "validating" };
    mockRequestModel.update.mockResolvedValue([1]);
    mockRequestModel.findOne.mockResolvedValue(updatedRequest);
    await expect(transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "validating", actorUserId: 2 })).resolves.toBe(updatedRequest);
    expect(mockRequestModel.update).toHaveBeenCalledWith({ status: "validating", errorCode: null }, expect.objectContaining({
      where: { id: "request-1", companyId: 1, status: "requested" }
    }));
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "meta_campaign_creation_requested_to_validating" }));

    mockRequestModel.update.mockResolvedValue([0]);
    await expect(transitionMetaMarketingCampaignCreationRequest({ request: { ...request, status: "unknown" }, toStatus: "creating_campaign" })).rejects.toThrow("META_MARKETING_CREATION_STATE_TRANSITION_INVALID");
  });

  it("keeps a diagnostic code when the state becomes unknown", async () => {
    const request = { id: "request-1", companyId: 1, status: "validating", errorCode: null };
    mockRequestModel.update.mockResolvedValue([1]);
    mockRequestModel.findOne.mockResolvedValue({ ...request, status: "unknown" });
    await transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "unknown", errorCode: "META_TIMEOUT" });
    expect(mockRequestModel.update).toHaveBeenCalledWith({ status: "unknown", errorCode: "META_TIMEOUT" }, expect.anything());
  });

  it("updates the diagnostic code when a reconciliation fails again while unknown", async () => {
    const request = { id: "request-1", companyId: 1, status: "unknown", errorCode: "OLD" };
    mockRequestModel.update.mockResolvedValue([1]);
    await transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "unknown", errorCode: "NEW" });
    expect(mockRequestModel.update).toHaveBeenCalledWith({ errorCode: "NEW" }, expect.anything());
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "meta_campaign_creation_unknown_to_unknown" }));
  });
});
