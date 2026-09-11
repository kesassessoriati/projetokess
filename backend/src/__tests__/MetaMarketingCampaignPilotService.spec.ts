const mockAssertCanCreate = jest.fn();
const mockMetaAdAccount = { findOne: jest.fn() };
const mockMetaMarketingConnection = { findOne: jest.fn() };
const mockDecrypt = jest.fn();
const mockGetControl = jest.fn();

class mockMetaMarketingGraphError extends Error {
  kind: string;
  constructor(kind: string) {
    super("META_MARKETING_REAUTHORIZATION_REQUIRED");
    this.kind = kind;
  }
}

jest.mock("../services/MetaMarketingServices/MetaMarketingOAuthService", () => ({ assertCanCreateMetaMarketingCampaign: mockAssertCanCreate }));
jest.mock("../models/MetaAdAccount", () => ({ __esModule: true, default: mockMetaAdAccount }));
jest.mock("../models/MetaMarketingConnection", () => ({ __esModule: true, default: mockMetaMarketingConnection }));
jest.mock("../helpers/metaMarketingCrypto", () => ({ decryptMetaMarketingSecret: mockDecrypt }));
jest.mock("../services/MetaMarketingServices/MetaMarketingGraphClient", () => ({
  MetaMarketingGraphError: mockMetaMarketingGraphError,
  getMetaMarketingAdAccountControl: mockGetControl
}));
jest.mock("../errors/AppError", () => ({ __esModule: true, default: class mockAppError extends Error {} }));

const {
  META_MARKETING_PILOT_TEMPLATE_VERSION,
  preflightMetaMarketingCampaignPilot,
  validateMetaMarketingPilotTemplate
} = require("../services/MetaMarketingServices/MetaMarketingCampaignPilotService");

