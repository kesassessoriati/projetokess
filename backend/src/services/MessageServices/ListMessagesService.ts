import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { Op } from "sequelize";
import { intersection } from "lodash";
import User from "../../models/User";
import isQueueIdHistoryBlocked from "../UserServices/isQueueIdHistoryBlocked";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";

// Identificador de ticket pode chegar como id numerico ou uuid.
// Precisamos rejeitar valores invalidos ANTES de consultar o banco para
// nao deixar o Postgres tentar converter strings como "undefined" em uuid
// (erro 22P02 -> 500). Aceita apenas uuid v1-v5 canonico.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Request {
  ticketId: string;
  companyId: number;
  pageNumber?: string;
  queues?: number[];
  user?: User;
}

interface Response {
  messages: Message[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId,
  companyId,
  queues = [],
  user
}: Request): Promise<Response> => {


  const sanitizedTicketId = String(ticketId ?? "").trim();
  const isNumericId =
    sanitizedTicketId !== "" && !isNaN(Number(sanitizedTicketId));

  // Bloqueia undefined/null/vazio e strings que nao sao nem id numerico
  // nem uuid valido — evita SELECT com uuid invalido (22P02 -> 500).
  if (!isNumericId && !UUID_REGEX.test(sanitizedTicketId)) {
    logger.warn(
      {
        companyId,
        userId: user?.id,
        param: sanitizedTicketId || "(empty)",
        route: "GET /messages/:ticketId"
      },
      "[Messages] invalid ticket identifier"
    );
    throw new AppError("ERR_INVALID_TICKET_IDENTIFIER", 400);
  }

  // Busca por id numerico OU por uuid, conforme o formato recebido.
  const ticket = await Ticket.findOne({
    where: {
      ...(isNumericId
        ? { id: Number(sanitizedTicketId) }
        : { uuid: sanitizedTicketId }),
      companyId
    }
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const ticketsFilter: any[] | null = [];

  const isAllHistoricEnabled = await isQueueIdHistoryBlocked({ userRequest: user.id });

  let ticketIds = [];
  if (!isAllHistoricEnabled) {
    ticketIds = await Ticket.findAll({
      where:
      {
        id: { [Op.lte]: ticket.id },
        companyId: ticket.companyId,
        contactId: ticket.contactId,
        whatsappId: ticket.whatsappId,
        isGroup: ticket.isGroup,
        queueId: user.profile === "admin" || user.allTicket === "enable" || (ticket.isGroup && user.allowGroup) ?
          {
            [Op.or]: [queues, null]
          } :
          { [Op.in]: queues },
      },
      attributes: ["id"]
    });
  } else {
    ticketIds = await Ticket.findAll({
      where:
      {
        id: { [Op.lte]: ticket.id },
        companyId: ticket.companyId,
        contactId: ticket.contactId,
        whatsappId: ticket.whatsappId,
        isGroup: ticket.isGroup
      },
      attributes: ["id"]
    });
  }

  if (ticketIds) {
    ticketsFilter.push(ticketIds.map(t => t.id));
  }
  // }

  const tickets: number[] = intersection(...ticketsFilter);

  if (!tickets) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // await setMessagesAsRead(ticket);
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: messages } = await Message.findAndCountAll({
    where: { ticketId: tickets, companyId },
    attributes: ["id", "fromMe", "mediaUrl", "body", "mediaType", "dataJson", "ack", "createdAt", "ticketId", "isDeleted", "queueId", "isForwarded", "isEdited", "isPrivate", "companyId", "fromAgent", "userId", "contactId", "participant"],
    limit,
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number"],
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"],
        required: false
      },
      {
        model: Message,
        attributes: ["id", "fromMe", "mediaUrl", "body", "mediaType", "companyId", "fromAgent", "userId", "contactId", "participant"],
        as: "quotedMsg",
        include: [
          {
            model: Contact,
            as: "contact",
            attributes: ["id", "name", "number"],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name"],
            required: false
          }
        ],
        required: false
      },
      {
        model: Ticket,
        required: true,
        attributes: ["id", "whatsappId", "queueId"],
        include: [
          {
            model: Queue,
            as: "queue",
            attributes: ["id", "name", "color"]
          }
        ],
      }
    ],
    distinct: true,
    offset,
    subQuery: false,
    order: [["createdAt", "DESC"]] 
  });

  const hasMore = count > offset + messages.length;

  return {
    messages: messages.reverse(),
    ticket,
    count,
    hasMore
  };
};

export default ListMessagesService;
