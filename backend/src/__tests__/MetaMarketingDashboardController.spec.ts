const mockGetDashboard = jest.fn();

jest.mock("../services/MetaMarketingServices/MetaMarketingDashboardService", () => ({ getMetaMarketingDashboard: mockGetDashboard }));
jest.mock("../errors/AppError", () => ({ __esModule: true, default: class mockAppError extends Error {} }));

const { dashboard } = require("../controllers/MetaMarketingDashboardController");

describe("Meta Marketing dashboard controller", () => {
  it("uses Company exclusively from the authenticated JWT payload", async () => {
    const res = { json: jest.fn() };
    mockGetDashboard.mockResolvedValue({ metrics: [] });

    await dashboard({
      user: { id: 2, companyId: 7 },
      query: { periodStart: "2026-09-01", periodEnd: "2026-09-07", companyId: "999" }
    }, res);

    expect(mockGetDashboard).toHaveBeenCalledWith(expect.objectContaining({ companyId: 7, userId: 2 }));
    expect(res.json).toHaveBeenCalledWith({ metrics: [] });
  });
});
