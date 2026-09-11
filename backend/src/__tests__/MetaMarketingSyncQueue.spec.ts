const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  eval: jest.fn()
};
const mockQueue = { add: jest.fn(), process: jest.fn(), on: jest.fn() };
const mockSequelize = { transaction: jest.fn() };
const mockMetaAdAccount = { findOne: jest.fn(), findAll: jest.fn(), update: jest.fn() };
const mockCompaniesSettings = { findOne: jest.fn() };
const mockMetaMarketingConnection = { findOne: jest.fn() };
const mockMetaAdCampaign = { findOne: jest.fn(), create: jest.fn() };
const mockMetaCampaignDailyMetric = { findOne: jest.fn(), create: jest.fn(), update: jest.fn() };
const mockMetaSyncRun = { create: jest.fn(), update: jest.fn() };
const mockListInsights = jest.fn();
const mockDecrypt = jest.fn();
const mockLogger = { warn: jest.fn(), error: jest.fn() };

class mockMetaMarketingGraphError extends Error {
  kind: string;

  constructor(kind: string) {
    super(kind === "rate_limit" ? "META_MARKETING_RATE_LIMITED" : "META_MARKETING_REAUTHORIZATION_REQUIRED");
    this.kind = kind;
  }
}

jest.mock("bull", () => ({ __esModule: true, default: jest.fn(() => mockQueue) }));
jest.mock("sequelize", () => ({ Op: { lt: "lt", between: "between", notIn: "notIn" } }));
jest.mock("../libs/cache", () => ({ __esModule: true, default: { getRedisInstance: () => mockRedis } }));
jest.mock("../database", () => ({ __esModule: true, default: mockSequelize }));
jest.mock("../errors/AppError", () => ({ __esModule: true, default: class mockAppError extends Error {} }));
jest.mock("../utils/logger", () => ({ __esModule: true, default: mockLogger }));
jest.mock("../models/MetaAdAccount", () => ({ __esModule: true, default: mockMetaAdAccount }));
jest.mock("../models/CompaniesSettings", () => ({ __esModule: true, default: mockCompaniesSettings }));
jest.mock("../models/MetaMarketingConnection", () => ({ __esModule: true, default: mockMetaMarketingConnection }));
jest.mock("../models/MetaAdCampaign", () => ({ __esModule: true, default: mockMetaAdCampaign }));
jest.mock("../models/MetaCampaignDailyMetric", () => ({ __esModule: true, default: mockMetaCampaignDailyMetric }));
jest.mock("../models/MetaSyncRun", () => ({ __esModule: true, default: mockMetaSyncRun }));
jest.mock("../helpers/metaMarketingCrypto", () => ({ decryptMetaMarketingSecret: mockDecrypt }));
jest.mock("../services/MetaMarketingServices/MetaMarketingGraphClient", () => ({
  MetaMarketingGraphError: mockMetaMarketingGraphError,
  listMetaMarketingCampaignInsights: mockListInsights
}));

process.env.REDIS_URI = "redis://test";

const { getMetaMarketingSyncPeriod, getMetaMarketingSyncQueueStatus, processMetaMarketingSyncJob } = require("../services/MetaMarketingServices/MetaMarketingSyncQueue");

const job = (periodStart = "2026-09-01", periodEnd = "2026-09-07") => ({
  id: `${periodStart}:${periodEnd}`,
  attemptsMade: 0,
  data: { companyId: 1, adAccountId: 10, periodStart, periodEnd }
});

