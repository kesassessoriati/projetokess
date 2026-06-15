import { Op } from "sequelize";
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

// ── Fase 2 CRM: placeholders de TEXTO enviados pelo celular ───────────────────
// Diagnóstico (reprodução ao vivo 15/06): para mensagens de texto enviadas pelo
// celular, a InfiniteAPI não decifra a cópia companion (enc type='msg' LID→LID) e
// o PDO resend não devolve o conteúdo real. Áudio/imagem reconciliam normalmente.
const COMPANION_TEXT_PLACEHOLDER_TIMEOUT_MINUTES = 3;
const COMPANION_RECONCILE_WINDOW_MINUTES = 5;
const COMPANION_RELABEL_TEXT = "✓ Mensagem enviada pelo celular";

const parseMeta = (msg: Message): any => {
  try {
    return JSON.parse(msg.dataJson || "{}");
  } catch {
    return {};
  }
};

// Include mínimo reutilizado para emitir update de socket consistente com a UI.
const messageEmitInclude = (): any[] => [
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
];

const emitMessageUpdate = async (messageId: number, companyId: number): Promise<void> => {
  const fresh = await Message.findOne({
    where: { id: messageId, companyId },
    include: messageEmitInclude()
  });
  if (!fresh) return;
  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
    action: "update",
    message: fresh,
    ticket: (fresh as any).ticket,
    contact: (fresh as any).ticket?.contact
  });
};

// Parte A+B: relabel honesto de placeholders de texto presos (sem conteúdo real)
// após a janela de timeout. Oportunista: roda quando chega nova mensagem no ticket.
// NÃO apaga registro, NÃO altera fromMe/ticketId/contactId/companyId, NÃO toca mídia.
const relabelStuckTextPlaceholders = async (
  companyId: number,
  ticketId: number,
  excludeMessageId?: number
): Promise<void> => {
  if (!companyId || !ticketId) return;
  const cutoff = new Date(
    Date.now() - COMPANION_TEXT_PLACEHOLDER_TIMEOUT_MINUTES * 60 * 1000
  );

  const candidates = await Message.findAll({
    where: {
      companyId,
      ticketId,
      fromMe: true,
      mediaType: "chat",
      createdAt: { [Op.lte]: cutoff },
      body: { [Op.like]: "%aguardando sincroniza%" },
      ...(excludeMessageId ? { id: { [Op.ne]: excludeMessageId } } : {})
    }
  });

  for (const ph of candidates) {
    if (!isCompanionSyncPlaceholder(ph)) continue;
    const meta = parseMeta(ph);
    if (meta.companionSyncFallbackTimedOut === true) continue;

    const ageMinutes = Math.round(
      (Date.now() - new Date(ph.createdAt).getTime()) / 60000
    );

    await ph.update({
      body: COMPANION_RELABEL_TEXT,
      dataJson: JSON.stringify({
        ...meta,
        companionSyncFallbackTimedOut: true,
        realTextUnavailable: true,
        timeoutReason: "pdo_text_content_not_returned"
      })
    });

    logger.info(
      `[CompanionSync Timeout] text placeholder expired without real content ` +
      `companyId=${companyId} ticketId=${ticketId} messageId=${ph.id} ` +
      `wid=${maskDiagValue(ph.wid)} ageMinutes=${ageMinutes} mediaType=chat ` +
      `reason=pdo_text_content_not_returned`
    );

    try {
      await emitMessageUpdate(ph.id, companyId);
    } catch (err: any) {
      logger.warn(`[CompanionSync Timeout] socket emit falhou: ${err?.message}`);
    }
  }
};

// Parte C: reconciliação defensiva por janela. Se um dia chegar o texto real com
// wid DIFERENTE, casa com 1 placeholder compatível (conservador) em vez de duplicar.
// Retorna a mensagem reconciliada ou null (segue criação normal).
const tryReconcileTextByWindow = async (
  messageData: MessageData,
  companyId: number
): Promise<Message | null> => {
  if (!messageData.fromMe) return null;
  const mediaType = messageData.mediaType || "chat";
  if (mediaType !== "chat") return null;
  if (!messageData.body || isPlaceholderBody(messageData.body)) return null;
  if (!messageData.ticketId && !messageData.contactId) return null;

  const windowMs = COMPANION_RECONCILE_WINDOW_MINUTES * 60 * 1000;
  const now = Date.now();

  const where: any = {
    companyId,
    fromMe: true,
    mediaType: "chat",
    createdAt: {
      [Op.between]: [new Date(now - windowMs), new Date(now + windowMs)]
    }
  };
  if (messageData.ticketId) {
    where.ticketId = messageData.ticketId;
  } else {
    where.contactId = messageData.contactId;
  }

  const candidates = (await Message.findAll({ where })).filter(m => {
    if (!isCompanionSyncPlaceholder(m)) return false;
    const meta = parseMeta(m);
    return isPlaceholderBody(m.body) || meta.companionSyncFallbackTimedOut === true;
  });

  if (candidates.length === 0) return null;

  if (candidates.length > 1) {
    logger.info(
      `[CompanionSync Recovery][window.multiple_candidates] companyId=${companyId} ` +
      `ticketId=${messageData.ticketId} count=${candidates.length} decision=skip-create-normal`
    );
    return null;
  }

  const ph = candidates[0];
  const meta = parseMeta(ph);

  await ph.update({
    wid: messageData.wid,
    body: messageData.body,
    ack: messageData.ack || ph.ack,
    dataJson: JSON.stringify({
      ...meta,
      companionSyncFallbackTimedOut: false,
      companionSyncReconciledByWindow: true
    })
  });

  logger.info(
    `[CompanionSync Recovery][window.reconciled] companyId=${companyId} ` +
    `ticketId=${ph.ticketId} messageId=${ph.id} newWid=${maskDiagValue(messageData.wid)} ` +
    `newBodyLen=${messageData.body.length} decision=update-placeholder`
  );

  const reconciled = await Message.findOne({
    where: { id: ph.id, companyId },
    include: messageEmitInclude()
  });
  try {
    await emitMessageUpdate(ph.id, companyId);
  } catch (err: any) {
    logger.warn(`[CompanionSync Recovery][window.reconciled] socket emit falhou: ${err?.message}`);
  }
  return reconciled || ph;
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

  // Parte C: texto real pode chegar com wid DIFERENTE do placeholder. Antes de criar
  // uma mensagem nova, tentar reconciliar com um placeholder compatível na janela.
  const windowReconciled = await tryReconcileTextByWindow(messageData, companyId);
  if (windowReconciled) {
    return windowReconciled;
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

  // Parte A+B: ao chegar nova mensagem no ticket, relabela placeholders de texto
  // presos há mais de N min (conteúdo real nunca chegou). Oportunista e leve.
  try {
    if (message?.ticketId && !isCompanionSyncPlaceholder(message)) {
      await relabelStuckTextPlaceholders(companyId, message.ticketId, message.id);
    }
  } catch (err: any) {
    logger.warn(`[CompanionSync Timeout] relabel oportunista falhou: ${err?.message}`);
  }

  return message;
};

export default CreateMessageService;