describe("Meta Marketing campaign pilot preflight", () => {
  const account = { id: 10, companyId: 1, connectionId: 20, externalAccountId: "act_123", currency: "BRL", permissions: ["ADVERTISE"] };
  const connection = { scopes: ["ads_management"], accessTokenCiphertext: "cipher", update: jest.fn() };
  const template = () => ({
    templateVersion: META_MARKETING_PILOT_TEMPLATE_VERSION, campaignName: "Campanha", adSetName: "Conjunto", adName: "Anúncio",
    objective: "OUTCOME_LEADS", dailyBudgetMinor: "1000", pageId: "1", creativeId: "2", pixelId: "3", specialAdCategories: ["NONE"],
    conversionLocation: "WEBSITE", conversionEvent: "LEAD", targeting: { countries: ["BR"], ageMin: 18, ageMax: 65 }, placements: { publisherPlatforms: ["facebook", "instagram"] }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAssertCanCreate.mockResolvedValue(undefined);
    mockMetaAdAccount.findOne.mockResolvedValue(account);
    mockMetaMarketingConnection.findOne.mockResolvedValue(connection);
    mockDecrypt.mockReturnValue("token");
    mockGetControl.mockResolvedValue({ account_status: 1, amount_spent: "10", currency: "BRL", disable_reason: 0, spend_cap: "10000" });
  });

  it("accepts only the versioned lead template contract", () => {
    expect(() => validateMetaMarketingPilotTemplate(template())).not.toThrow();
    expect(validateMetaMarketingPilotTemplate({ ...template(), ignored: "not persisted" })).not.toHaveProperty("ignored");
    expect(() => validateMetaMarketingPilotTemplate({ templateVersion: "other" })).toThrow("META_MARKETING_PILOT_TEMPLATE_INVALID");
    expect(() => validateMetaMarketingPilotTemplate(undefined)).toThrow("META_MARKETING_PILOT_TEMPLATE_INVALID");
  });

  it("rejects an invalid template before checking authorization or calling Meta", async () => {
    await expect(preflightMetaMarketingCampaignPilot({ companyId: 1, userId: 2, adAccountId: 10, template: { ...template(), dailyBudgetMinor: "0" } })).rejects.toThrow("META_MARKETING_PILOT_TEMPLATE_INVALID");
    expect(mockAssertCanCreate).not.toHaveBeenCalled();
    expect(mockGetControl).not.toHaveBeenCalled();
  });

  it("requires write authorization, tenant account, ads_management and a positive spend cap", async () => {
    await expect(preflightMetaMarketingCampaignPilot({ companyId: 1, userId: 2, adAccountId: 10, template: template() })).resolves.toMatchObject({
      adAccountId: 10, currency: "BRL", spendCap: "10000", remainingSpendCap: "9990", templateVersion: META_MARKETING_PILOT_TEMPLATE_VERSION
    });
    expect(mockAssertCanCreate).toHaveBeenCalledWith(1, 2);
    expect(mockMetaAdAccount.findOne).toHaveBeenCalledWith({ where: { id: 10, companyId: 1, status: "active" } });
  });

  it("blocks creation preflight when Meta has no account spend cap", async () => {
    mockGetControl.mockResolvedValue({ account_status: 1, amount_spent: "10", currency: "BRL", disable_reason: 0, spend_cap: "0" });
    await expect(preflightMetaMarketingCampaignPilot({ companyId: 1, userId: 2, adAccountId: 10, template: template() })).rejects.toThrow("META_MARKETING_SPEND_CAP_REQUIRED");
  });

  it("blocks a budget that exceeds the remaining spend cap before any creation", async () => {
    mockGetControl.mockResolvedValue({ account_status: 1, amount_spent: "9500", currency: "BRL", disable_reason: 0, spend_cap: "10000" });
    await expect(preflightMetaMarketingCampaignPilot({ companyId: 1, userId: 2, adAccountId: 10, template: { ...template(), dailyBudgetMinor: "1000" } })).rejects.toThrow("META_MARKETING_SPEND_CAP_REQUIRED");
  });

  it("blocks the write allowlist, but does not rely on omitted per-account task fields", async () => {
    mockAssertCanCreate.mockRejectedValue(new Error("META_MARKETING_CAMPAIGN_FORBIDDEN"));
    await expect(preflightMetaMarketingCampaignPilot({ companyId: 1, userId: 2, adAccountId: 10, template: template() })).rejects.toThrow("META_MARKETING_CAMPAIGN_FORBIDDEN");
    expect(mockGetControl).not.toHaveBeenCalled();

    mockAssertCanCreate.mockResolvedValue(undefined);
    mockMetaAdAccount.findOne.mockResolvedValue({ ...account, permissions: [] });
    await expect(preflightMetaMarketingCampaignPilot({ companyId: 1, userId: 2, adAccountId: 10, template: template() })).resolves.toMatchObject({ adAccountId: 10 });
    expect(mockGetControl).toHaveBeenCalled();

    mockMetaMarketingConnection.findOne.mockResolvedValue({ ...connection, scopes: [] });
    await expect(preflightMetaMarketingCampaignPilot({ companyId: 1, userId: 2, adAccountId: 10, template: template() })).rejects.toThrow("META_MARKETING_ADS_MANAGEMENT_REQUIRED");
  });

  it("marks the connection for reauthorization when Meta rejects the token", async () => {
    mockGetControl.mockRejectedValue(new mockMetaMarketingGraphError("reauthorization_required"));
    await expect(preflightMetaMarketingCampaignPilot({ companyId: 1, userId: 2, adAccountId: 10, template: template() })).rejects.toThrow("META_MARKETING_REAUTHORIZATION_REQUIRED");
    expect(connection.update).toHaveBeenCalledWith({ status: "reauthorization_required" });
  });

  it("marks the connection for reauthorization when its ciphertext cannot be decrypted", async () => {
    mockDecrypt.mockImplementation(() => { throw new Error("invalid ciphertext"); });
    await expect(preflightMetaMarketingCampaignPilot({ companyId: 1, userId: 2, adAccountId: 10, template: template() })).rejects.toThrow("META_MARKETING_REAUTHORIZATION_REQUIRED");
    expect(mockGetControl).not.toHaveBeenCalled();
    expect(connection.update).toHaveBeenCalledWith({ status: "reauthorization_required" });
  });
});
