const mockContactFindOne = jest.fn();
const mockCrmLeadFindOne = jest.fn();
const mockOpportunityFindOne = jest.fn();
const mockOpportunityEventCreate = jest.fn();
const mockPipelineStageFindOne = jest.fn();
const mockEventBusPublish = jest.fn();
const mockSocketEmit = jest.fn();

jest.mock("../models/Contact", () => ({
  __esModule: true,
  default: { findOne: mockContactFindOne }
}));

jest.mock("../models/CrmLead", () => ({
  __esModule: true,
  default: { findOne: mockCrmLeadFindOne }
}));

jest.mock("../models/Opportunity", () => ({
  __esModule: true,
  default: { findOne: mockOpportunityFindOne }
}));

jest.mock("../models/OpportunityEvent", () => ({
  __esModule: true,
  default: { create: mockOpportunityEventCreate }
}));

jest.mock("../models/PipelineStage", () => ({
  __esModule: true,
  default: { findOne: mockPipelineStageFindOne }
}));

jest.mock("../libs/EventBus", () => ({
  __esModule: true,
  default: { publish: mockEventBusPublish }
}));

jest.mock("../libs/socket", () => ({
  getIO: () => ({
    to: () => ({ emit: mockSocketEmit })
  })
}));

jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

import FindOrMergeOpportunityInPipelineService from "../services/OpportunityServices/FindOrMergeOpportunityInPipelineService";

const buildOpportunity = (overrides: Record<string, any> = {}) => {
  const opportunity: any = {
    id: 10,
    companyId: 1,
    pipelineId: 20,
    stageId: 76,
    contactId: 100,
    ticketId: null,
    leadId: null,
    title: "William",
    value: 0,
    assignedUserId: 5,
    status: "OPEN",
    version: 1,
    updatedAt: new Date("2026-06-26T10:00:00.000Z"),
    update: jest.fn(async (data: Record<string, any>) => {
      Object.assign(opportunity, data);
      return opportunity;
    }),
    ...overrides
  };

  return opportunity;
};

describe("FindOrMergeOpportunityInPipelineService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPipelineStageFindOne.mockResolvedValue({ id: 75, pipelineId: 20, companyId: 1 });
    mockContactFindOne.mockResolvedValue({ id: 100, companyId: 1 });
    mockCrmLeadFindOne.mockResolvedValue(null);
    mockOpportunityEventCreate.mockResolvedValue({});
    mockEventBusPublish.mockResolvedValue(undefined);
  });

  it("returns null when the contact has no card in the target pipeline", async () => {
    mockOpportunityFindOne.mockResolvedValue(null);

    const result = await FindOrMergeOpportunityInPipelineService({
      companyId: 1,
      pipelineId: 20,
      stageId: 75,
      contactId: 100,
      title: "William"
    });

    expect(result).toBeNull();
    expect(mockOpportunityFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 1,
          pipelineId: 20
        })
      })
    );
  });

  it("returns the existing card in the same pipeline without changing its stage", async () => {
    const existing = buildOpportunity({ stageId: 76, value: 100 });
    mockOpportunityFindOne.mockResolvedValue(existing);

    const result = await FindOrMergeOpportunityInPipelineService({
      companyId: 1,
      pipelineId: 20,
      stageId: 75,
      contactId: 100,
      title: "William duplicado",
      value: 200
    });

    expect(result).toBe(existing);
    expect(existing.stageId).toBe(76);
    expect(existing.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ stageId: 75 })
    );
    expect(mockOpportunityEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityId: existing.id,
        metadata: expect.objectContaining({
          origin: "dedupe_same_pipeline",
          preservedStageId: 76,
          attemptedStageId: 75
        })
      })
    );
  });

  it("merges safe opportunity fields without overwriting an advanced stage", async () => {
    const existing = buildOpportunity({
      stageId: 76,
      value: 0,
      assignedUserId: null,
      ticketId: null
    });
    mockOpportunityFindOne.mockResolvedValue(existing);

    await FindOrMergeOpportunityInPipelineService({
      companyId: 1,
      pipelineId: 20,
      stageId: 75,
      contactId: 100,
      ticketId: 300,
      title: "Novo nome",
      value: 250,
      assignedUserId: 8
    });

    expect(existing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: 300,
        value: 250,
        assignedUserId: 8
      })
    );
    expect(existing.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ stageId: 75 })
    );
  });

  it("blocks contactId from another company", async () => {
    mockContactFindOne.mockResolvedValue(null);

    await expect(
      FindOrMergeOpportunityInPipelineService({
        companyId: 1,
        pipelineId: 20,
        stageId: 75,
        contactId: 999,
        title: "Contato externo"
      })
    ).rejects.toMatchObject({
      message: "Contato informado não encontrado para esta empresa."
    });
  });
});
