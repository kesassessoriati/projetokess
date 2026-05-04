import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import CompaniesSettings from "../../models/CompaniesSettings";
import CreateMessageService from "../../services/MessageServices/CreateMessageService";
import CreateOrUpdateContactService from "../../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../../services/TicketServices/FindOrCreateTicketService";
import UpdateTicketService from "../../services/TicketServices/UpdateTicketService";
import { SendMediaOfficialService } from "../../services/WhatsAppOfficial/SendMediaOfficialService";
import { SendTextOfficialService } from "../../services/WhatsAppOfficial/SendTextOfficialService";
import { extractGraphError, graphRequest } from "../../services/WhatsappCoexistence/graphApiHelper";

const ensureExternalAuth = (req: Request) => {
  if (!req.externalAuth) {
    throw new AppError("ERR_EXTERNAL_AUTH_REQUIRED", 401);
  }

  return req.externalAuth;
};

const sanitizeNumber = (value?: string) => String(value || "").replace(/\D/g, "");

const findOfficialConnection = async (companyId: number, whatsappId: number): Promise<Whatsapp> => {
  const connection = await Whatsapp.findOne({
    where: {
      id: whatsappId,
      companyId,
      channel: "whatsapp_official"
    }
  });

  if (!connection) {
    throw new AppError("ERR_OFFICIAL_CONNECTION_NOT_FOUND", 404);
  }

  if (!connection.coexistencePhoneNumberId || !connection.coexistencePermanentToken) {
    throw new AppError("ERR_OFFICIAL_MISSING_CREDENTIALS", 400);
  }

  return connection;
};

const resolveTicket = async ({
  companyId,
  connection,
  number,
  name,
  queueId,
  userId
}: {
  companyId: number;
  connection: Whatsapp;
  number: string;
  name?: string;
  queueId?: number;
  userId?: number;
}): Promise<Ticket> => {
  const contact = await CreateOrUpdateContactService({
    name: name || number,
    number,
    isGroup: false,
    companyId,
    channel: "whatsapp_official",
    whatsappId: connection.id,
    remoteJid: `${number}@s.whatsapp.net`
  });

  const settings = await CompaniesSettings.findOne({ where: { companyId } });

  return FindOrCreateTicketService(
    contact,
    connection,
    0,
    companyId,
    queueId || null,
    userId || null,
    null,
    "whatsapp_official",
    null,
    false,
    settings,
    false,
    false
  );
};

const closeTicketIfRequested = async ({
  ticket,
  companyId,
  closeTicket,
  lastMessage
}: {
  ticket: Ticket;
  companyId: number;
  closeTicket?: boolean;
  lastMessage: string;
}) => {
  if (!closeTicket) return;

  await UpdateTicketService({
    ticketId: ticket.id,
    ticketData: {
      status: "closed",
      sendFarewellMessage: false,
      amountUsedBotQueues: 0,
      lastMessage
    },
    companyId
  });
};

export const send = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const {
    whatsappId,
    number: rawNumber,
    name,
    body,
    queueId,
    userId,
    closeTicket = false
  } = req.body;
  const medias = req.files as Express.Multer.File[];

  const number = sanitizeNumber(rawNumber);
  if (!whatsappId || !number) {
    throw new AppError("whatsappId e number sao obrigatorios.", 400);
  }

  if (!body && (!medias || medias.length === 0)) {
    throw new AppError("body ou medias sao obrigatorios.", 400);
  }

  const connection = await findOfficialConnection(companyId, Number(whatsappId));
  const ticket = await resolveTicket({
    companyId,
    connection,
    number,
    name,
    queueId: queueId ? Number(queueId) : undefined,
    userId: userId ? Number(userId) : undefined
  });

  let sentMessages: any[] = [];
  if (medias && medias.length > 0) {
    sentMessages = await Promise.all(
      medias.map(media =>
        SendMediaOfficialService({
          media,
          body: body || "",
          ticketId: ticket.id,
          contact: ticket.contact,
          connection
        })
      )
    );
  } else {
    const sent = await SendTextOfficialService({
      body,
      ticketId: ticket.id,
      contact: ticket.contact,
      connection
    });
    sentMessages = [sent];
  }

  await closeTicketIfRequested({
    ticket,
    companyId,
    closeTicket: closeTicket === true || closeTicket === "true",
    lastMessage: body || "[Midia oficial]"
  });

  return res.status(201).json({
    status: "SUCCESS",
    ticketId: ticket.id,
    contactId: ticket.contactId,
    messages: sentMessages.map(message => ({
      id: message.id,
      wid: message.wid,
      body: message.body,
      mediaType: message.mediaType
    }))
  });
};

export const sendTemplate = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const {
    whatsappId,
    number: rawNumber,
    name,
    templateName,
    languageCode = "pt_BR",
    components = [],
    queueId,
    userId,
    closeTicket = false
  } = req.body;

  const number = sanitizeNumber(rawNumber);
  if (!whatsappId || !number || !templateName) {
    throw new AppError("whatsappId, number e templateName sao obrigatorios.", 400);
  }

  const connection = await findOfficialConnection(companyId, Number(whatsappId));
  const ticket = await resolveTicket({
    companyId,
    connection,
    number,
    name,
    queueId: queueId ? Number(queueId) : undefined,
    userId: userId ? Number(userId) : undefined
  });

  const payload = {
    messaging_product: "whatsapp",
    to: number,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components
    }
  };

  try {
    const response = await graphRequest(
      connection.coexistencePermanentToken,
      "post",
      `${connection.coexistencePhoneNumberId}/messages`,
      payload
    );

    const messageId = response?.messages?.[0]?.id;
    if (!messageId) {
      throw new AppError("ERR_OFFICIAL_NO_MESSAGE_ID", 400);
    }

    const message = await CreateMessageService({
      companyId,
      messageData: {
        wid: messageId,
        ticketId: ticket.id,
        contactId: ticket.contactId,
        body: `[Template] ${templateName}`,
        fromMe: true,
        read: true,
        ack: 2,
        mediaType: "template",
        externalMessageId: messageId,
        emailMeta: {
          officialTemplate: {
            name: templateName,
            languageCode,
            components
          },
          graphResponse: response
        }
      } as any
    });

    await closeTicketIfRequested({
      ticket,
      companyId,
      closeTicket: closeTicket === true || closeTicket === "true",
      lastMessage: `[Template] ${templateName}`
    });

    return res.status(201).json({
      status: "SUCCESS",
      ticketId: ticket.id,
      contactId: ticket.contactId,
      messageId: message.id,
      externalMessageId: messageId,
      graphResponse: response
    });
  } catch (error) {
    const graphError = extractGraphError(error);
    throw new AppError(`ERR_OFFICIAL_SEND_TEMPLATE: ${graphError}`, 400);
  }
};
