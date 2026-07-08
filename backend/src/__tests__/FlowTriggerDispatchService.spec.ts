// Testes de regressão do dispatcher de gatilhos do FlowBuilder (QA Build #809).
// Cobre: normalização de active (Bug 1), semântica de trigger.active, matcher
// de keyword (acentos/lista/matchType), filtro de whatsappId, isolamento
// multiempresa e gatilho CRM sem ticket (Bug 2).

jest.mock("../models/FlowBuilder", () => ({
  FlowBuilderModel: {
    findAll: jest.fn()
  }
}));

jest.mock("../models/FlowExecution", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    update: jest.fn()
  }
}));

jest.mock("../models/Ticket", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../models/Contact", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../models/Whatsapp", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../services/WebhookService/ActionsWebhookService", () => ({
  ActionsWebhookService: jest.fn().mockResolvedValue("ds")
}));

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import {
  dispatchFlowTrigger,
  isActiveValue,
  isTriggerEnabled,
  matchesKeyword
} from "../services/FlowBuilderService/FlowTriggerDispatchService";
import logger from "../utils/logger";
import { FlowBuilderModel } from "../models/FlowBuilder";
import FlowExecution from "../models/FlowExecution";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import { ActionsWebhookService } from "../services/WebhookService/ActionsWebhookService";

const COMPANY_ID = 154;

const buildFlow = (overrides: any = {}) => ({
  id: 75,
  active: true,
  company_id: COMPANY_ID,
  triggers: [{ type: "message_received", config: {} }],
  flow: {
    nodes: [
      { id: "start1", type: "start" },
      { id: "n2", type: "message", data: { label: "Oi" } }
    ],
    connections: [{ source: "start1", target: "n2" }]
  },
  ...overrides
});

const mockExecution = () => ({
  id: 900,
  status: "started",
  stoppedReason: null,
  reload: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined)
});

const primeHappyPathModels = () => {
  // Canal padrão conectado da empresa + contato/ticket existentes
  (Whatsapp.findOne as jest.Mock).mockResolvedValue({ id: 5, companyId: COMPANY_ID });
  (Contact.findOne as jest.Mock).mockResolvedValue({
    id: 3,
    name: "Contato QA",
    email: ""
  });
  (Ticket.findOne as jest.Mock).mockResolvedValue({
    id: 10,
    whatsappId: 5,
    contactId: 3
  });
  (FlowExecution.create as jest.Mock).mockResolvedValue(mockExecution());
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isActiveValue — normalização de FlowBuilders.active (Bug 1)", () => {
  it("aceita boolean true, inteiro 1 e strings 'true'/'1'/'t'", () => {
    expect(isActiveValue(true)).toBe(true);
    expect(isActiveValue(1)).toBe(true);
    expect(isActiveValue("1")).toBe(true);
    expect(isActiveValue("true")).toBe(true);
    expect(isActiveValue("t")).toBe(true);
  });

  it("rejeita false, 0, null, undefined e strings falsas", () => {
    expect(isActiveValue(false)).toBe(false);
    expect(isActiveValue(0)).toBe(false);
    expect(isActiveValue(null)).toBe(false);
    expect(isActiveValue(undefined)).toBe(false);
    expect(isActiveValue("false")).toBe(false);
    expect(isActiveValue("")).toBe(false);
  });
});

describe("isTriggerEnabled — semântica de active por gatilho", () => {
  it("trigger sem campo active é considerado ativo", () => {
    expect(isTriggerEnabled({ type: "message_received", config: {} })).toBe(true);
  });

  it("trigger.active === false desativa", () => {
    expect(isTriggerEnabled({ type: "x", active: false })).toBe(false);
  });

  it("config.active === false desativa", () => {
    expect(isTriggerEnabled({ type: "x", config: { active: false } })).toBe(false);
  });
});

describe("matchesKeyword — keyword/matchType (Fase 5)", () => {
  it("keyword vazia casa qualquer mensagem", () => {
    expect(matchesKeyword({ config: {} }, "qualquer coisa")).toBe(true);
  });

  it("exact casa ignorando caixa e acento ('Olá' vs 'ola')", () => {
    const trigger = { config: { keyword: "ola", matchType: "exact" } };
    expect(matchesKeyword(trigger, "Olá")).toBe(true);
    expect(matchesKeyword(trigger, "Ola")).toBe(true);
    expect(matchesKeyword(trigger, "ola tudo bem")).toBe(false);
  });

  it("contains casa substring", () => {
    const trigger = { config: { keyword: "oi", matchType: "contains" } };
    expect(matchesKeyword(trigger, "Oi, tudo bem?")).toBe(true);
  });

  it("starts casa prefixo", () => {
    const trigger = { config: { keyword: "menu", matchType: "starts" } };
    expect(matchesKeyword(trigger, "Menu principal")).toBe(true);
    expect(matchesKeyword(trigger, "ver menu")).toBe(false);
  });

  it("lista separada por vírgula casa qualquer item ('oi, olá')", () => {
    const trigger = { config: { keyword: "oi, olá", matchType: "exact" } };
    expect(matchesKeyword(trigger, "Oi")).toBe(true);
    expect(matchesKeyword(trigger, "Olá")).toBe(true);
    expect(matchesKeyword(trigger, "tchau")).toBe(false);
  });
});

