import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import User from "../../models/User";
import ShowTicketService from "../TicketServices/ShowTicketService";

const MAX_MESSAGES = 30;
const MAX_HISTORY_CHARS = 8000;

interface Request {
  ticketId: string | number;
  companyId: number;
  user: User;
}

export interface TicketCopilotContext {
  ticket: any;
  contact: any;
  queue: any;
  user: any;
  messagesText: string;
  messageCount: number;
  contextChars: number;
  lastInboundMessage: string | null;
}

const canAccessTicket = (ticket: any, user: User): boolean => {
  if (user.profile === "admin" || user.allTicket === "enable") return true;
  if (ticket.isGroup && user.allowGroup) return true;
  if (!ticket.queueId) return true;

  const queueIds = (user.queues || []).map(queue => Number(queue.id));
  return queueIds.includes(Number(ticket.queueId));
};

const formatTags = (tags?: Array<{ name?: string }>): string => {
  if (!Array.isArray(tags) || tags.length === 0) return "sem tags";
  return tags
    .map(tag => tag?.name)
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");
};

const formatMessageBody = (message: Message): string => {
  const mediaType = message.mediaType || "chat";
  const body = (message.body || "").trim();

  if (body) return body;
  if (mediaType && mediaType !== "chat" && mediaType !== "text") {
    return `[midia: ${mediaType}]`;
  }

  return "[mensagem sem texto]";
};

const formatMessageLine = (message: Message): string => {
  const author = message.fromMe
    ? message.isPrivate
      ? "Nota interna"
      : message.fromAgent
        ? "Atendente"
        : "Atendente/Sistema"
    : "Cliente";
  const date = message.createdAt
    ? new Date(message.createdAt).toISOString()
    : "";
  return `${date} - ${author}: ${formatMessageBody(message)}`;
};

const trimHistory = (messages: Message[]): { text: string; chars: number } => {
  const lines: string[] = [];
  let chars = 0;

  for (const message of messages) {
    const line = formatMessageLine(message);
    if (chars + line.length > MAX_HISTORY_CHARS) break;
    lines.push(line);
    chars += line.length;
  }

  return {
    text: lines.join("\n"),
    chars
  };
};

const BuildTicketCopilotContextService = async ({
  ticketId,
  companyId,
  user
}: Request): Promise<TicketCopilotContext> => {
  const ticket = await ShowTicketService(ticketId, companyId);
  const ticketJson = ticket.toJSON ? ticket.toJSON() : ticket;

  if (!canAccessTicket(ticketJson, user)) {
    throw new AppError("Voce nao tem acesso a este atendimento.", 403);
  }

  const messages = await Message.findAll({
    where: {
      ticketId: ticketJson.id,
      companyId,
      isDeleted: false
    },
    attributes: [
      "id",
      "fromMe",
      "body",
      "mediaType",
      "createdAt",
      "isPrivate",
      "fromAgent",
      "userId",
      "contactId",
      "companyId"
    ],
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number"],
        required: false
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"],
        required: false
      }
    ],
    limit: MAX_MESSAGES,
    order: [["createdAt", "DESC"]]
  });

  const orderedMessages = messages.reverse();
  const history = trimHistory(orderedMessages);
  const lastInbound = [...orderedMessages]
    .reverse()
    .find(message => !message.fromMe && (message.body || "").trim());

  return {
    ticket: ticketJson,
    contact: ticketJson.contact || null,
    queue: ticketJson.queue || null,
    user: ticketJson.user || null,
    messagesText: history.text,
    messageCount: orderedMessages.length,
    contextChars: history.chars,
    lastInboundMessage: lastInbound ? formatMessageBody(lastInbound) : null
  };
};

export const buildCopilotContextHeader = (context: TicketCopilotContext): string => {
  const contact = context.contact || {};
  const ticket = context.ticket || {};
  const queue = context.queue || {};
  const assignedUser = context.user || {};
  const lead = ticket.crmLead || null;
  const client = ticket.crmClient || null;

  return [
    `Ticket ID: ${ticket.id}`,
    `Status: ${ticket.status || "indefinido"}`,
    `Canal: ${ticket.channel || "indefinido"}`,
    `Fila: ${queue.name || "sem fila"}`,
    `Atendente: ${assignedUser.name || "sem atendente"}`,
    `Contato: ${contact.name || "sem nome"} (${contact.number || "sem numero"})`,
    `Tags do contato: ${formatTags(contact.tags)}`,
    lead ? `Lead CRM: ${lead.name || lead.id} (status: ${lead.status || lead.leadStatus || "indefinido"})` : null,
    client ? `Cliente CRM: ${client.name || client.id} (status: ${client.status || "indefinido"})` : null,
    context.lastInboundMessage ? `Ultima mensagem do cliente: ${context.lastInboundMessage}` : "Sem mensagem recente do cliente."
  ]
    .filter(Boolean)
    .join("\n");
};

export const getUserWithQueues = async (userId: string | number): Promise<User> => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name"]
      }
    ]
  });

  if (!user) {
    throw new AppError("Usuario nao encontrado.", 404);
  }

  return user;
};

export default BuildTicketCopilotContextService;
