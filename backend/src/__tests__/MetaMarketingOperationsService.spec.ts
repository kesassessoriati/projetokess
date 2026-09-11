const mockRuns = { findAll: jest.fn(), findOne: jest.fn() };
const mockAssertCanView = jest.fn();
const mockQueueStatus = jest.fn();

jest.mock("../models/MetaSyncRun", () => ({ __esModule: true, default: mockRuns }));
jest.mock("../services/MetaMarketingServices/MetaMarketingOAuthService", () => ({ assertCanViewMetaMarketingOperations: mockAssertCanView }));
jest.mock("../services/MetaMarketingServices/MetaMarketingSyncQueue", () => ({ getMetaMarketingSyncQueueStatus: mockQueueStatus }));

const { getMetaMarketingOperations } = require("../services/MetaMarketingServices/MetaMarketingOperationsService");

describe("Meta Marketing operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssertCanView.mockResolvedValue(undefined);
    mockQueueStatus.mockResolvedValue({ configured: true, workerHealthy: true, workerHeartbeatAt: "2026-09-09T12:00:00.000Z" });
    mockRuns.findAll.mockResolvedValue([
      { toJSON: () => ({ id: 3, status: "failed", attempt: 3, errorCode: "META_MARKETING_RATE_LIMITED" }) },
      { toJSON: () => ({ id: 2, status: "running", attempt: 1 }) },
      { toJSON: () => ({ id: 1, status: "completed", attempt: 1 }) }
    ]);
    mockRuns.findOne.mockResolvedValue({ finishedAt: new Date(Date.now() - 30000) });
  });

  it("returns only the authenticated Company runs and queue health", async () => {
    const result = await getMetaMarketingOperations({ companyId: 7, userId: 2 });

    expect(mockAssertCanView).toHaveBeenCalledWith(7, 2);
    expect(mockRuns.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 7 }, limit: 20 }));
    expect(mockRuns.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 7, status: "completed" } }));
    expect(result).toMatchObject({ queue: { configured: true, workerHealthy: true }, recentJobs: { recent: 3, failed: 1, running: 1, highestAttempt: 3 } });
    expect((result as any).lastSyncAgeSeconds).toBeGreaterThanOrEqual(30);
  });

  it("does not query operational data when the Company allowlist denies access", async () => {
    mockAssertCanView.mockRejectedValue(new Error("META_MARKETING_CONNECTION_FORBIDDEN"));

    await expect(getMetaMarketingOperations({ companyId: 7, userId: 2 })).rejects.toThrow("META_MARKETING_CONNECTION_FORBIDDEN");
    expect(mockRuns.findAll).not.toHaveBeenCalled();
  });

  it("keeps diagnostics available when reading is disabled, because it never calls Meta", async () => {
    await expect(getMetaMarketingOperations({ companyId: 7, userId: 2 })).resolves.toHaveProperty("queue.workerHealthy", true);
    expect(mockAssertCanView).toHaveBeenCalledWith(7, 2);
  });
});