describe("dispatchFlowTrigger — despacho", () => {
  it("fluxo ativo (boolean) + trigger sem active dispara e cria execução", async () => {
    primeHappyPathModels();
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([buildFlow()]);

    const triggered = await dispatchFlowTrigger("message_received", COMPANY_ID, {
      contactNumber: "557798020125",
      message: "Ola"
    });

    expect(triggered).toBe(true);
    expect(ActionsWebhookService).toHaveBeenCalledTimes(1);
    expect(FlowExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: COMPANY_ID,
        flowId: 75,
        status: "started",
        trigger: "trigger_engine"
      })
    );
    // Escopo multiempresa na carga dos fluxos
    expect(FlowBuilderModel.findAll).toHaveBeenCalledWith({
      where: { company_id: COMPANY_ID }
    });
  });

  it("fluxo com active=1 (coluna inteira no banco) dispara — regressão Bug 1", async () => {
    primeHappyPathModels();
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([
      buildFlow({ active: 1 })
    ]);

    const triggered = await dispatchFlowTrigger("message_received", COMPANY_ID, {
      contactNumber: "557798020125",
      message: "Oi"
    });

    expect(triggered).toBe(true);
    expect(ActionsWebhookService).toHaveBeenCalledTimes(1);
  });

  it("fluxo inativo não dispara", async () => {
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([
      buildFlow({ active: false })
    ]);

    const triggered = await dispatchFlowTrigger("message_received", COMPANY_ID, {
      contactNumber: "557798020125",
      message: "Ola"
    });

    expect(triggered).toBe(false);
    expect(ActionsWebhookService).not.toHaveBeenCalled();
  });

  it("trigger.active === false não dispara", async () => {
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([
      buildFlow({
        triggers: [{ type: "message_received", active: false, config: {} }]
      })
    ]);

    const triggered = await dispatchFlowTrigger("message_received", COMPANY_ID, {
      contactNumber: "557798020125",
      message: "Ola"
    });

    expect(triggered).toBe(false);
    expect(ActionsWebhookService).not.toHaveBeenCalled();
  });

  it("keyword que não casa não dispara", async () => {
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([
      buildFlow({
        triggers: [
          { type: "message_received", config: { keyword: "menu", matchType: "exact" } }
        ]
      })
    ]);

    const triggered = await dispatchFlowTrigger("message_received", COMPANY_ID, {
      contactNumber: "557798020125",
      message: "Ola"
    });

    expect(triggered).toBe(false);
    expect(ActionsWebhookService).not.toHaveBeenCalled();
  });

  it("whatsappId do trigger diferente do canal do evento não dispara", async () => {
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([
      buildFlow({
        triggers: [{ type: "message_received", config: { whatsappId: 99 } }]
      })
    ]);

    const triggered = await dispatchFlowTrigger("message_received", COMPANY_ID, {
      contactNumber: "557798020125",
      message: "Ola",
      whatsappId: 5
    });

    expect(triggered).toBe(false);
    expect(ActionsWebhookService).not.toHaveBeenCalled();
  });

  it("log de whatsapp_mismatch inclui configWhatsappId e eventWhatsappId (diagnóstico Bug A)", async () => {
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([
      buildFlow({
        triggers: [{ type: "message_received", config: { whatsappId: 99 } }]
      })
    ]);

    await dispatchFlowTrigger("message_received", COMPANY_ID, {
      contactNumber: "557798020125",
      message: "Ola",
      whatsappId: 43
    });

    const call = (logger.info as jest.Mock).mock.calls.find(
      c => typeof c[1] === "string" && c[1].includes("trigger_skipped_whatsapp_mismatch")
    );
    expect(call).toBeDefined();
    expect(call[0]).toEqual(
      expect.objectContaining({ configWhatsappId: 99, eventWhatsappId: 43 })
    );
    expect(call[1]).toContain("configWhatsappId=99");
    expect(call[1]).toContain("eventWhatsappId=43");
  });

  it("fluxo de outra empresa não executa (guarda em _executeFlow)", async () => {
    primeHappyPathModels();
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([
      buildFlow({ company_id: 191 })
    ]);

    const triggered = await dispatchFlowTrigger("message_received", COMPANY_ID, {
      contactNumber: "557798020125",
      message: "Ola"
    });

    expect(triggered).toBe(false);
    expect(ActionsWebhookService).not.toHaveBeenCalled();
  });

  it("gatilho CRM sem ticket e sem telefone registra execução com erro claro e não executa (Bug 2)", async () => {
    (Whatsapp.findOne as jest.Mock).mockResolvedValue({ id: 5, companyId: COMPANY_ID });
    (FlowExecution.create as jest.Mock).mockResolvedValue(mockExecution());
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([
      buildFlow({ triggers: [{ type: "lead_created", config: {} }] })
    ]);

    const triggered = await dispatchFlowTrigger("lead_created", COMPANY_ID, {
      contactNumber: "",
      contactName: "Lead sem telefone",
      metadata: { leadId: 42 }
    });

    expect(triggered).toBe(false);
    expect(ActionsWebhookService).not.toHaveBeenCalled();
    expect(FlowExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: COMPANY_ID,
        flowId: 75,
        ticketId: null,
        status: "error",
        errorMessage: expect.stringContaining("sem atendimento vinculado")
      })
    );
  });

  it("evento opportunity_moved (mover card no board) casa gatilho move_lead — alias Kanban", async () => {
    primeHappyPathModels();
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([
      buildFlow({ triggers: [{ type: "move_lead", config: {} }] })
    ]);

    const triggered = await dispatchFlowTrigger("opportunity_moved", COMPANY_ID, {
      contactNumber: "557798020125",
      contactName: "Lead QA",
      metadata: { opportunityId: 7, leadId: 42, pipelineId: 1, toStageId: 3 }
    });

    expect(triggered).toBe(true);
    expect(ActionsWebhookService).toHaveBeenCalledTimes(1);
  });

  it("flow_skipped_inactive loga rawActiveValue/rawActiveType na mensagem (pino: objeto primeiro)", async () => {
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([
      buildFlow({ active: false })
    ]);

    await dispatchFlowTrigger("message_received", COMPANY_ID, {
      contactNumber: "557798020125",
      message: "Ola"
    });

    const call = (logger.info as jest.Mock).mock.calls.find(
      c => typeof c[1] === "string" && c[1].includes("flow_skipped_inactive")
    );
    expect(call).toBeDefined();
    // 1º arg = objeto de metadata (assinatura pino), 2º arg = mensagem com key=value
    expect(call[0]).toEqual(
      expect.objectContaining({
        flowId: 75,
        companyId: COMPANY_ID,
        rawActiveValue: "false",
        rawActiveType: "boolean",
        reason: "flow_inactive"
      })
    );
    expect(call[1]).toContain("rawActiveValue=false");
    expect(call[1]).toContain("rawActiveType=boolean");
    expect(call[1]).toContain("flowId=75");
  });

  it("whatsappId de outra empresa no config do trigger não contamina: cai para canal padrão da empresa", async () => {
    // 1ª chamada (validação do config.whatsappId escopada) → null;
    // 2ª chamada (canal padrão CONNECTED da empresa) → canal 5.
    (Whatsapp.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: 5, companyId: COMPANY_ID });
    (Contact.findOne as jest.Mock).mockResolvedValue({ id: 3, name: "QA", email: "" });
    (Ticket.findOne as jest.Mock).mockResolvedValue({ id: 10, whatsappId: 5, contactId: 3 });
    (FlowExecution.create as jest.Mock).mockResolvedValue(mockExecution());
    (FlowBuilderModel.findAll as jest.Mock).mockResolvedValue([
      buildFlow({
        triggers: [{ type: "move_lead", config: { whatsappId: 777 } }]
      })
    ]);

    const triggered = await dispatchFlowTrigger("move_lead", COMPANY_ID, {
      contactNumber: "557798020125",
      contactName: "Lead QA",
      metadata: { leadId: 42 }
    });

    expect(triggered).toBe(true);
    // Validação escopada do canal do trigger
    expect(Whatsapp.findOne).toHaveBeenCalledWith({
      where: { id: 777, companyId: COMPANY_ID }
    });
    // Executor recebeu o canal da empresa (5), nunca o 777
    expect((ActionsWebhookService as jest.Mock).mock.calls[0][0]).toBe(5);
  });
});
