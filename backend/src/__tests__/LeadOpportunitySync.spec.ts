/**
 * Fase B — Sincronização central Lead ← Opportunity.
 *
 * Opportunity OPEN ativa é fonte da verdade para pipelineId/stageId/status do
 * funil; CrmLead recebe cache derivado. Este spec valida resolução segura do
 * lead, vínculo, mapeamento de status e preservação dos dados comerciais.
 */

jest.mock("../models/Opportunity", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock("../models/CrmLead", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock("../models/Contact", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock("../models/Ticket", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock("../models/PipelineStage", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));
jest.mock("../libs/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) }))
}));
jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import CrmLead from "../models/CrmLead";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import PipelineStage from "../models/PipelineStage";
import logger from "../utils/logger";
import SyncLeadFromOpportunityService from "../services/CrmSyncService/SyncLeadFromOpportunityService";

const mockedLead = CrmLead as any;
const mockedContact = Contact as any;
const mockedTicket = Ticket as any;
const mockedStage = PipelineStage as any;

const buildLead = (overrides: any = {}) => ({
  id: 9,
  companyId: 1,
  contactId: 5,
  pipelineId: null,
  stageId: null,
  primaryTicketId: null,
  status: "novo",
  leadStatus: "novo",
  name: "TEC CODE TI",
  phone: "5511988887777",
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const buildOpportunity = (overrides: any = {}) => ({
  id: 100,
  companyId: 1,
  pipelineId: 10,
  stageId: 55,
  contactId: 5,
  ticketId: null,
  leadId: 9,
  status: "OPEN",
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe("SyncLeadFromOpportunityService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStage.findOne.mockResolvedValue({ id: 55, linkedStatus: null });
    mockedTicket.findOne.mockResolvedValue(null);
    mockedContact.findOne.mockResolvedValue(null);
  });

  it("1. sincroniza pipelineId/stageId do lead a partir da opportunity", async () => {
    const lead = buildLead();
    mockedLead.findOne.mockResolvedValue(lead);
    const opportunity = buildOpportunity();

    const result = await SyncLeadFromOpportunityService({
      opportunity: opportunity as any,
      companyId: 1
    });

    expect(result.lead).toBe(lead);
    expect(lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ pipelineId: 10, stageId: 55 }),
      expect.anything()
    );
  });

  it("2. aplica linkedStatus da etapa quando não é fechamento", async () => {
    const lead = buildLead();
    mockedLead.findOne.mockResolvedValue(lead);
    mockedStage.findOne.mockResolvedValue({ id: 55, linkedStatus: "qualificado" });

    const result = await SyncLeadFromOpportunityService({
      opportunity: buildOpportunity() as any,
      companyId: 1
    });

    expect(result.appliedStatus).toBe("qualificado");
    expect(lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "qualificado", leadStatus: "qualificado" }),
      expect.anything()
    );
  });

  it("3. closingStatus WON marca convertido com datas comerciais", async () => {
    const lead = buildLead();
    mockedLead.findOne.mockResolvedValue(lead);

    const result = await SyncLeadFromOpportunityService({
      opportunity: buildOpportunity() as any,
      companyId: 1,
      closingStatus: "WON"
    });

    expect(result.appliedStatus).toBe("convertido");
    const updateArg = lead.update.mock.calls[0][0];
    expect(updateArg.status).toBe("convertido");
    expect(updateArg.leadStatus).toBe("convertido");
    expect(updateArg.clientSince).toBeInstanceOf(Date);
    expect(updateArg.acquisitionDate).toBeInstanceOf(Date);
  });

  it("4. closingStatus LOST marca perdido sem datas de cliente", async () => {
    const lead = buildLead();
    mockedLead.findOne.mockResolvedValue(lead);

    const result = await SyncLeadFromOpportunityService({
      opportunity: buildOpportunity() as any,
      companyId: 1,
      closingStatus: "LOST"
    });

    expect(result.appliedStatus).toBe("perdido");
    const updateArg = lead.update.mock.calls[0][0];
    expect(updateArg.status).toBe("perdido");
    expect(updateArg.clientSince).toBeUndefined();
  });

  it("5. opportunity sem leadId resolve por contactId e VINCULA a opportunity", async () => {
    const lead = buildLead({ contactId: 5 });
    // resolveLead: primeiro findOne por contactId
    mockedLead.findOne.mockResolvedValue(lead);
    const opportunity = buildOpportunity({ leadId: null });

    const result = await SyncLeadFromOpportunityService({
      opportunity: opportunity as any,
      companyId: 1
    });

    expect(result.lead).toBe(lead);
    expect(result.linked).toBe(true);
    expect(opportunity.update).toHaveBeenCalledWith(
      { leadId: 9 },
      expect.anything()
    );
  });

  it("6. sem identidade suficiente não cria vínculo errado (retorna null e loga)", async () => {
    mockedLead.findOne.mockResolvedValue(null);
    const opportunity = buildOpportunity({ leadId: null, contactId: null, ticketId: null });

    const result = await SyncLeadFromOpportunityService({
      opportunity: opportunity as any,
      companyId: 1
    });

    expect(result.lead).toBeNull();
    expect(result.linked).toBe(false);
    expect(opportunity.update).not.toHaveBeenCalled();
    expect((logger as any).warn).toHaveBeenCalled();
  });

  it("6b. lead com contato divergente NÃO é vinculado (guard de identidade)", async () => {
    const lead = buildLead({ contactId: 777 }); // pessoa diferente
    mockedLead.findOne.mockResolvedValue(lead);
    const opportunity = buildOpportunity({ leadId: null, contactId: 5 });

    const result = await SyncLeadFromOpportunityService({
      opportunity: opportunity as any,
      companyId: 1
    });

    expect(result.lead).toBeNull();
    expect(opportunity.update).not.toHaveBeenCalled();
    expect(lead.update).not.toHaveBeenCalled();
  });

  it("7. preserva dados comerciais do lead (só escreve campos de sincronização)", async () => {
    const lead = buildLead();
    mockedLead.findOne.mockResolvedValue(lead);

    await SyncLeadFromOpportunityService({
      opportunity: buildOpportunity() as any,
      companyId: 1,
      closingStatus: "WON"
    });

    const allowedKeys = [
      "pipelineId",
      "stageId",
      "contactId",
      "primaryTicketId",
      "status",
      "leadStatus",
      "clientSince",
      "acquisitionDate",
      "lastActivityAt"
    ];
    const updateArg = lead.update.mock.calls[0][0];
    Object.keys(updateArg).forEach(key => {
      expect(allowedKeys).toContain(key);
    });
    expect(updateArg.name).toBeUndefined();
    expect(updateArg.phone).toBeUndefined();
  });

  it("companyId divergente da opportunity não sincroniza nada", async () => {
    const result = await SyncLeadFromOpportunityService({
      opportunity: buildOpportunity({ companyId: 2 }) as any,
      companyId: 1
    });

    expect(result.lead).toBeNull();
    expect(mockedLead.findOne).not.toHaveBeenCalled();
  });
});
