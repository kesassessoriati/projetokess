const mockOperations = jest.fn();

jest.mock("../services/MetaMarketingServices/MetaMarketingOperationsService", () => ({ getMetaMarketingOperations: mockOperations }));
jest.mock("../errors/AppError", () => ({ __esModule: true, default: class mockAppError extends Error {} }));

const { show } = require("../controllers/MetaMarketingOperationsController");

describe("Meta Marketing operations controller", () => {
  it("uses only Company and user from the authenticated JWT", async () => {
    const res = { json: jest.fn() };
    mockOperations.mockResolvedValue({ jobs: { failed: 0 } });

    await show({ user: { id: 2, companyId: 7 }, query: { companyId: "999" } }, res);

    expect(mockOperations).toHaveBeenCalledWith({ companyId: 7, userId: 2 });
    expect(res.json).toHaveBeenCalledWith({ jobs: { failed: 0 } });
  });
});
