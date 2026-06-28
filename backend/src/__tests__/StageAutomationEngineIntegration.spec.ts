/**
 * Fase 6 — Integração Automação de Etapa → motor QuickSend.
 *
 * Garante que a automação SEMPRE usa o motor real (QuickSendMessageEngineService,
 * NÃO mockado) para todos os tipos, e que a resolução de contato a partir do
 * telefone do lead funciona — com erro explícito quando não há telefone.
 *
 * Mocka apenas a fronteira de envio/persistência e a resolução pesada.
 * Paths de jest.mock relativos a este arquivo (src/__tests__/).
 */

const mockWbot = { sendMessage: jest.fn().mockResolvedValue({ key: { id: "WBOT" } }) };

jest.mock("../libs/wbot", () => ({ getWbot: jest.fn(() => mockWbot) }));
jest.mock("../services/WbotServices/SendWhatsAppMessage", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ key: { id: "TXT" } })
}));
jest.mock("../services/WbotServices/wbotMessageListener", () => ({
  verifyMessage: jest.fn().mockResolvedValue(undefined)
}));
jest.mock("../helpers/SendInteractiveMessage", () => ({
  sendButtonMessage: jest.fn().mockResolvedValue({ key: { id: "BTN" } }),
  sendListMessage: jest.fn().mockResolvedValue({ key: { id: "LIST" } }),
  sendCarouselMessage: jest.fn().mockResolvedValue({ key: { id: "CAR" } })
}));
jest.mock("../services/WbotServices/SendWhatsAppMedia", () => ({
  getMessageOptions: jest.fn().mockResolvedValue({ image: { url: "fake" } })
}));
jest.mock("../services/WbotServices/CheckNumber", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue("5511988887777")
}));
jest.mock("../helpers/RenderCampaignTemplate", () => ({
  __esModule: true,
  default: jest.fn((input: any) => input)
}));
jest.mock("../helpers/RenderAppointmentVariables", () => ({
  renderAppointmentVariables: jest.fn(async (input: any) => input)
}));
jest.mock("../helpers/normalizeContactNumber", () => ({
  getBrazilianPhoneVariants: jest.fn((n: any) => [String(n)]),
  normalizePhoneNumber: jest.fn((n: any) => String(n || ""))
}));

