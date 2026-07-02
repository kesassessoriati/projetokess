/**
 * Fase A — Dedupe em cascata de oportunidades no mesmo funil.
 *
 * Antes: sem contactId o serviço abortava (400), permitindo cards "Sem contato"
 * duplicados. Agora: cascata contactId → leadId → telefone normalizado → título
 * exato (só entre cards sem identidade), sempre em companyId+pipelineId+OPEN,
 * com guard que impede mesclar identidades divergentes.
 */

jest.mock("../models/Opportunity", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));
jest.mock("../models/CrmLead", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), findOne: jest.fn() }
}));
jest.mock("../models/Contact", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));
jest.mock("../models/PipelineStage", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock("../models/OpportunityEvent", () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({}) }
}));
jest.mock("../libs/EventBus", () => ({
  __esModule: true,
  default: { publish: jest.fn().mockResolvedValue(undefined) }
}));
jest.mock("../libs/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) }))
}));
jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));
jest.mock("../services/CrmSyncService/SyncLeadFromOpportunityService", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ lead: null, linked: false, appliedStatus: null })
}));

import SyncLeadFromOpportunityService from "../services/CrmSyncService/SyncLeadFromOpportunityService";
import Opportunity from "../models/Opportunity";
import CrmLead from "../models/CrmLead";
import Contact from "../models/Contact";
import PipelineStage from "../models/PipelineStage";
import FindOrMergeOpportunityInPipelineService from "../services/OpportunityServices/FindOrMergeOpportunityInPipelineService";

const mockedOpportunity = Opportunity as any;
const mockedLead = CrmLead as any;
const mockedContact = Contact as any;
const mockedStage = PipelineStage as any;

const buildCandidate = (overrides: any = {}) => ({
  id: 1,
  companyId: 1,
  pipelineId: 10,
  stageId: 100,
  status: "OPEN",
  contactId: null,
  leadId: null,
  ticketId: null,
  title: "William Teste - Sistema web",
  value: 0,
  score: 0,
  update: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const baseRequest = {
  companyId: 1,
  pipelineId: 10,
  stageId: 100
};

describe("FindOrMergeOpportunityInPipelineService — dedupe em cascata", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStage.findOne.mockResolvedValue({ id: 100, pipelineId: 10, linkedStatus: null });
    mockedLead.findOne.mockResolvedValue(null);
    mockedLead.findAll.mockResolvedValue([]);
    mockedContact.findAll.mockResolvedValue([]);
    mockedOpportunity.findAll.mockResolvedValue([]);
  });

  it("1. sem contactId, com leadId igual → não duplica (retorna canonical)", async () => {
    const candidate = buildCandidate({ leadId: 9 });
    mockedOpportunity.findAll.mockResolvedValue([candidate]);

    const result = await FindOrMergeOpportunityInPipelineService({
      ...baseRequest,
      leadId: 9
    } as any);

    expect(result).toBe(candidate);
    const where = mockedOpportunity.findAll.mock.calls[0][0].where;
    expect(where.companyId).toBe(1);
    expect(where.pipelineId).toBe(10);
    expect(where.status).toBe("OPEN");

    // Bug da auditoria: o caminho de MERGE também precisa sincronizar o lead.
    expect(SyncLeadFromOpportunityService as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ opportunity: candidate, companyId: 1 })
    );
  });

  it("2. sem contactId/leadId, telefone normalizado igual → não duplica", async () => {
    mockedLead.findAll.mockResolvedValue([{ id: 9 }]);
    const candidate = buildCandidate({ leadId: 9 });
    mockedOpportunity.findAll.mockResolvedValue([candidate]);

    const result = await FindOrMergeOpportunityInPipelineService({
      ...baseRequest,
      phone: "5511988887777"
    } as any);

    expect(result).toBe(candidate);
    // buscou leads por variantes do telefone dentro da MESMA empresa
    expect(mockedLead.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 1 })
      })
    );
  });

  it("3. sem identidade nenhuma, título exato no mesmo pipeline → não duplica", async () => {
    const candidate = buildCandidate();
    mockedOpportunity.findAll.mockResolvedValue([candidate]);

    const result = await FindOrMergeOpportunityInPipelineService({
      ...baseRequest,
      title: "William Teste - Sistema web"
    } as any);

    expect(result).toBe(candidate);
    // fallback por título só considera cards SEM identidade
    const where = mockedOpportunity.findAll.mock.calls[0][0].where;
    expect(where.title).toBe("William Teste - Sistema web");
    expect(where.contactId).toBeNull();
    expect(where.leadId).toBeNull();
  });

  it("4. identidade divergente não mescla (contactId diferente)", async () => {
    const candidate = buildCandidate({ leadId: 9, contactId: 777 });
    mockedOpportunity.findAll.mockResolvedValue([candidate]);

    const result = await FindOrMergeOpportunityInPipelineService({
      ...baseRequest,
      leadId: 9,
      contactId: 555
    } as any);

    expect(result).toBeNull(); // não mescla pessoas diferentes → cria novo card
  });

  it("4b. ticket de outro contato não mescla", async () => {
    const candidate = buildCandidate({ leadId: 9, ticketId: 42, contactId: null });
    mockedOpportunity.findAll.mockResolvedValue([candidate]);

    const result = await FindOrMergeOpportunityInPipelineService({
      ...baseRequest,
      leadId: 9,
      ticketId: 43
    } as any);

    expect(result).toBeNull();
  });

  it("5. companyId sempre restringe a busca (multiempresa)", async () => {
    await FindOrMergeOpportunityInPipelineService({
      ...baseRequest,
      companyId: 77,
      contactId: 5
    } as any);

    expect(mockedOpportunity.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 77, status: "OPEN" })
      })
    );
  });

  it("6. pipeline diferente pode ter opportunity separada (busca é por pipelineId)", async () => {
    const result = await FindOrMergeOpportunityInPipelineService({
      ...baseRequest,
      pipelineId: 22,
      contactId: 5
    } as any);

    expect(result).toBeNull();
    expect(mockedOpportunity.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pipelineId: 22 })
      })
    );
  });

  it("7. cards sem contato equivalentes não duplicam; títulos distintos não casam", async () => {
    mockedOpportunity.findAll.mockResolvedValue([]);

    const result = await FindOrMergeOpportunityInPipelineService({
      ...baseRequest,
      title: "Outro título"
    } as any);

    expect(result).toBeNull(); // sem match → cria novo, mas a busca aconteceu
    const where = mockedOpportunity.findAll.mock.calls[0][0].where;
    expect(where.title).toBe("Outro título");
  });

  it("sem identidade e sem título não tenta match nenhum", async () => {
    const result = await FindOrMergeOpportunityInPipelineService({
      ...baseRequest
    } as any);

    expect(result).toBeNull();
    expect(mockedOpportunity.findAll).not.toHaveBeenCalled();
  });
});
