const mockContactFindOne = jest.fn();
const mockContactFindOrCreate = jest.fn();
const mockCrmLeadFindOne = jest.fn();
const mockCrmLeadUpdate = jest.fn();
const mockOpportunityFindAll = jest.fn();
const mockOpportunityCreate = jest.fn();
const mockOpportunityEventCreate = jest.fn();
const mockPipelineStageFindOne = jest.fn();
const mockEventBusPublish = jest.fn();
const mockSocketEmit = jest.fn();

jest.mock("../models/Contact", () => ({
  __esModule: true,
  default: { findOne: mockContactFindOne, findOrCreate: mockContactFindOrCreate }
}));

jest.mock("../models/CrmLead", () => ({
  __esModule: true,
  default: { findOne: mockCrmLeadFindOne, update: mockCrmLeadUpdate }
}));

jest.mock("../models/Ticket", () => ({
  __esModule: true,
  default: { findOne: jest.fn().mockResolvedValue(null) }
}));

jest.mock("../models/Opportunity", () => ({
  __esModule: true,
  default: { findAll: mockOpportunityFindAll, create: mockOpportunityCreate }
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

jest.mock("../services/FlowBuilderService/FlowTriggerDispatchService", () => ({
  dispatchFlowTrigger: jest.fn(() => Promise.resolve())
}));

jest.mock("../services/CrmLeadService/helpers/findOrCreateLeadByContact", () => ({
  __esModule: true,
  default: jest.fn(async ({ contact }: any) => ({
    id: 500,
    companyId: 1,
    contactId: contact.id,
    phone: contact.number
  }))
}));

jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

import CreateOpportunityService from "../services/OpportunityServices/CreateOpportunityService";
import FindOrMergeOpportunityInPipelineService from "../services/OpportunityServices/FindOrMergeOpportunityInPipelineService";

const buildOpportunity = (overrides: Record<string, any> = {}) => {
  const opportunity: any = {
    id: 10,
    companyId: 1,
    pipelineId: 20,
    stageId: 76,
    contactId: 100,
    ticketId: null,
    leadId: 500,
    title: "William",
    value: 0,
    assignedUserId: 5,
    status: "OPEN",
    version: 1,
    createdAt: new Date("2026-06-26T10:00:00.000Z"),
    updatedAt: new Date("2026-06-26T10:00:00.000Z"),
    update: jest.fn(async (data: Record<string, any>) => {
      Object.assign(opportunity, data);
      return opportunity;
    }),
    reload: jest.fn(async () => opportunity),
    ...overrides
  };

  return opportunity;
};

describe("Kanban opportunity deduplication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPipelineStageFindOne.mockResolvedValue({ id: 75, pipelineId: 20, companyId: 1 });
    mockContactFindOne.mockResolvedValue({
      id: 100,
      companyId: 1,
      number: "5511999999999",
      name: "William",
      email: ""
    });
    mockContactFindOrCreate.mockResolvedValue([
      { id: 100, companyId: 1, number: "5511999999999", name: "William", email: "" },
      false
    ]);
    mockCrmLeadFindOne.mockResolvedValue(null);
    mockCrmLeadUpdate.mockResolvedValue([1]);
    mockOpportunityEventCreate.mockResolvedValue({});
    mockEventBusPublish.mockResolvedValue(undefined);
    mockOpportunityCreate.mockImplementation(async payload => buildOpportunity({ id: 99, ...payload }));
  });

  it("creates opportunity with valid phone by resolving contact identity", async () => {
    mockContactFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockOpportunityFindAll.mockResolvedValue([]);

    const result = await CreateOpportunityService({
      companyId: 1,
      pipelineId: 20,
      stageId: 75,
      phone: "(11) 99999-9999",
      title: "William"
    } as any);

    expect(mockContactFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 1, number: "5511999999999" }
      })
    );
    expect(mockOpportunityCreate).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: 100, pipelineId: 20, stageId: 75 })
    );
    expect(result.contactId).toBe(100);
  });

  it("blocks opportunity without phone or contact", async () => {
    mockContactFindOne.mockResolvedValue(null);
    mockCrmLeadFindOne.mockResolvedValue(null);

    await expect(
      CreateOpportunityService({
        companyId: 1,
        pipelineId: 20,
        stageId: 75,
        title: "Sem contato"
      } as any)
    ).rejects.toMatchObject({
      message: "Não é permitido criar card no funil sem telefone/contato válido."
    });
    expect(mockOpportunityCreate).not.toHaveBeenCalled();
  });

  it("returns the oldest card in the same pipeline without changing its stage", async () => {
    const oldest = buildOpportunity({ id: 1, stageId: 76, createdAt: new Date("2026-01-01") });
    const newest = buildOpportunity({ id: 2, stageId: 75, createdAt: new Date("2026-01-02") });
    mockOpportunityFindAll.mockResolvedValue([oldest, newest]);

    const result = await FindOrMergeOpportunityInPipelineService({
      companyId: 1,
      pipelineId: 20,
      stageId: 75,
      contactId: 100,
      leadId: 500,
      title: "William duplicado"
    });

    expect(result).toBe(oldest);
    expect(oldest.stageId).toBe(76);
    expect(newest.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "LOST", lastMovedBy: "DEDUPE" })
    );
  });

  it("allows the same lead in a different pipeline", async () => {
    mockPipelineStageFindOne.mockResolvedValue({ id: 88, pipelineId: 21, companyId: 1 });
    mockContactFindOne.mockReset();
    mockContactFindOne.mockResolvedValue({
      id: 100,
      companyId: 1,
      number: "5511999999999",
      name: "William",
      email: ""
    });
    mockCrmLeadFindOne.mockResolvedValue({
      id: 500,
      companyId: 1,
      contactId: 100,
      phone: "5511999999999"
    });
    mockOpportunityFindAll.mockResolvedValue([]);

    await CreateOpportunityService({
      companyId: 1,
      pipelineId: 21,
      stageId: 88,
      contactId: 100,
      leadId: 500,
      title: "Outro funil"
    } as any);

    expect(mockOpportunityCreate).toHaveBeenCalledWith(
      expect.objectContaining({ pipelineId: 21, contactId: 100, leadId: 500 })
    );
  });
});
