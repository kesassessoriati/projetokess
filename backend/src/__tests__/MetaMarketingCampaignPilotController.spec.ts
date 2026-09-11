const mockPreflight = jest.fn();
const mockRequest = jest.fn();
const mockShowRequest = jest.fn();
const mockExecute = jest.fn();

jest.mock("../services/MetaMarketingServices/MetaMarketingCampaignPilotService", () => ({ preflightMetaMarketingCampaignPilot: mockPreflight }));
jest.mock("../services/MetaMarketingServices/MetaMarketingCampaignCreationRequestService", () => ({
  requestMetaMarketingCampaignPilot: mockRequest,
  showMetaMarketingCampaignCreationRequest: mockShowRequest
}));
jest.mock("../services/MetaMarketingServices/MetaMarketingCampaignCreationExecutorService", () => ({ executeMetaMarketingCampaignCreationRequest: mockExecute }));
jest.mock("../errors/AppError", () => ({ __esModule: true, default: class mockAppError extends Error {} }));

const { preflight } = require("../controllers/MetaMarketingCampaignPilotController");

describe("Meta Marketing campaign pilot controller", () => {
  it("takes Company only from the authenticated JWT payload", async () => {
    const res = { json: jest.fn() };
    mockPreflight.mockResolvedValue({ adAccountId: 10 });
    await preflight({ user: { id: 2, companyId: 7 }, body: { adAccountId: 10, companyId: 999, template: { templateVersion: "meta-pilot-v1" } } }, res);
    expect(mockPreflight).toHaveBeenCalledWith(expect.objectContaining({ companyId: 7, userId: 2, adAccountId: 10 }));
  });
});

describe("Meta Marketing campaign pilot execution controller", () => {
  it("executes only with Company and actor user from JWT", async () => {
    const res = { json: jest.fn() };
    mockExecute.mockResolvedValue({ id: "request-1", status: "completed", idempotencyMarker: "kes-mm-key" });
    await require("../controllers/MetaMarketingCampaignPilotController").execute({
      user: { id: 2, companyId: 7 }, params: { requestId: "request-1" }, body: { companyId: 999, actorUserId: 999 }
    }, res);
    expect(mockExecute).toHaveBeenCalledWith({ companyId: 7, requestId: "request-1", actorUserId: 2 });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: "request-1", status: "completed" }));
  });
});

describe("Meta Marketing campaign pilot request controller", () => {
  it("takes Company from JWT and the idempotency key only from the request header", async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockRequest.mockResolvedValue({ request: { id: "request-1", status: "requested", idempotencyMarker: "kes-mm-key" }, created: true });
    await require("../controllers/MetaMarketingCampaignPilotController").request({
      user: { id: 2, companyId: 7 },
      body: { adAccountId: 10, companyId: 999, idempotencyKey: "body-key", template: { templateVersion: "meta-pilot-v1" } },
      get: jest.fn().mockReturnValue("86a7b5c2-1cbf-4b4c-84cb-6a978132a1ef")
    }, res);
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 7, userId: 2, adAccountId: 10, idempotencyKey: "86a7b5c2-1cbf-4b4c-84cb-6a978132a1ef"
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
