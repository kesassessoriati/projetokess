import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Plan from "../../models/Plan";
import Tag from "../../models/Tag";
import Whatsapp from "../../models/Whatsapp";
import Company from "../../models/Company";
import QueueIntegrations from "../../models/QueueIntegrations";
import TicketTag from "../../models/TicketTag";
import CrmLead from "../../models/CrmLead";
import CrmClient from "../../models/CrmClient";
import logger from "../../utils/logger";
import { parseTicketNumericId } from "../../helpers/ticketIdentifier";

const ShowTicketService = async (
  id: string | number,
  companyId: number
): Promise<Ticket> => {
  // Valida o identificador ANTES de consultar o banco. A coluna "id" e inteira;
  // valores como "undefined"/"null"/string nao-numerica geravam erro 22P02 -> 500.
  const numericId = parseTicketNumericId(id);
  if (numericId === null) {
    logger.warn(
      { companyId, param: String(id ?? ""), route: "GET/PUT /tickets/:ticketId" },
      "[Tickets] invalid ticket identifier"
    );
    throw new AppError("ERR_INVALID_TICKET_IDENTIFIER", 400);
  }

  // Buscando o ticket com a inclusão do modelo do WhatsApp
  // @ts-ignore
  const ticket = await Ticket.findOne({
    where: {
      id: numericId,
      companyId
    },
    attributes: [
      "id",
      "uuid",
      "queueId",
      "lastFlowId",
      "flowStopped",
      "dataWebhook",
      "flowWebhook",
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
      "isBot",
      "typebotSessionId",
      "typebotStatus",
      "sendInactiveMessage",
      "queueId",
      "fromMe",
      "isOutOfHour",
      "isActiveDemand",
      "typebotSessionTime",
      "webhookPausedUntil",
      "webhookDisabled",
      "crmLeadId",
      "crmClientId",
      "leadValue"
    ],
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: [
          "id",
          "companyId",
          "name",
          "number",
          "email",
          "profilePicUrl",
          "acceptAudioMessage",
          "active",
          "disableBot",
          "remoteJid",
          "urlPicture",
          "lgpdAcceptedAt",
          "cpfCnpj",
          "address",
          "birthday",
          "anniversary"
        ],
        include: [
          "extraInfo",
          "tags",
          {
            association: "wallets",
            attributes: ["id", "name"]
          }
        ]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"],
        include: ["chatbots"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color", "kanban"]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: [
          "id",
          "name",
          "groupAsTicket",
          "greetingMediaAttachment",
          "facebookUserToken",
          "facebookUserId",
          "status",
          "wavoip",
          "channel",
          "companyId",
          "coexistencePhoneNumberId",
          "coexistenceWabaId",
          "coexistencePermanentToken"
        ]
      },
      {
        model: Company,
        as: "company",
        attributes: ["id", "name"],
        include: [
          {
            model: Plan,
            as: "plan",
            attributes: ["id", "name", "useKanban"]
          }
        ]
      },
      {
        model: QueueIntegrations,
        as: "queueIntegration",
        attributes: ["id", "name"]
      },
      {
        model: TicketTag,
        as: "ticketTags",
        attributes: ["tagId"]
      },
      {
        model: CrmLead,
        as: "crmLead",
        attributes: [
          "id",
          "name",
          "email",
          "phone",
          "leadStatus",
          "status",
          "convertedClientId"
        ]
      },
      {
        model: CrmClient,
        as: "crmClient",
        attributes: [
          "id",
          "name",
          "document",
          "email",
          "phone",
          "status",
          "contactId"
        ]
      }
    ]
  });

  // Validando se o ticket foi encontrado (404 controlado para id valido inexistente).
  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // Validando se a consulta é para a empresa certa
  if (ticket.companyId !== companyId) {
    throw new AppError("Não é possível consultar registros de outra empresa");
  }

  // Exibindo dados do WhatsApp
  if (ticket?.whatsapp) {
    // Acessando o wavoip do WhatsApp associado ao ticket
    console.log("Whatsapp wavoip:", ticket.whatsapp.wavoip);
  } else {
    console.log("Whatsapp não encontrado.");
  }

  // Garantir que campos críticos nunca sejam null (compatibilidade com frontend)
  const ticketJSON = ticket.toJSON() as any;
  
  // Se user for null, criar objeto placeholder
  if (!ticketJSON.user) {
    ticketJSON.user = { id: null, name: "Sem usuário" };
  }
  
  // Se queue for null, criar objeto placeholder
  if (!ticketJSON.queue) {
    ticketJSON.queue = { id: null, name: "Sem fila", color: "#999", chatbots: [] };
  }
  
  // Se contact for null, criar objeto placeholder completo
  if (!ticketJSON.contact) {
    ticketJSON.contact = { 
      id: null, 
      name: "Contato removido",
      number: "",
      email: null,
      profilePicUrl: null,
      acceptAudioMessage: false,
      active: true,
      disableBot: false,
      remoteJid: null,
      urlPicture: null,
      lgpdAcceptedAt: null,
      extraInfo: [],
      tags: [],
      wallets: []
    };
  } else {
    // Garantir que arrays dentro de contact existam
    if (!ticketJSON.contact.extraInfo) ticketJSON.contact.extraInfo = [];
    if (!ticketJSON.contact.tags) ticketJSON.contact.tags = [];
    if (!ticketJSON.contact.wallets) ticketJSON.contact.wallets = [];
  }
  
  // Garantir que tags seja sempre um array e filtrar nulls
  if (!ticketJSON.tags || !Array.isArray(ticketJSON.tags)) {
    ticketJSON.tags = [];
  } else {
    // Filtrar tags nulas ou inválidas e garantir que tenham os campos necessários
    ticketJSON.tags = ticketJSON.tags
      .filter((tag: any) => tag && tag.name)
      .map((tag: any) => ({
        id: tag.id || null,
        name: tag.name || "Tag sem nome",
        color: tag.color || "#999999"
      }));
  }
  
  // Garantir que whatsapp não seja null
  if (!ticketJSON.whatsapp) {
    ticketJSON.whatsapp = { 
      id: null, 
      name: "WhatsApp desconectado",
      groupAsTicket: null,
      greetingMediaAttachment: null,
      facebookUserToken: null,
      facebookUserId: null,
      status: "DISCONNECTED",
      wavoip: null
    };
  }
  
  // Garantir que company e plan existam
  if (!ticketJSON.company) {
    ticketJSON.company = { 
      id: companyId, 
      name: "Empresa",
      plan: { id: null, name: "Plano", useKanban: false }
    };
  } else if (!ticketJSON.company.plan) {
    ticketJSON.company.plan = { id: null, name: "Plano", useKanban: false };
  }
  
  // Garantir que queueIntegration exista
  if (!ticketJSON.queueIntegration) {
    ticketJSON.queueIntegration = null;
  }
  
  // Garantir que ticketTags seja um array
  if (!ticketJSON.ticketTags || !Array.isArray(ticketJSON.ticketTags)) {
    ticketJSON.ticketTags = [];
  }

  // Criar um novo objeto ticket com os dados seguros
  const safeTicket = Object.create(ticket);
  safeTicket.toJSON = function() {
    return ticketJSON;
  };

  return safeTicket;
};

export default ShowTicketService;
