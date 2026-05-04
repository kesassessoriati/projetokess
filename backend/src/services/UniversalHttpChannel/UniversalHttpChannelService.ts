import axios, { Method } from "axios";
import { get } from "lodash";
import { v4 as uuidv4 } from "uuid";

import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import CompaniesSettings from "../../models/CompaniesSettings";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";

type KeyValue = { key: string; value: string };

export interface UniversalConfig {
  baseUrl?: string;
  sendMethod?: Method;
  sendPath?: string;
  contentType?: string;
  timeoutMs?: number;
  authType?: "none" | "bearer" | "basic" | "apiKey";
  credentials?: Record<string, string>;
  headers?: KeyValue[];
  queryParams?: KeyValue[];
  bodyTemplate?: string;
  responseIdPath?: string;
  responseSuccessPath?: string;
}

interface SendRequest {
  ticket: Ticket;
  body: string;
  userId?: number;
  medias?: Express.Multer.File[];
}

interface InboundRequest {
  channel: Whatsapp;
  externalContactId: string;
  contactName?: string;
  body: string;
  externalMessageId?: string;
  queueId?: number;
  userId?: number;
}

const DEFAULT_BODY_TEMPLATE = `{
  "to": "\${contact.number}",
  "name": "\${contact.name}",
  "message": "\${message.body}",
  "ticketId": "\${ticket.id}"
}`;

const normalizeConfig = (config?: UniversalConfig | null): UniversalConfig => ({
  contentType: "application/json",
  timeoutMs: 30000,
  authType: "none",
  headers: [{ key: "Content-Type", value: "application/json" }],
  queryParams: [],
  bodyTemplate: DEFAULT_BODY_TEMPLATE,
  responseIdPath: "id",
  responseSuccessPath: "ok",
  ...config
});

const renderTemplate = (template: string, context: Record<string, any>) =>
  template.replace(/\$\{([^}]+)\}/g, (_, path) => {
    const value = get(context, String(path).trim());
    if (value === undefined || value === null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value).replace(/"/g, '\\"');
  });

const parseRenderedBody = (rendered: string, contentType?: string) => {
  if ((contentType || "").includes("json")) {
    try {
      return JSON.parse(rendered);
    } catch (error) {
      throw new AppError("Body template do canal HTTP gerou JSON invalido.", 400);
    }
  }

  return rendered;
};

const buildUrl = (baseUrl = "", path = "", queryParams: KeyValue[] = [], context: Record<string, any>) => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = renderTemplate(path, context).replace(/^\/+/, "");
  const url = new URL(normalizedPath ? `${normalizedBaseUrl}/${normalizedPath}` : normalizedBaseUrl);
  queryParams.forEach(param => {
    if (param.key) url.searchParams.set(param.key, renderTemplate(param.value || "", context));
  });
  return url.toString();
};

const buildHeaders = (config: UniversalConfig, context: Record<string, any>) => {
  const headers: Record<string, string> = {};

  (config.headers || []).forEach(header => {
    if (header.key) headers[header.key] = renderTemplate(header.value || "", context);
  });

  const credentials = config.credentials || {};
  if (config.authType === "bearer" && credentials.token) {
    headers.Authorization = `Bearer ${renderTemplate(credentials.token, context)}`;
  }
  if (config.authType === "basic" && credentials.username) {
    const raw = `${credentials.username}:${credentials.password || ""}`;
    headers.Authorization = `Basic ${Buffer.from(raw).toString("base64")}`;
  }
  if (config.authType === "apiKey" && credentials.headerName && credentials.apiKey) {
    headers[credentials.headerName] = renderTemplate(credentials.apiKey, context);
  }

  return headers;
};

const getContactKey = (channelId: number, externalContactId: string) =>
  `http:${channelId}:${String(externalContactId).trim()}`;

export const findOrCreateUniversalContact = async ({
  channel,
  externalContactId,
  contactName
}: {
  channel: Whatsapp;
  externalContactId: string;
  contactName?: string;
}) => {
  const number = getContactKey(channel.id, externalContactId);
  const [contact] = await Contact.findOrCreate({
    where: { companyId: channel.companyId, number },
    defaults: {
      name: contactName || externalContactId,
      number,
      companyId: channel.companyId,
      channel: "http",
      whatsappId: channel.id,
      remoteJid: number,
      profilePicUrl: "",
      isGroup: false
    } as any
  });

  const updateData: any = {};
  if (contactName && contact.name !== contactName) updateData.name = contactName;
  if (contact.channel !== "http") updateData.channel = "http";
  if (contact.whatsappId !== channel.id) updateData.whatsappId = channel.id;
  if (Object.keys(updateData).length) await contact.update(updateData);

  return contact;
};

