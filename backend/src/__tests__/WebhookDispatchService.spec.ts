import axios from "axios";
import QueueIntegrations from "../models/QueueIntegrations";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import Contact from "../models/Contact";
import { dispatch } from "../services/WebhookDispatch/WebhookDispatchService";

jest.mock("axios");

describe("WebhookDispatchService", () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps non-message events global", async () => {
    jest.spyOn(QueueIntegrations, "findAll").mockResolvedValue([
      {
        id: 1,
        urlN8N: "https://global.example/webhook",
        webhookEvents: ["LEAD_CREATED"]
      }
    ] as any);

    await dispatch("LEAD_CREATED", 1, {
      lead: { id: 123 }
    });

    expect(QueueIntegrations.findAll).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://global.example/webhook",
      expect.objectContaining({
        event: "LEAD_CREATED",
        companyId: 1
      }),
      expect.any(Object)
    );
  });

  it("routes message events only to the integration assigned on the channel", async () => {
    jest.spyOn(Ticket, "findOne").mockResolvedValue({
      id: 99,
      webhookPausedUntil: null
    } as any);
    jest.spyOn(Whatsapp, "findOne").mockResolvedValue({
      id: 7,
      messageIntegrationId: 55
    } as any);
    jest.spyOn(QueueIntegrations, "findOne").mockResolvedValue({
      id: 55,
      urlN8N: "https://channel.example/webhook",
      webhookEvents: ["MESSAGE_RECEIVED", "MESSAGE_SENT"]
    } as any);

    await dispatch("MESSAGE_RECEIVED", 1, {
      ticket: { id: 99, whatsappId: 7 },
      whatsapp: { id: 7 },
      message: { body: "oi" }
    });

    expect(Whatsapp.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7, companyId: 1 }
      })
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://channel.example/webhook",
      expect.objectContaining({
        event: "MESSAGE_RECEIVED",
        companyId: 1
      }),
      expect.any(Object)
    );
  });

  it("suppresses message events while the ticket pause is active", async () => {
    jest.spyOn(Ticket, "findOne").mockResolvedValue({
      id: 99,
      webhookPausedUntil: new Date(Date.now() + 60 * 60 * 1000)
    } as any);
    jest.spyOn(Whatsapp, "findOne").mockResolvedValue({
      id: 7,
      messageIntegrationId: 55
    } as any);
    jest.spyOn(QueueIntegrations, "findOne").mockResolvedValue({
      id: 55,
      urlN8N: "https://channel.example/webhook",
      webhookEvents: ["MESSAGE_RECEIVED"]
    } as any);

    await dispatch("MESSAGE_RECEIVED", 1, {
      ticket: { id: 99, whatsappId: 7 },
      whatsapp: { id: 7 }
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("dispatches MESSAGE_RECEIVED for an open ticket with user and queue assigned", async () => {
    jest.spyOn(Ticket, "findOne").mockResolvedValue({
      id: 99,
      webhookPausedUntil: null,
      webhookDisabled: false
    } as any);
    jest.spyOn(Contact, "findOne").mockResolvedValue(null);
    jest.spyOn(Whatsapp, "findOne").mockResolvedValue({
      id: 7,
      messageIntegrationId: 55
    } as any);
    jest.spyOn(QueueIntegrations, "findOne").mockResolvedValue({
      id: 55,
      urlN8N: "https://channel.example/webhook",
      webhookEvents: ["MESSAGE_RECEIVED"]
    } as any);

    await dispatch("MESSAGE_RECEIVED", 1, {
      ticket: {
        id: 99,
        status: "open",
        contactId: 33,
        queueId: 4,
        userId: 12,
        whatsappId: 7
      },
      whatsapp: { id: 7 },
      message: { body: "cliente retomando depois de dias" }
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://channel.example/webhook",
      expect.objectContaining({
        event: "MESSAGE_RECEIVED",
        companyId: 1
      }),
      expect.any(Object)
    );
  });

  it("suppresses MESSAGE_RECEIVED when webhookDisabled is set on the ticket", async () => {
    jest.spyOn(Ticket, "findOne").mockResolvedValue({
      id: 99,
      webhookPausedUntil: null,
      webhookDisabled: true
    } as any);
    jest.spyOn(Whatsapp, "findOne").mockResolvedValue({
      id: 7,
      messageIntegrationId: 55
    } as any);
    jest.spyOn(QueueIntegrations, "findOne").mockResolvedValue({
      id: 55,
      urlN8N: "https://channel.example/webhook",
      webhookEvents: ["MESSAGE_RECEIVED"]
    } as any);

    await dispatch("MESSAGE_RECEIVED", 1, {
      ticket: { id: 99, status: "open", contactId: 33, whatsappId: 7 },
      whatsapp: { id: 7 }
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("suppresses MESSAGE_RECEIVED when the contact has an active AI block", async () => {
    jest.spyOn(Ticket, "findOne").mockResolvedValue({
      id: 99,
      webhookPausedUntil: null,
      webhookDisabled: false
    } as any);
    jest.spyOn(Contact, "findOne").mockResolvedValue({
      id: 33,
      aiBlockMode: "disabled_manual",
      aiBlockedUntil: null,
      aiBlockedByStageId: null
    } as any);
    jest.spyOn(Whatsapp, "findOne").mockResolvedValue({
      id: 7,
      messageIntegrationId: 55
    } as any);
    jest.spyOn(QueueIntegrations, "findOne").mockResolvedValue({
      id: 55,
      urlN8N: "https://channel.example/webhook",
      webhookEvents: ["MESSAGE_RECEIVED"]
    } as any);

    await dispatch("MESSAGE_RECEIVED", 1, {
      ticket: { id: 99, status: "open", contactId: 33, whatsappId: 7 },
      whatsapp: { id: 7 }
    });

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("keeps MESSAGE_SENT flowing even while the ticket pause is active", async () => {
    jest.spyOn(Ticket, "findOne").mockResolvedValue({
      id: 99,
      webhookPausedUntil: new Date(Date.now() + 60 * 60 * 1000),
      webhookDisabled: false
    } as any);
    jest.spyOn(Whatsapp, "findOne").mockResolvedValue({
      id: 7,
      messageIntegrationId: 55
    } as any);
    jest.spyOn(QueueIntegrations, "findOne").mockResolvedValue({
      id: 55,
      urlN8N: "https://channel.example/webhook",
      webhookEvents: ["MESSAGE_RECEIVED", "MESSAGE_SENT"]
    } as any);

    await dispatch("MESSAGE_SENT", 1, {
      ticket: { id: 99, status: "open", contactId: 33, whatsappId: 7 },
      whatsapp: { id: 7 },
      message: { body: "resposta humana", fromMe: true }
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://channel.example/webhook",
      expect.objectContaining({
        event: "MESSAGE_SENT",
        companyId: 1
      }),
      expect.any(Object)
    );
  });
});
