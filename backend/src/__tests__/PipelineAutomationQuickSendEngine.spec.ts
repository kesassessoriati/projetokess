const mockQuickSendMessageEngine = jest.fn();

jest.mock("../services/QuickSendServices/QuickSendMessageEngineService", () => ({
  __esModule: true,
  default: mockQuickSendMessageEngine
}));

jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Isola a cadeia real do Wbot/Baileys durante o teste. O ProcessAutomationService
// importa estaticamente SendWhatsAppMessage e UpdateTicketService; este último
// arrasta GetTicketWbot/wbotMessageListener -> @whiskeysockets/baileys (ESM), que
// o Jest nao transpila a partir de node_modules. Como nenhum dos dois e usado no
// caminho send_message (delegado ao QuickSend engine, ja mockado), substitui-los
// por stubs evita carregar o Baileys sem alterar comportamento de producao.
// (jest.mock e icado acima dos imports pelo ts-jest.)
jest.mock("../services/WbotServices/SendWhatsAppMessage", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../services/TicketServices/UpdateTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));

import { executeAction } from "../services/AutomationServices/ProcessAutomationService";

describe("Pipeline automation WhatsApp send action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuickSendMessageEngine.mockResolvedValue({
      ticket: { id: 22 },
      contact: { id: 11 }
    });
  });

  it("delegates text messages to the QuickSend engine", async () => {
    const contact = { id: 11, number: "11988887777" } as any;
    const ticket = { id: 22, companyId: 7, contactId: 11, whatsappId: 3 } as any;
    const action = {
      actionType: "send_message",
      actionConfig: {
        messageType: "text",
        message: "Olá {{firstName}}",
        whatsappId: 3
      }
    } as any;

    const result = await executeAction(action, contact, ticket, 7, 99);

    expect(result).toEqual({
      success: true,
      message: "Mensagem enviada com sucesso"
    });
    expect(mockQuickSendMessageEngine).toHaveBeenCalledWith({
      companyId: 7,
      opportunityId: 99,
      contact,
      ticket,
      whatsappId: 3,
      message: "Olá {{firstName}}",
      buttons: undefined,
      messageType: "text",
      renderAppointment: true
    });
  });

  it("delegates button messages to the QuickSend engine", async () => {
    const contact = { id: 11, number: "11988887777" } as any;
    const ticket = { id: 22, companyId: 7, contactId: 11, whatsappId: 3 } as any;
    const buttons = [
      { displayText: "Sim, confirmo", type: "reply", value: "confirm_appointment" }
    ];
    const action = {
      actionType: "send_message",
      actionConfig: {
        messageType: "buttons",
        message: "Confirma?",
        whatsappId: 3,
        buttons
      }
    } as any;

    const result = await executeAction(action, contact, ticket, 7, 99);

    expect(result.success).toBe(true);
    expect(mockQuickSendMessageEngine).toHaveBeenCalledWith({
      companyId: 7,
      opportunityId: 99,
      contact,
      ticket,
      whatsappId: 3,
      message: "Confirma?",
      buttons,
      messageType: "buttons",
      renderAppointment: true
    });
  });

  it("returns a controlled failure when the QuickSend engine cannot send", async () => {
    mockQuickSendMessageEngine.mockResolvedValueOnce({
      ticket: { id: 22 },
      contact: { id: 11 },
      warning: "Ticket criado, mas houve erro ao enviar a mensagem.",
      sendError: "Conexão WhatsApp não encontrada ou não está conectada."
    });

    const result = await executeAction(
      {
        actionType: "send_message",
        actionConfig: {
          messageType: "text",
          message: "Teste",
          whatsappId: 3
        }
      } as any,
      { id: 11, number: "11988887777" } as any,
      null,
      7,
      99
    );

    expect(result).toEqual({
      success: false,
      message: "Conexão WhatsApp não encontrada ou não está conectada."
    });
  });
});
