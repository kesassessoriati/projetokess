/**
 * Fase 6 — Teste do motor QuickSendMessageEngineService.
 *
 * Valida que TODOS os tipos de mensagem passam pelo motor unificado e chegam à
 * fronteira de envio correta. Mocka apenas a fronteira de envio/persistência e a
 * resolução de contato/ticket/conexão — o motor em si NÃO é mockado.
 *
 * Obs.: os paths de jest.mock são relativos a este arquivo (src/__tests__/).
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
  default: jest.fn().mockResolvedValue("5511999999999")
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
  normalizePhoneNumber: jest.fn((n: any) => String(n))
}));

jest.mock("../models/Whatsapp", () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock("../models/Contact", () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock("../models/Ticket", () => ({ __esModule: true, default: { update: jest.fn() } }));
jest.mock("../models/CompaniesSettings", () => ({ __esModule: true, default: { findOne: jest.fn().mockResolvedValue(null) } }));
jest.mock("../models/CrmLead", () => ({ __esModule: true, default: { findOne: jest.fn().mockResolvedValue(null) } }));
jest.mock("../models/Opportunity", () => ({ __esModule: true, default: { findOne: jest.fn().mockResolvedValue(null) } }));
jest.mock("../models/QuickReply", () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock("../models/MediaFile", () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock("../services/ContactServices/CreateOrUpdateContactService", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../services/TicketServices/FindOrCreateTicketService", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../services/TicketServices/ShowTicketService", () => ({ __esModule: true, default: jest.fn(async (id: number) => ({ id })) }));
jest.mock("../services/TicketServices/UpdateTicketService", () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import { verifyMessage } from "../services/WbotServices/wbotMessageListener";
import {
  sendButtonMessage,
  sendListMessage,
  sendCarouselMessage
} from "../helpers/SendInteractiveMessage";
import { getMessageOptions } from "../services/WbotServices/SendWhatsAppMedia";
import Whatsapp from "../models/Whatsapp";
import QuickReply from "../models/QuickReply";
import MediaFile from "../models/MediaFile";
import QuickSendMessageEngineService from "../services/QuickSendServices/QuickSendMessageEngineService";

const NUMBER = "5511999999999";

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

const baseArgs = (overrides: any = {}) => ({
  companyId: 1,
  number: NUMBER,
  whatsappId: 10,
  contact: buildContact(),
  ticket: buildTicket(),
  ...overrides
});

describe("QuickSendMessageEngineService — roteamento de envio unificado", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Whatsapp as any).findOne.mockResolvedValue({ id: 10, companyId: 1, status: "CONNECTED" });
  });

  it("texto envia pelo motor (SendWhatsAppMessage)", async () => {
    await QuickSendMessageEngineService(baseArgs({ message: "Olá", messageType: "text" }) as any);
    expect(SendWhatsAppMessage as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ body: "Olá" })
    );
    expect(verifyMessage as jest.Mock).toHaveBeenCalled();
  });

  it("botões enviam pelo motor (sendButtonMessage)", async () => {
    await QuickSendMessageEngineService(
      baseArgs({ message: "Escolha", messageType: "buttons", buttons: [{ displayText: "Sim" }] }) as any
    );
    expect(sendButtonMessage as jest.Mock).toHaveBeenCalled();
    expect(SendWhatsAppMessage as jest.Mock).not.toHaveBeenCalled();
  });

  it("mídia (mediaId) envia via wbot.sendMessage com options do getMessageOptions", async () => {
    (MediaFile as any).findOne.mockResolvedValue({
      storagePath: "media-lib/arquivo.jpg",
      customName: "arquivo.jpg",
      originalName: "arquivo.jpg"
    });
    await QuickSendMessageEngineService(baseArgs({ message: "legenda", mediaId: 42 }) as any);
    expect(getMessageOptions as jest.Mock).toHaveBeenCalled();
    expect(mockWbot.sendMessage).toHaveBeenCalledWith(
      `${NUMBER}@s.whatsapp.net`,
      expect.objectContaining({ image: { url: "fake" } })
    );
  });

  it("resposta rápida (quickReplyId) só texto usa o texto do QR", async () => {
    (QuickReply as any).findOne.mockResolvedValue({
      message: "Mensagem da resposta rápida",
      mediaName: null,
      getDataValue: () => null
    });
    await QuickSendMessageEngineService(baseArgs({ message: "", quickReplyId: 9 }) as any);
    expect(SendWhatsAppMessage as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ body: "Mensagem da resposta rápida" })
    );
  });

  it("lista envia pelo motor (sendListMessage)", async () => {
    await QuickSendMessageEngineService(
      baseArgs({
        message: "Cardápio",
        messageType: "list",
        listSections: [{ title: "Seção", rows: [{ title: "Item" }] }],
        listButtonText: "Ver"
      }) as any
    );
    expect(sendListMessage as jest.Mock).toHaveBeenCalled();
  });

  it("carrossel envia pelo motor (sendCarouselMessage)", async () => {
    await QuickSendMessageEngineService(
      baseArgs({ messageType: "carousel", carouselCards: [{ title: "Card" }] }) as any
    );
    expect(sendCarouselMessage as jest.Mock).toHaveBeenCalled();
  });

  it("enquete envia pelo motor (wbot.sendMessage com poll)", async () => {
    await QuickSendMessageEngineService(
      baseArgs({ messageType: "poll", poll: { name: "Gostou?", options: ["Sim", "Não"] } }) as any
    );
    expect(mockWbot.sendMessage).toHaveBeenCalledWith(
      `${NUMBER}@s.whatsapp.net`,
      expect.objectContaining({ poll: expect.objectContaining({ name: "Gostou?" }) })
    );
  });

  it("botões sem opções retornam erro claro (sendError)", async () => {
    const result = await QuickSendMessageEngineService(
      baseArgs({ message: "x", messageType: "buttons", buttons: [] }) as any
    );
    expect(result.sendError).toMatch(/Nenhum botão configurado/i);
  });
});
