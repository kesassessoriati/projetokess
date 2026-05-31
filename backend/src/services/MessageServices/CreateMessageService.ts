import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import { sendMessageNotification } from "../../controllers/MobileWebhookController";
import logger from "../../utils/logger";

export interface MessageData {
  wid: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  ack?: number;
  queueId?: number;
  channel?: string;
  ticketTrakingId?: number;
  isPrivate?: boolean;
  ticketImported?: any;
  isForwarded?: boolean;
  fromAgent?: boolean;
  userId?: number;
  externalMessageId?: string;
  inReplyTo?: string;
  threadId?: string;
  emailFrom?: string;
  emailTo?: string;
  emailSubject?: string;
  emailStatus?: string;
  emailMeta?: any;
}
interface Request {
  messageData: MessageData;
  companyId: number;
}

const shouldLogOwnDeviceSyncDiag = (): boolean =>
  String(process.env.OWN_DEVICE_SYNC_DIAG || "").toLowerCase() === "enabled";

const maskDiagValue = (value?: any): any => {
  if (value === undefined || value === null || value === "") return value;
  const text = String(value);

  if (text.length > 16) {
    return `${text.slice(0, 6)}...${text.slice(-4)}`;
  }

  return text;
};

const logOwnDeviceSyncDiag = (
  stage: string,
  companyId: number,
  extra: Record<string, any> = {}
) => {
  if (!shouldLogOwnDeviceSyncDiag()) return;

  logger.info(
    {
      stage,
      companyId,
      ...extra
    },
    "[OWN-DEVICE-SYNC-DIAG] message persistence metadata"
  );
};

const CreateMessageService = async ({
  messageData,
  companyId,
}: Request): Promise<Message> => {
  // Verifica se já existe uma mensagem com o mesmo wid e ticketId
  const existingMessage = await Message.findOne({
    where: {
      wid: messageData.wid,
      companyId,
    },
  });

  if (existingMessage) {
    logOwnDeviceSyncDiag("CreateMessageService.dedupe-existing", companyId, {
      wid: maskDiagValue(messageData.wid),
      messageId: existingMessage.id,
      ticketId: existingMessage.ticketId,
      contactId: existingMessage.contactId,
      fromMe: existingMessage.fromMe
    });
    console.log("Mensagem já existe. Ignorando criação.");
    return existingMessage;
  }

  // Se não houver mensagem existente, cria ou atualiza a mensagem
  await Message.upsert({ ...messageData, companyId });

  const message = await Message.findOne({
    where: {
      wid: messageData.wid,
      companyId,
    },
    include: [
      "contact",
      {
        model: Ticket,
        as: "ticket",
        include: [
          {
            model: Contact,
            attributes: [
              "id",
              "name",
              "number",
              "email",
              "profilePicUrl",
              "acceptAudioMessage",
              "active",
              "urlPicture",
              "companyId",
            ],
            include: ["extraInfo", "tags"],
          },
          {
            model: Queue,
            attributes: ["id", "name", "color"],
          },
          {
            model: Whatsapp,
            attributes: ["id", "name", "groupAsTicket"],
          },
          {
            model: User,
            attributes: ["id", "name"],
          },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "color"],
          },
        ],
      },
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"],
      },
    ],
  });

  if (message.ticket.queueId !== null && message.queueId === null) {
    await message.update({ queueId: message.ticket.queueId });
  }

  if (message.isPrivate) {
    await message.update({ wid: `PVT${message.id}` });
  }

  if (!message) {
    throw new Error("ERR_CREATING_MESSAGE");
  }

  const io = getIO();

  if (!messageData?.ticketImported) {
    io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
      action: "create",
      message,
      ticket: message.ticket,
      contact: message.ticket.contact,
    });
    logOwnDeviceSyncDiag("CreateMessageService.appMessage-emitted", companyId, {
      wid: maskDiagValue(message?.wid),
      messageId: message?.id,
      ticketId: message?.ticketId,
      contactId: message?.contactId,
      fromMe: message?.fromMe,
      fromAgent: message?.fromAgent,
      whatsappId: message?.ticket?.whatsappId
    });

    // Enviar notificação mobile apenas para mensagens não enviadas por mim (!fromMe)
    if (!message.fromMe) {
      try {
        await sendMessageNotification(
          {
            id: message.id,
            body: message.body,
            ticketId: message.ticketId,
            contactId: message.contactId,
            fromMe: message.fromMe,
            queueId: message.queueId,
            contact: message.ticket.contact
          },
          companyId,
          message.ticket.userId // Filtrar apenas para o usuário responsável pelo ticket
        );
      } catch (error) {
        console.error("Erro ao enviar notificação mobile:", error);
      }
    }
  }

  return message;
};

export default CreateMessageService;
