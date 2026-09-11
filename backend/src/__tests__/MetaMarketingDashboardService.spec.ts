const mockMetaAdAccount = { findAll: jest.fn() };
const mockMetaMarketingConnection = { findAll: jest.fn() };
const mockMetaAdCampaign = { findAll: jest.fn() };
const mockMetaCampaignDailyMetric = { findAll: jest.fn() };
const mockCrmClient = { findAll: jest.fn() };
const mockAssertCanManage = jest.fn();

jest.mock("sequelize", () => ({ Op: { in: "in", between: "between" } }));
jest.mock("../models/MetaAdAccount", () => ({ __esModule: true, default: mockMetaAdAccount }));
jest.mock("../models/MetaMarketingConnection", () => ({ __esModule: true, default: mockMetaMarketingConnection }));
jest.mock("../models/MetaAdCampaign", () => ({ __esModule: true, default: mockMetaAdCampaign }));
jest.mock("../models/MetaCampaignDailyMetric", () => ({ __esModule: true, default: mockMetaCampaignDailyMetric }));
jest.mock("../models/CrmClient", () => ({ __esModule: true, default: mockCrmClient }));
jest.mock("../errors/AppError", () => ({ __esModule: true, default: class mockAppError extends Error {} }));
jest.mock("../services/MetaMarketingServices/MetaMarketingOAuthService", () => ({ assertCanManageMetaMarketingConnection: mockAssertCanManage }));

const { getMetaMarketingDashboard } = require("../services/MetaMarketingServices/MetaMarketingDashboardService");

const account = { id: 10, connectionId: 20, crmClientId: 30, toJSON: () => ({ id: 10, name: "Conta", currency: "BRL", timezone: "America/Sao_Paulo" }) };
const campaign = { id: 40, adAccountId: 10, name: "Campanha" };
const metric = {
  id: 50, adAccountId: 10, campaignId: 40, statDate: "2026-09-02",
  spend: "10.25", impressions: "100", clicks: "5", resultValue: "2", reach: "70",
  currency: "BRL", timezone: "America/Sao_Paulo", attributionWindow: "7d_click", resultActionType: "lead",
  collectedAt: new Date("2026-09-03T12:00:00.000Z")
};

describe("Meta Marketing dashboard", () => {
  const input = { companyId: 1, userId: 2, periodStart: "2026-09-01", periodEnd: "2026-09-07" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAssertCanManage.mockResolvedValue(undefined);
    mockMetaAdAccount.findAll.mockResolvedValue([account]);
    mockCrmClient.findAll.mockResolvedValue([{ id: 30, name: "Anunciante", companyName: "Anunciante" }]);
    mockMetaMarketingConnection.findAll.mockResolvedValue([{ id: 20, status: "connected" }]);
    mockMetaAdCampaign.findAll.mockResolvedValue([campaign]);
    mockMetaCampaignDailyMetric.findAll.mockResolvedValue([metric]);
  });

  it("scopes every query to the authenticated Company", async () => {
    await getMetaMarketingDashboard(input);

    expect(mockAssertCanManage).toHaveBeenCalledWith(1, 2);
    expect(mockMetaAdAccount.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: 1 }) }));
    expect(mockMetaAdCampaign.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: 1 }) }));
    expect(mockMetaCampaignDailyMetric.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: 1 }) }));
  });

  it("applies advertiser, account and campaign filters without broadening the query", async () => {
    await getMetaMarketingDashboard({ ...input, crmClientId: 30, adAccountId: 10, campaignId: 40 });

    expect(mockMetaAdAccount.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 10, crmClientId: 30 }) }));
    expect(mockMetaAdCampaign.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 40 }) }));
  });

  it("rejects an invalid or oversized dashboard period before querying data", async () => {
    await expect(getMetaMarketingDashboard({ ...input, periodStart: "2026-09-31" })).rejects.toThrow("META_MARKETING_PERIOD_INVALID");
    await expect(getMetaMarketingDashboard({ ...input, periodEnd: "2026-11-01" })).rejects.toThrow("META_MARKETING_PERIOD_INVALID");
    expect(mockMetaAdAccount.findAll).not.toHaveBeenCalled();
  });

  it("does not query data when the Company allowlist denies access", async () => {
    mockAssertCanManage.mockRejectedValue(new Error("META_MARKETING_CONNECTION_FORBIDDEN"));

    await expect(getMetaMarketingDashboard(input)).rejects.toThrow("META_MARKETING_CONNECTION_FORBIDDEN");
    expect(mockMetaAdAccount.findAll).not.toHaveBeenCalled();
  });

  it("separates incompatible monetary and attribution conventions instead of summing them", async () => {
    mockMetaCampaignDailyMetric.findAll.mockResolvedValue([
      metric,
      { ...metric, id: 51, currency: "USD", attributionWindow: "1d_click", resultActionType: "purchase", spend: "4.50" }
    ]);

    const result: any = await getMetaMarketingDashboard(input);
    expect(result.summary).toBeNull();
    expect(result.summaries).toHaveLength(2);
    expect(result.summaries.map((summary: any) => summary.currency)).toEqual(expect.arrayContaining(["BRL", "USD"]));
  });

  it("keeps reach only in the daily series and never emits a summed reach total", async () => {
    const result: any = await getMetaMarketingDashboard(input);

    expect(result.metrics[0].reach).toBe("70");
    expect(result.summary).not.toHaveProperty("reach");
  });
});
