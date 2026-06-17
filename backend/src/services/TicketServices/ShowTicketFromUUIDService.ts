import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Tag from "../../models/Tag";
import Whatsapp from "../../models/Whatsapp";
import Company from "../../models/Company";
import QueueIntegrations from "../../models/QueueIntegrations";
import logger from "../../utils/logger";
import { isValidTicketUuid } from "../../helpers/ticketIdentifier";

const ShowTicketUUIDService = async (uuid: string,
  companyId: number): Promise<Ticket> => {
  // Valida o uuid ANTES de consultar o banco. Valores como "undefined"/"null"/
  // formato invalido geravam erro 22P02 (invalid input syntax for type uuid) -> 500.
  if (!isValidTicketUuid(uuid)) {
    logger.warn(
      { companyId, param: String(uuid ?? ""), route: "GET /tickets/u/:uuid" },
      "[Tickets] invalid ticket identifier"
    );
    throw new AppError("ERR_INVALID_TICKET_IDENTIFIER", 400);
  }

  const ticket = await Ticket.findOne({
    where: {
      uuid,
      companyId
    },
    attributes: [
      "id",
      "uuid",
      "queueId",
      "isGroup",
      "channel",
      "status",
      "contactId",
      "useIntegration",
      "lastMessage",
      "updatedAt",
      "unreadMessages",
      "companyId",
      "whatsappId",
      "imported",
      "lgpdAcceptedAt",
      "amountUsedBotQueues",
      "useIntegration",
      "integrationId",
      "userId",
      "amountUsedBotQueuesNPS",
      "lgpdSendMessageAt",
      "isBot"
    ],
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "email", "profilePicUrl", "acceptAudioMessage", "active", "disableBot", "urlPicture", "companyId"],
        include: ["extraInfo", "tags",
          {
            association: "wallets",
            attributes: ["id", "name"]
          }]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name", "groupAsTicket", "greetingMediaAttachment", "facebookUserToken", "facebookUserId", "notificameHub"]
      },
      {
        model: Company,
        as: "company",
        attributes: ["id", "name"]
      },
      {
        model: QueueIntegrations,
        as: "queueIntegration",
        attributes: ["id", "name"]
      }
    ]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  return ticket;
};

export default ShowTicketUUIDService;
