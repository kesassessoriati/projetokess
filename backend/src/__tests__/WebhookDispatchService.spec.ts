import axios from "axios";
import QueueIntegrations from "../models/QueueIntegrations";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
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
});
