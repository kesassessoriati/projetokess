/**
 * Fase C — Fechamento universal GANHO/PERDIDO.
 *
 * CloseOpportunityService centraliza: status na Opportunity, sync do Lead
 * (convertido/perdido), Cliente idempotente no WON (nunca no LOST), eventos e
 * sockets. Também valida o filtro explícito de status na listagem.
 */

const mockEmit = jest.fn();

jest.mock("../models/Opportunity", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), findAll: jest.fn() }
}));
jest.mock("../models/OpportunityEvent", () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue({}) }
}));
jest.mock("../models/Contact", () => ({
  __esModule: true,
  default: { findOne: jest.fn().mockResolvedValue(null) }
}));
jest.mock("../models/PipelineStage", () => ({ __esModule: true, default: {} }));
jest.mock("../models/User", () => ({ __esModule: true, default: {} }));
jest.mock("../models/CrmLead", () => ({ __esModule: true, default: {} }));
jest.mock("../libs/EventBus", () => ({
  __esModule: true,
  default: { publish: jest.fn().mockResolvedValue(undefined) }
}));
jest.mock("../libs/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: mockEmit })) }))
}));
jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));
jest.mock("../services/CrmSyncService/SyncLeadFromOpportunityService", () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock("../services/CrmLeadService/helpers/syncLeadToClient", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined)
}));
jest.mock("../services/FlowBuilderService/FlowTriggerDispatchService", () => ({
  dispatchFlowTrigger: jest.fn().mockResolvedValue(undefined)
}));

import Opportunity from "../models/Opportunity";
import OpportunityEvent from "../models/OpportunityEvent";
import EventBus from "../libs/EventBus";
import SyncLeadFromOpportunityService from "../services/CrmSyncService/SyncLeadFromOpportunityService";
import syncLeadToClient from "../services/CrmLeadService/helpers/syncLeadToClient";
import { dispatchFlowTrigger } from "../services/FlowBuilderService/FlowTriggerDispatchService";
import CloseOpportunityService from "../services/OpportunityServices/CloseOpportunityService";
import ListOpportunitiesService from "../services/OpportunityServices/ListOpportunitiesService";

const mockedOpportunity = Opportunity as any;
const mockedSync = SyncLeadFromOpportunityService as jest.Mock;
const mockedClientSync = syncLeadToClient as jest.Mock;

