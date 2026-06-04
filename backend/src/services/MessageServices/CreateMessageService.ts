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

const COMPANION_FALLBACK_BODIES = [
  "enviada pelo celular",
  "aguardando sincronização"
];

const isCompanionSyncPlaceholder = (msg: Message): boolean => {
  try {
    const meta = JSON.parse(msg.dataJson || "{}");
    return meta?.companionSyncFallback === true;
  } catch {
    return false;
  }
};

const isPlaceholderBody = (body: string): boolean =>
  COMPANION_FALLBACK_BODIES.some(token => body?.includes(token));

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
    const isPlaceholder = isCompanionSyncPlaceholder(existingMessage);
    const incomingBodyLen = messageData.body?.length ?? 0;
    const incomingIsReal = messageData.body ? !isPlaceholderBody(messageData.body) : false;
    logger.info(
      `[CompanionSync Recovery][create.existing] companyId=${companyId} ` +
      `existingId=${existingMessage.id} ticketId=${existingMessage.ticketId} ` +
      `isPlaceholder=${isPlaceholder} incomingBodyLen=${incomingBodyLen} incomingIsReal=${incomingIsReal} ` +
      `mediaType=${messageData.mediaType || "none"}`
    );

    // Companion sync retry: placeholder criado pelo fallback + conteúdo real chegou via pkmsg/PDO
    if (
      isPlaceholder &&
      messageData.body &&
      incomingIsReal
    ) {
      const incomingDataJson = (messageData as any).dataJson;
      await existingMessage.update({
        body: messageData.body,
        mediaType: messageData.mediaType || existingMessage.mediaType,
        ...(messageData.mediaUrl ? { mediaUrl: messageData.mediaUrl } : {}),
        ...(incomingDataJson ? { dataJson: incomingDataJson } : {}),
        ack: messageData.ack || existingMessage.ack
      });

      await existingMessage.reload({
        include: [
          "contact",
          {
            model: Ticket,
            as: "ticket",
            include: [
              {
                model: Contact,
                attributes: [
                  "id", "name", "number", "email", "profilePicUrl",
                  "acceptAudioMessage", "active", "urlPicture", "companyId"
                ],
                include: ["extraInfo", "tags"]
              },
              { model: Queue, attributes: ["id", "name", "color"] },
              { model: Whatsapp, attributes: ["id", "name", "groupAsTicket"] },
              { model: User, attributes: ["id", "name"] },
              { model: Tag, as: "tags", attributes: ["id", "name", "color"] }
            ]
          },
          { model: Message, as: "quotedMsg", include: ["contact"] }
        ]
      });

      const io = getIO();
      io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
        action: "update",
        message: existingMessage,
        ticket: existingMessage.ticket,
        contact: existingMessage.ticket?.contact
      });

      logger.info(
        `[CompanionSync Recovery][placeholder.updated] companyId=${companyId} ticketId=${existingMessage.ticketId} ` +
        `newBodyLen=${messageData.body?.length ?? 0} mediaType=${messageData.mediaType || "none"}`
      );
      return existingMessage;
    }

    logger.info(
      `[CompanionSync Recovery][placeholder.not_updated] companyId=${companyId} ` +
      `reason=${!isPlaceholder ? "not-a-placeholder" : !messageData.body ? "no-body" : !incomingIsReal ? "body-is-placeholder" : "unknown"}`
    );
    logOwnDeviceSyncDiag("CreateMessageService.dedupe-existing", companyId, {
      wid: maskDiagValue(messageData.wid),
      messageId: existingMessage.id,
      ticketId: existingMessage.ticketId,
      contactId: existingMessage.contactId,
      fromMe: existingMessage.fromMe
    });
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