describe("Meta Marketing sync queue", () => {
  const connection = { scopes: ["ads_read"], accessTokenCiphertext: "ciphertext", update: jest.fn() };
  const account = {
    id: 10, companyId: 1, connectionId: 20, crmClientId: null,
    externalAccountId: "act_123", currency: "BRL", timezone: "America/Sao_Paulo"
  };
  const insight = {
    campaign_id: "campaign-1", campaign_name: "Campanha", date_start: "2026-09-02",
    spend: "12.345678", ctr: "1.2", cpc: "0.33", cpm: "5.6",
    impressions: "9007199254740993", reach: "42", clicks: "12",
    actions: [{ action_type: "lead", value: "3" }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.META_MARKETING_ATTRIBUTION_WINDOW = "7d_click";
    process.env.META_MARKETING_RESULT_ACTION_TYPE = "lead";
    mockRedis.set.mockResolvedValue("OK");
    mockRedis.get.mockResolvedValue(String(Date.now()));
    mockRedis.eval.mockResolvedValue(1);
    mockSequelize.transaction.mockImplementation(async callback => callback({}));
    mockMetaAdAccount.findOne.mockResolvedValue(account);
    mockCompaniesSettings.findOne.mockResolvedValue({ metaMarketingReadEnabled: true });
    mockMetaMarketingConnection.findOne.mockResolvedValue(connection);
    mockMetaSyncRun.create.mockResolvedValue({ update: jest.fn() });
    mockMetaCampaignDailyMetric.update.mockResolvedValue([0]);
    mockDecrypt.mockReturnValue("decrypted-token");
    mockListInsights.mockResolvedValue({ insights: [insight], rateLimitSignals: {}, apiVersion: "v99.0" });
  });

  it("upserts a late conversion without losing decimal or bigint precision", async () => {
    const campaign = { id: 71, update: jest.fn() };
    const metric = { id: 81, update: jest.fn() };
    let storedCampaign: any = null;
    let storedMetric: any = null;
    mockMetaAdCampaign.findOne.mockImplementation(async () => storedCampaign);
    mockMetaAdCampaign.create.mockImplementation(async () => {
      storedCampaign = campaign;
      return campaign;
    });
    mockMetaCampaignDailyMetric.findOne.mockImplementation(async () => storedMetric);
    mockMetaCampaignDailyMetric.create.mockImplementation(async () => {
      storedMetric = metric;
      return metric;
    });

    await processMetaMarketingSyncJob(job());
    mockListInsights.mockResolvedValue({ insights: [{ ...insight, actions: [{ action_type: "lead", value: "4" }] }], rateLimitSignals: {}, apiVersion: "v99.0" });
    await processMetaMarketingSyncJob(job());

    expect(mockMetaAdCampaign.create).toHaveBeenCalledTimes(1);
    expect(mockMetaCampaignDailyMetric.create).toHaveBeenCalledTimes(1);
    expect(metric.update).toHaveBeenCalledWith(expect.objectContaining({
      spend: "12.345678", impressions: "9007199254740993", resultValue: "4"
    }), expect.anything());
  });

  it("does not process overlapping jobs for the same account", async () => {
    let resolveInsights: (value: any) => void;
    const pendingInsights = new Promise(resolve => { resolveInsights = resolve; });
    mockRedis.set.mockResolvedValueOnce("OK").mockResolvedValueOnce(null);
    mockMetaAdCampaign.findOne.mockResolvedValue({ id: 71, update: jest.fn() });
    mockMetaCampaignDailyMetric.findOne.mockResolvedValue({ id: 81, update: jest.fn() });
    mockListInsights.mockReturnValueOnce(pendingInsights);

    const first = processMetaMarketingSyncJob(job("2026-09-01", "2026-09-07"));
    await new Promise(resolve => setImmediate(resolve));
    const second = processMetaMarketingSyncJob(job("2026-09-02", "2026-09-08"));

    expect(mockListInsights).toHaveBeenCalledTimes(1);
    expect(mockRedis.set.mock.calls[0][0]).toBe(mockRedis.set.mock.calls[1][0]);
    resolveInsights!({ insights: [insight], rateLimitSignals: {}, apiVersion: "v99.0" });
    await Promise.all([first, second]);
  });

  it("does not call Meta while the Company read flag is disabled", async () => {
    mockCompaniesSettings.findOne.mockResolvedValue({ metaMarketingReadEnabled: false });

    await expect(processMetaMarketingSyncJob(job())).resolves.toBeUndefined();
    expect(mockListInsights).not.toHaveBeenCalled();
    expect(mockMetaSyncRun.create).not.toHaveBeenCalled();
  });

  it("reports worker health from a Redis heartbeat instead of process-local state", async () => {
    await expect(getMetaMarketingSyncQueueStatus()).resolves.toMatchObject({ configured: true, workerHealthy: true, workerHeartbeatAt: expect.any(String) });

    mockRedis.get.mockResolvedValue(null);
    await expect(getMetaMarketingSyncQueueStatus()).resolves.toMatchObject({ configured: true, workerHealthy: false, workerHeartbeatAt: null });
  });

  it("uses the account timezone to calculate the daily window", () => {
    jest.useFakeTimers("modern").setSystemTime(new Date("2026-09-10T02:30:00.000Z"));
    expect(getMetaMarketingSyncPeriod("America/Sao_Paulo", 7)).toEqual({ periodStart: "2026-09-03", periodEnd: "2026-09-09" });
    jest.useRealTimers();
  });

  it("persists the account timezone with the daily metric", async () => {
    const campaign = { id: 71, update: jest.fn() };
    const createdMetric = { id: 81, update: jest.fn() };
    mockMetaAdCampaign.findOne.mockResolvedValue(campaign);
    mockMetaCampaignDailyMetric.findOne.mockResolvedValue(null);
    mockMetaCampaignDailyMetric.create.mockResolvedValue(createdMetric);

    await processMetaMarketingSyncJob(job());

    expect(mockMetaCampaignDailyMetric.create).toHaveBeenCalledWith(expect.objectContaining({
      timezone: "America/Sao_Paulo", currency: "BRL", statDate: "2026-09-02"
    }), expect.anything());
  });

  it("records a rate limit as a failed run for Bull to retry", async () => {
    const run = { update: jest.fn() };
    mockMetaSyncRun.create.mockResolvedValue(run);
    mockListInsights.mockRejectedValue(new mockMetaMarketingGraphError("rate_limit"));

    await expect(processMetaMarketingSyncJob(job())).rejects.toThrow("META_MARKETING_RATE_LIMITED");
    expect(run.update).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", errorCode: "META_MARKETING_RATE_LIMITED" }));
  });

  it("marks the connection for reauthorization when Meta rejects the token", async () => {
    mockListInsights.mockRejectedValue(new mockMetaMarketingGraphError("reauthorization_required"));

    await expect(processMetaMarketingSyncJob(job())).rejects.toThrow("META_MARKETING_REAUTHORIZATION_REQUIRED");
    expect(connection.update).toHaveBeenCalledWith({ status: "reauthorization_required" });
  });
});