jest.mock("../models/Whatsapp", () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock("../models/Contact", () => ({ __esModule: true, default: { findOne: jest.fn().mockResolvedValue(null) } }));
jest.mock("../models/CompaniesSettings", () => ({ __esModule: true, default: { findOne: jest.fn().mockResolvedValue(null) } }));
jest.mock("../models/CrmLead", () => ({ __esModule: true, default: { findOne: jest.fn().mockResolvedValue(null) } }));
jest.mock("../models/Opportunity", () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock("../models/QuickReply", () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock("../models/MediaFile", () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock("../services/ContactServices/CreateOrUpdateContactService", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../services/TicketServices/FindOrCreateTicketService", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../services/TicketServices/ShowTicketService", () => ({
  __esModule: true,
  default: jest.fn(async (id: number) => ({ id, companyId: 1, update: jest.fn().mockResolvedValue(undefined) }))
}));
// Persistência pesada: o ramo de mídia do motor grava via CreateMessageService.
jest.mock("../services/MessageServices/CreateMessageService", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ id: 1 })
}));
// UpdateTicketService é importado tanto pelo motor quanto pelo ProcessAutomationService;
// o mock evita carregar a cadeia real do Wbot/Baileys.
jest.mock("../services/TicketServices/UpdateTicketService", () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import { sendButtonMessage } from "../helpers/SendInteractiveMessage";
import { getMessageOptions } from "../services/WbotServices/SendWhatsAppMedia";
import Whatsapp from "../models/Whatsapp";
import Opportunity from "../models/Opportunity";
import MediaFile from "../models/MediaFile";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import { executeAction } from "../services/AutomationServices/ProcessAutomationService";

const NUMBER = "5511988887777";

const buildContact = () => ({
  id: 5,
  number: NUMBER,
  remoteJid: `${NUMBER}@s.whatsapp.net`,
  name: "Fulano",
  email: null
});
const buildTicket = () => ({
  id: 7,
  companyId: 1,
  contactId: 5,
  whatsappId: 10,
  isGroup: false,
  update: jest.fn().mockResolvedValue(undefined)
});

const sendAction = (actionConfig: any) =>
  ({ actionType: "send_message", actionConfig } as any);

describe("Automação de etapa → motor QuickSend (integração)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Whatsapp as any).findOne.mockResolvedValue({ id: 10, companyId: 1, status: "CONNECTED" });
    (Opportunity as any).findOne.mockResolvedValue(null);
    (CreateOrUpdateContactService as jest.Mock).mockResolvedValue({
      id: 5,
      number: NUMBER,
      remoteJid: `${NUMBER}@s.whatsapp.net`,
      name: "Lead",
      email: null
    });
    const { default: FindOrCreateTicketService } = require("../services/TicketServices/FindOrCreateTicketService");
    (FindOrCreateTicketService as jest.Mock).mockResolvedValue(buildTicket());
  });

  it("automação de texto chama o motor real (SendWhatsAppMessage)", async () => {
    const result = await executeAction(
      sendAction({ message: "Olá lead", whatsappId: 10, messageType: "text" }),
      buildContact() as any,
      buildTicket() as any,
      1,
      99
    );
    expect(result).toEqual({ success: true, message: "Mensagem enviada com sucesso" });
    expect(SendWhatsAppMessage as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ body: "Olá lead" })
    );
  });

  it("automação de botões chama o motor real (sendButtonMessage)", async () => {
    const result = await executeAction(
      sendAction({ message: "Escolha", whatsappId: 10, messageType: "buttons", buttons: [{ displayText: "Sim" }] }),
      buildContact() as any,
      buildTicket() as any,
      1,
      99
    );
    expect(result.success).toBe(true);
    expect(sendButtonMessage as jest.Mock).toHaveBeenCalled();
  });

  it("automação de mídia chama o motor real (getMessageOptions + wbot.sendMessage)", async () => {
    (MediaFile as any).findOne.mockResolvedValue({
      storagePath: "media-lib/x.jpg",
      customName: "x.jpg",
      originalName: "x.jpg"
    });
    const result = await executeAction(
      sendAction({ message: "legenda", whatsappId: 10, mediaId: 42 }),
      buildContact() as any,
      buildTicket() as any,
      1,
      99
    );
    expect(result.success).toBe(true);
    expect(getMessageOptions as jest.Mock).toHaveBeenCalled();
    expect(mockWbot.sendMessage).toHaveBeenCalled();
  });

  it("lead sem contato mas com telefone resolve/cria contato via motor", async () => {
    (Opportunity as any).findOne.mockResolvedValue({
      id: 99,
      ticketId: 7,
      contact: null,
      ticket: null,
      update: jest.fn().mockResolvedValue(undefined),
      lead: {
        id: 1,
        name: "Lead Sem Contato",
        phone: NUMBER,
        contact: null,
        update: jest.fn().mockResolvedValue(undefined)
      }
    });

    const result = await executeAction(
      sendAction({ message: "Oi", whatsappId: 10, messageType: "text" }),
      null,
      null,
      1,
      99
    );

    expect(result.success).toBe(true);
    // contato criado a partir do telefone do lead
    expect(CreateOrUpdateContactService as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ number: NUMBER })
    );
    expect(SendWhatsAppMessage as jest.Mock).toHaveBeenCalled();
  });

  it("lead sem contato e sem telefone retorna erro explícito", async () => {
    (Opportunity as any).findOne.mockResolvedValue({
      id: 99,
      contact: null,
      ticket: null,
      lead: { id: 1, name: "Lead", phone: null, decisionMakerPhone: null, contact: null }
    });

    const result = await executeAction(
      sendAction({ message: "Oi", whatsappId: 10, messageType: "text" }),
      null,
      null,
      1,
      99
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Automação não enviou: oportunidade 99 sem contato e lead sem telefone válido."
    );
    expect(SendWhatsAppMessage as jest.Mock).not.toHaveBeenCalled();
  });
});
