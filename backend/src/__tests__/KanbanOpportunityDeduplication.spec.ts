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

// Fase B: a sincronização Lead ← Opportunity é serviço central testado em
// LeadOpportunitySync.spec — aqui isolamos para manter o foco no dedupe.
jest.mock("../services/CrmSyncService/SyncLeadFromOpportunityService", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ lead: null, linked: false, appliedStatus: null })
}));

import CreateOpportunityService from "../services/OpportunityServices/CreateOpportunityService";
import FindOrMergeOpportunityInPipelineService from "../services/OpportunityServices/FindOrMergeOpportunityInPipelineService";
import logger from "../utils/logger";

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
      expect.objectContaining({ contactId: 100, pipelineId: 20, stageId: 75 }),
      expect.anything()
    );
    expect(result.contactId).toBe(100);
  });

  it("creates opportunity without phone/contact but dedupes by exact title (Fase A)", async () => {
    // Comportamento novo: cards sem identidade são permitidos, mas passam pela
    // cascata de dedupe — título exato entre cards sem contactId/leadId não duplica.
    mockContactFindOne.mockResolvedValue(null);
    mockCrmLeadFindOne.mockResolvedValue(null);
    mockOpportunityFindAll.mockResolvedValue([]);

    const result = await CreateOpportunityService({
      companyId: 1,
      pipelineId: 20,
      stageId: 75,
      title: "Sem contato"
    } as any);

    expect(mockOpportunityCreate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sem contato", companyId: 1 }),
      expect.anything()
    );
    // A busca de dedupe por título só considera cards sem identidade
    expect(mockOpportunityFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: "Sem contato",
          contactId: null,
          leadId: null
        })
      })
    );
    expect(result).toBeTruthy();
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
      expect.objectContaining({ status: "LOST", lastMovedBy: "DEDUPE" }),
      expect.anything()
    );
  });

  it("merges useful duplicate data into the oldest card before marking duplicates lost", async () => {
    const oldest = buildOpportunity({
      id: 1,
      pipelineId: 20,
      stageId: 76,
      leadId: null,
      ticketId: null,
      title: "",
      value: 0,
      assignedUserId: null,
      score: 0,
      createdAt: new Date("2026-01-01")
    });
    const duplicateA = buildOpportunity({
      id: 2,
      pipelineId: 20,
      stageId: 75,
      title: "Nome duplicata",
      value: 200,
      assignedUserId: 8,
      score: 60,
      createdAt: new Date("2026-01-02")
    });
    const duplicateB = buildOpportunity({
      id: 3,
      pipelineId: 20,
      stageId: 80,
      leadId: 500,
      ticketId: 77,
      title: "Nao sobrescrever",
      value: 900,
      createdAt: new Date("2026-01-03")
    });
    mockOpportunityFindAll.mockResolvedValue([oldest, duplicateA, duplicateB]);

    const result = await FindOrMergeOpportunityInPipelineService({
      companyId: 1,
      pipelineId: 20,
      stageId: 75,
      contactId: 100,
      title: null
    });

    expect(result).toBe(oldest);
    expect(oldest.pipelineId).toBe(20);
    expect(oldest.stageId).toBe(76);
    expect(oldest.title).toBe("Nome duplicata");
    expect(oldest.value).toBe(200);
    expect(oldest.assignedUserId).toBe(8);
    expect(oldest.score).toBe(60);
    expect(oldest.leadId).toBe(500);
    expect(oldest.ticketId).toBe(77);
    expect(oldest.title).not.toBe("Nao sobrescrever");

    const firstCanonicalMergeOrder = oldest.update.mock.invocationCallOrder[0];
    expect(duplicateA.update.mock.invocationCallOrder[0]).toBeGreaterThan(firstCanonicalMergeOrder);
    expect(duplicateB.update.mock.invocationCallOrder[0]).toBeGreaterThan(firstCanonicalMergeOrder);
    expect(duplicateA.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "LOST", lastMovedBy: "DEDUPE" }),
      expect.anything()
    );
    expect(duplicateB.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "LOST", lastMovedBy: "DEDUPE" }),
      expect.anything()
    );
    expect(mockOpportunityEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityId: 2,
        metadata: expect.objectContaining({
          mergedFields: expect.objectContaining({
            title: expect.any(Object),
            value: expect.any(Object),
            assignedUserId: expect.any(Object),
            score: expect.any(Object)
          })
        })
      }),
      expect.anything()
    );
    expect(logger.info).toHaveBeenCalledWith(
      "[KANBAN_DEDUPE] duplicate data merged into canonical",
      expect.objectContaining({
        companyId: 1,
        pipelineId: 20,
        canonicalOpportunityId: 1,
        duplicateOpportunityId: 2,
        mergedFields: expect.arrayContaining(["title", "value", "assignedUserId", "score"])
      })
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
      expect.objectContaining({ pipelineId: 21, contactId: 100, leadId: 500 }),
      expect.anything()
    );
  });
});