export const receiveUniversalMessage = async ({
  channel,
  externalContactId,
  contactName,
  body,
  externalMessageId,
  queueId,
  userId
}: InboundRequest) => {
  if (channel.channel !== "http") {
    throw new AppError("Canal informado nao e HTTP Request.", 400);
  }

  if (!externalContactId || !body) {
    throw new AppError("externalContactId e body sao obrigatorios.", 400);
  }

  const contact = await findOrCreateUniversalContact({ channel, externalContactId, contactName });
  const settings = await CompaniesSettings.findOne({ where: { companyId: channel.companyId } });

  const ticket = await FindOrCreateTicketService(
    contact,
    channel,
    1,
    channel.companyId,
    queueId || null,
    userId || null,
    null,
    "http",
    null,
    false,
    settings,
    false,
    false
  );

  const wid = externalMessageId || `http-in:${channel.id}:${uuidv4()}`;
  const message = await CreateMessageService({
    companyId: channel.companyId,
    messageData: {
      wid,
      ticketId: ticket.id,
      contactId: contact.id,
      body,
      fromMe: false,
      read: false,
      ack: 0,
      mediaType: "chat",
      channel: "http",
      externalMessageId: wid
    }
  });

  await ticket.update({
    lastMessage: body,
    fromMe: false,
    updatedAt: new Date()
  });

  return { ticket, contact, message };
};

const assertSendConfig = (channel: Whatsapp, config: UniversalConfig) => {
  if (channel.channel !== "http") {
    throw new AppError("Canal do ticket nao e HTTP Request.", 400);
  }

  if (!config.baseUrl || !config.sendPath) {
    throw new AppError("Canal HTTP sem URL base ou endpoint de envio configurado.", 400);
  }
};

export const sendUniversalMessage = async ({
  ticket,
  body,
  userId,
  medias = []
}: SendRequest): Promise<Message> => {
  if (ticket.channel !== "http") {
    throw new AppError("Canal do ticket nao e HTTP Request.", 400);
  }

  if (!ticket.whatsapp) {
    throw new AppError("Canal HTTP nao vinculado ao ticket.", 400);
  }

  const config = normalizeConfig(ticket.whatsapp.universalConfig);
  assertSendConfig(ticket.whatsapp as any, config);

  const context = {
    ticket: { id: ticket.id, status: ticket.status },
    contact: {
      id: ticket.contact?.id,
      name: ticket.contact?.name,
      number: ticket.contact?.number,
      externalId: ticket.contact?.number?.replace(`http:${ticket.whatsappId}:`, "")
    },
    message: {
      body,
      mediaCount: medias.length,
      medias: medias.map(media => ({
        filename: media.originalname,
        mimetype: media.mimetype,
        size: media.size
      }))
    },
    credentials: config.credentials || {}
  };

  const renderedBody = renderTemplate(config.bodyTemplate || DEFAULT_BODY_TEMPLATE, context);
  const requestBody = parseRenderedBody(renderedBody, config.contentType);
  const response = await axios({
    method: config.sendMethod || "POST",
    url: buildUrl(config.baseUrl, config.sendPath, config.queryParams || [], context),
    headers: buildHeaders(config, context),
    data: requestBody,
    timeout: config.timeoutMs || 30000,
    validateStatus: status => status >= 200 && status < 500
  });

  if (response.status >= 400) {
    throw new AppError(`Falha no envio HTTP (${response.status}).`, 400);
  }

  const externalId =
    get(response.data, config.responseIdPath || "id") ||
    `http-out:${ticket.whatsappId}:${uuidv4()}`;

  const message = await CreateMessageService({
    companyId: ticket.companyId,
    messageData: {
      wid: String(externalId),
      ticketId: ticket.id,
      contactId: ticket.contactId,
      body: body?.trim() || "",
      fromMe: true,
      read: true,
      ack: 1,
      mediaType: medias.length ? "document" : "chat",
      userId,
      channel: "http",
      externalMessageId: String(externalId),
      emailMeta: {
        httpStatus: response.status,
        response: response.data
      }
    } as any
  });

  await ticket.update({
    lastMessage: body?.trim() || "[HTTP Request]",
    fromMe: true,
    updatedAt: new Date()
  });

  return message;
};

export { DEFAULT_BODY_TEMPLATE, normalizeConfig };
