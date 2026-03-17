import fs from "fs";
import path from "path";
import Mustache from "mustache";
import { Job } from "bull";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import ScheduledDispatchLog from "../../models/ScheduledDispatchLog";
import ScheduledDispatcher from "../../models/ScheduledDispatcher";
import Ticket from "../../models/Ticket";
import Company from "../../models/Company";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import { getMessageOptions } from "../WbotServices/SendWhatsAppMedia";
import { getWbot } from "../../libs/wbot";
import formatBody from "../../helpers/Mustache";
import { DispatchJobData, processDispatchQueue } from "../../queues/dispatchQueue";
import logger from "../../utils/logger";

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

const ensureTicket = async (
  contact: Contact,
  whatsapp: Whatsapp,
  companyId: number
): Promise<Ticket> => {
  return FindOrCreateTicketService(
    contact,
    whatsapp,
    0,
    companyId,
    null,
    null,
    undefined,
    undefined,
    false
  );
};

const renderMessage = (
  template: string,
  variables: Record<string, any>,
  ticket: Ticket
) => {
  const filledTemplate = Mustache.render(template, variables || {});
  return formatBody(filledTemplate, ticket);
};

const getContactNumber = (contact: Contact, ticket: Ticket): string => {
  if (contact.remoteJid && contact.remoteJid.includes("@")) {
    return contact.remoteJid;
  }
  return `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
};

const sendDispatchMedia = async (
  ticket: Ticket,
  contact: Contact,
  mediaUrl: string,
  caption: string
): Promise<void> => {
  const fullPath = path.resolve(publicFolder, mediaUrl);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Arquivo de midia nao encontrado: ${fullPath}`);
  }

  const fileName = path.basename(fullPath);
  const companyId = ticket.companyId.toString();

  const options = await getMessageOptions(fileName, fullPath, companyId, caption);
  if (!options) {
    throw new Error(`Nao foi possivel processar midia: ${mediaUrl}`);
  }

  const wbot = await getWbot(ticket.whatsappId);
  const number = getContactNumber(contact, ticket);

  await wbot.sendMessage(number, options);

  const lastMessage = caption || fileName;
  await ticket.update({ lastMessage, imported: null });
};

export const executeScheduledDispatchDelivery = async ({
  contact,
  whatsapp,
  companyId,
  template,
  variables = {},
  mediaUrl = null,
  mediaCaption = null
}: {
  contact: Contact;
  whatsapp: Whatsapp;
  companyId: number;
  template: string;
  variables?: Record<string, any>;
  mediaUrl?: string | null;
  mediaCaption?: string | null;
}) => {
  const ticket = await ensureTicket(contact, whatsapp, companyId);

  if (mediaUrl) {
    if (template && template.trim()) {
      const message = renderMessage(template, variables, ticket);
      if (message && message.trim()) {
        await SendWhatsAppMessage({ body: message, ticket });
      }
    }

    const renderedCaption = mediaCaption
      ? Mustache.render(mediaCaption, variables || {})
      : "";

    await sendDispatchMedia(ticket, contact, mediaUrl, renderedCaption);
    return { ticket };
  }

  const message = renderMessage(template, variables, ticket);
  if (!message || !message.trim()) {
    throw new Error("Template de mensagem vazio apos renderizacao");
  }

  await SendWhatsAppMessage({ body: message, ticket });
  return { ticket };
};

const handleDispatchJob = async (job: Job<DispatchJobData>) => {
  const {
    logId,
    dispatcherId,
    companyId,
    contactId,
    whatsappId,
    template,
    variables,
    mediaUrl,
    mediaCaption
  } = job.data;

  const log = await ScheduledDispatchLog.findByPk(logId);
  if (!log) {
    logger.warn(`[DispatchQueue] Log ${logId} nao encontrado, ignorando job`);
    return;
  }

  try {
    const dispatcher = await ScheduledDispatcher.findByPk(dispatcherId);
    if (!dispatcher) {
      throw new Error(`Dispatcher ${dispatcherId} nao encontrado`);
    }

    const contact = await Contact.findByPk(contactId, {
      include: [Company]
    });
    if (!contact) {
      throw new Error(`Contato ${contactId} nao encontrado`);
    }

    if (!contact.number) {
      throw new Error(`Contato ${contactId} sem numero valido`);
    }

    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp) {
      throw new Error(`WhatsApp ${whatsappId} nao encontrado`);
    }

    const { ticket } = await executeScheduledDispatchDelivery({
      contact,
      whatsapp,
      companyId,
      template,
      variables,
      mediaUrl,
      mediaCaption
    });

    await log.update({
      status: "sent",
      ticketId: ticket.id,
      sentAt: new Date(),
      errorMessage: null
    });
  } catch (err: any) {
    const errorMessage = err?.message || JSON.stringify(err);
    await log.update({
      status: "error",
      errorMessage
    });
    logger.error(`[DispatchQueue] Falha no job ${job.id}: ${errorMessage}`);
    throw err;
  }
};

const startDispatchProcessor = () => {
  processDispatchQueue(handleDispatchJob);
  logger.info("[DispatchQueue] Processor iniciado");
};

export default startDispatchProcessor;
