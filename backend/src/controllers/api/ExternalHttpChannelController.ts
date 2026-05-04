import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { getIO } from "../../libs/socket";
import CompaniesSettings from "../../models/CompaniesSettings";
import FindOrCreateTicketService from "../../services/TicketServices/FindOrCreateTicketService";
import {
  findOrCreateUniversalContact,
  normalizeConfig,
  receiveUniversalMessage,
  sendUniversalMessage
} from "../../services/UniversalHttpChannel/UniversalHttpChannelService";

const ensureExternalAuth = (req: Request) => {
  if (!req.externalAuth) {
    throw new AppError("ERR_EXTERNAL_AUTH_REQUIRED", 401);
  }
  return req.externalAuth;
};

const serialize = (channel: Whatsapp) => ({
  id: channel.id,
  name: channel.name,
  status: channel.status,
  channel: channel.channel,
  token: channel.token,
  universalConfig: normalizeConfig(channel.universalConfig),
  createdAt: channel.createdAt,
  updatedAt: channel.updatedAt
});

const findChannel = async (companyId: number, id: number) => {
  const channel = await Whatsapp.findOne({
    where: { id, companyId, channel: "http" }
  });

  if (!channel) {
    throw new AppError("ERR_HTTP_CHANNEL_NOT_FOUND", 404);
  }

  return channel;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const channels = await Whatsapp.findAll({
    where: { companyId, channel: "http" },
    order: [["name", "ASC"]]
  });

  return res.json({ channels: channels.map(serialize) });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const channel = await findChannel(companyId, Number(req.params.id));
  return res.json(serialize(channel));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const { name, universalConfig } = req.body;

  if (!name) {
    throw new AppError("ERR_NAME_REQUIRED", 400);
  }

  const existing = await Whatsapp.findOne({ where: { companyId, channel: "http", name } });
  if (existing) {
    throw new AppError("ERR_HTTP_CHANNEL_NAME_ALREADY_EXISTS", 400);
  }

  const channel = await Whatsapp.create({
    name,
    companyId,
    channel: "http",
    status: "CONNECTED",
    provider: "http",
    isDefault: false,
    allowGroup: false,
    retries: 0,
    universalConfig: normalizeConfig(universalConfig)
  } as any);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
    action: "update",
    whatsapp: channel
  });

  return res.status(201).json(serialize(channel));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const channel = await findChannel(companyId, Number(req.params.id));
  const updateData: any = {};

  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.status !== undefined) updateData.status = req.body.status;
  if (req.body.universalConfig !== undefined) {
    updateData.universalConfig = normalizeConfig(req.body.universalConfig);
  }

  await channel.update(updateData);
  return res.json(serialize(channel));
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const channel = await findChannel(companyId, Number(req.params.id));
  await channel.destroy();
  return res.json({ message: "Canal HTTP Request removido com sucesso" });
};

export const status = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const channel = await findChannel(companyId, Number(req.params.id));
  return res.json({
    id: channel.id,
    name: channel.name,
    channel: channel.channel,
    status: channel.status,
    configured: Boolean(channel.universalConfig?.baseUrl && channel.universalConfig?.sendPath)
  });
};

export const inbound = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const channel = await findChannel(companyId, Number(req.params.id));
  const { externalContactId, contactId, contactName, name, body, message, externalMessageId, queueId, userId } = req.body;

  const result = await receiveUniversalMessage({
    channel,
    externalContactId: externalContactId || contactId,
    contactName: contactName || name,
    body: body || message,
    externalMessageId,
    queueId,
    userId
  });

  return res.status(201).json({
    status: "SUCCESS",
    ticketId: result.ticket.id,
    contactId: result.contact.id,
    messageId: result.message.id
  });
};

export const send = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const channel = await findChannel(companyId, Number(req.params.id));
  const { ticketId, externalContactId, contactName, body, message, queueId, userId } = req.body;

  if (!body && !message) {
    throw new AppError("body e obrigatorio.", 400);
  }

  let ticket: Ticket | null = null;
  if (ticketId) {
    ticket = await Ticket.findOne({
      where: { id: Number(ticketId), companyId, whatsappId: channel.id, channel: "http" },
      include: [Contact, { model: Whatsapp, as: "whatsapp" }]
    });
  } else if (externalContactId) {
    const contact = await findOrCreateUniversalContact({
      channel,
      externalContactId,
      contactName
    });
    const settings = await CompaniesSettings.findOne({ where: { companyId } });
    const createdTicket = await FindOrCreateTicketService(
      contact,
      channel,
      0,
      companyId,
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
    ticket = await Ticket.findByPk(createdTicket.id, {
      include: [Contact, { model: Whatsapp, as: "whatsapp" }]
    });
  }

  if (!ticket) {
    throw new AppError("ticketId ou externalContactId valido e obrigatorio.", 400);
  }

  const sent = await sendUniversalMessage({
    ticket,
    body: body || message,
    userId
  });

  return res.status(201).json({
    status: "SUCCESS",
    ticketId: ticket.id,
    messageId: sent.id,
    externalMessageId: sent.externalMessageId || sent.wid
  });
};
