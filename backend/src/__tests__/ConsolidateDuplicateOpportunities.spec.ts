const mockOpportunityFindAll = jest.fn();
const mockOpportunityEventCreate = jest.fn();
const mockEventBusPublish = jest.fn();

jest.mock("../models/Opportunity", () => ({
  __esModule: true,
  default: { findAll: mockOpportunityFindAll }
}));

jest.mock("../models/OpportunityEvent", () => ({
  __esModule: true,
  default: { create: mockOpportunityEventCreate }
}));

jest.mock("../libs/EventBus", () => ({
  __esModule: true,
  default: { publish: mockEventBusPublish }
}));

jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

import ConsolidateDuplicateOpportunitiesService from "../services/OpportunityServices/ConsolidateDuplicateOpportunitiesService";

const buildOpportunity = (overrides: Record<string, any>) => {
  const opportunity: any = {
    id: 1,
    companyId: 1,
    pipelineId: 20,
    stageId: 75,
    contactId: 100,
    leadId: 500,
    ticketId: null,
    title: "William",
    value: 0,
    assignedUserId: null,
    status: "OPEN",
    version: 1,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    update: jest.fn(async data => {
      Object.assign(opportunity, data);
      return opportunity;
    }),
    reload: jest.fn(async () => opportunity),
    ...overrides
  };
  return opportunity;
};

describe("ConsolidateDuplicateOpportunitiesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpportunityEventCreate.mockResolvedValue({});
    mockEventBusPublish.mockResolvedValue(undefined);
  });

  it("dryRun returns duplicate groups without changing records", async () => {
    const oldest = buildOpportunity({ id: 1 });
    const duplicate = buildOpportunity({ id: 2 });
    mockOpportunityFindAll.mockResolvedValue([oldest, duplicate]);

    const result = await ConsolidateDuplicateOpportunitiesService({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.groups).toEqual([
      expect.objectContaining({
        canonicalOpportunityId: 1,
        duplicateOpportunityIds: [2]
      })
    ]);
    expect(duplicate.update).not.toHaveBeenCalled();
    expect(mockOpportunityEventCreate).not.toHaveBeenCalled();
  });

  it("real execution keeps oldest and closes duplicates", async () => {
    const oldest = buildOpportunity({ id: 1, value: 0 });
    const duplicate = buildOpportunity({ id: 2, value: 300, ticketId: 9 });
    mockOpportunityFindAll.mockResolvedValue([oldest, duplicate]);

    const result = await ConsolidateDuplicateOpportunitiesService({ dryRun: false });

    expect(result.groups[0].canonicalOpportunityId).toBe(1);
    expect(oldest.update).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: 9, value: 300 })
    );
    expect(duplicate.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "LOST", lastMovedBy: "DEDUPE" })
    );
    expect(mockEventBusPublish).toHaveBeenCalled();
  });
});