const buildOpportunity = (overrides: any = {}) => ({
  id: 100,
  companyId: 1,
  pipelineId: 10,
  stageId: 55,
  contactId: 5,
  ticketId: null,
  leadId: 9,
  status: "OPEN",
  title: "TEC CODE TI",
  value: 0,
  assignedUserId: null,
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const fakeLead = { id: 9, companyId: 1, name: "TEC CODE TI" };

describe("CloseOpportunityService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSync.mockResolvedValue({ lead: fakeLead, linked: false, appliedStatus: "convertido" });
  });

  it("1. WON atualiza Opportunity e sincroniza Lead como convertido", async () => {
    const opportunity = buildOpportunity();
    mockedOpportunity.findOne.mockResolvedValue(opportunity);

    const result = await CloseOpportunityService({
      opportunityId: 100,
      companyId: 1,
      status: "WON"
    });

    expect(opportunity.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "WON" })
    );
    expect(mockedSync).toHaveBeenCalledWith(
      expect.objectContaining({ closingStatus: "WON", companyId: 1 })
    );
    expect(result.lead).toBe(fakeLead);
  });

  it("2. WON cria/atualiza Cliente idempotentemente (syncLeadToClient)", async () => {
    mockedOpportunity.findOne.mockResolvedValue(buildOpportunity());

    await CloseOpportunityService({ opportunityId: 100, companyId: 1, status: "WON" });

    expect(mockedClientSync).toHaveBeenCalledWith(fakeLead);
    expect(mockedClientSync).toHaveBeenCalledTimes(1);
  });

  it("3. WON sem leadId ainda converte quando o sync resolve o lead por contato", async () => {
    mockedOpportunity.findOne.mockResolvedValue(buildOpportunity({ leadId: null }));
    mockedSync.mockResolvedValue({ lead: fakeLead, linked: true, appliedStatus: "convertido" });

    const result = await CloseOpportunityService({
      opportunityId: 100,
      companyId: 1,
      status: "WON"
    });

    expect(mockedClientSync).toHaveBeenCalledWith(fakeLead);
    expect(result.lead).toBe(fakeLead);
  });

  it("4. LOST atualiza Opportunity e sincroniza Lead como perdido", async () => {
    const opportunity = buildOpportunity();
    mockedOpportunity.findOne.mockResolvedValue(opportunity);
    mockedSync.mockResolvedValue({ lead: fakeLead, linked: false, appliedStatus: "perdido" });

    await CloseOpportunityService({ opportunityId: 100, companyId: 1, status: "LOST" });

    expect(opportunity.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "LOST" })
    );
    expect(mockedSync).toHaveBeenCalledWith(
      expect.objectContaining({ closingStatus: "LOST" })
    );
  });

  it("5. LOST NÃO cria Cliente e preserva histórico (evento registrado)", async () => {
    mockedOpportunity.findOne.mockResolvedValue(buildOpportunity());
    mockedSync.mockResolvedValue({ lead: fakeLead, linked: false, appliedStatus: "perdido" });

    await CloseOpportunityService({ opportunityId: 100, companyId: 1, status: "LOST" });

    expect(mockedClientSync).not.toHaveBeenCalled();
    expect((OpportunityEvent as any).create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ origin: "close_opportunity", status: "LOST" })
      })
    );
  });

  it("6. status inválido é rejeitado", async () => {
    // AppError do projeto não estende Error → validar por shape.
    await expect(
      CloseOpportunityService({ opportunityId: 100, companyId: 1, status: "OPEN" as any })
    ).rejects.toMatchObject({
      message: "Status de fechamento inválido. Use WON ou LOST.",
      statusCode: 400
    });
  });

  it("7. fechamento idempotente: mesmo status não regrava, mas ainda sincroniza", async () => {
    const opportunity = buildOpportunity({ status: "WON" });
    mockedOpportunity.findOne.mockResolvedValue(opportunity);

    const result = await CloseOpportunityService({
      opportunityId: 100,
      companyId: 1,
      status: "WON"
    });

    expect(result.alreadyClosed).toBe(true);
    expect(opportunity.update).not.toHaveBeenCalled();
    expect(mockedSync).toHaveBeenCalled(); // cura divergências antigas
  });

  it("8. eventos e sockets são emitidos (EventBus + flow trigger + socket)", async () => {
    mockedOpportunity.findOne.mockResolvedValue(buildOpportunity());

    await CloseOpportunityService({ opportunityId: 100, companyId: 1, status: "WON" });

    expect((EventBus as any).publish).toHaveBeenCalledWith(
      "OPPORTUNITY_UPDATED",
      expect.objectContaining({ opportunityId: 100 }),
      1
    );
    expect(dispatchFlowTrigger as jest.Mock).toHaveBeenCalledWith(
      "opportunity_won",
      1,
      expect.anything()
    );
    expect(mockEmit).toHaveBeenCalledWith(
      "company-1-opportunity",
      expect.objectContaining({ action: "update" })
    );
  });
});

describe("ListOpportunitiesService — filtro explícito de status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedOpportunity.findAll.mockResolvedValue([]);
  });

  it("filtra OPEN quando solicitado (telas de funil listam só abertos)", async () => {
    await ListOpportunitiesService({ companyId: 1, status: "OPEN" } as any);
    expect(mockedOpportunity.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 1, status: "OPEN" })
      })
    );
  });

  it("WON/LOST só aparecem quando solicitados por filtro", async () => {
    await ListOpportunitiesService({ companyId: 1, status: "won" } as any);
    const where = mockedOpportunity.findAll.mock.calls[0][0].where;
    expect(where.status).toBe("WON");
  });

  it("sem filtro/ALL não restringe status (compatibilidade)", async () => {
    await ListOpportunitiesService({ companyId: 1, status: "ALL" } as any);
    const where = mockedOpportunity.findAll.mock.calls[0][0].where;
    expect(where.status).toBeUndefined();
  });
});
