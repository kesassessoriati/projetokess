import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import CompaniesSettings from "../../models/CompaniesSettings";
import InternalMessageSyncEvent from "../../models/InternalMessageSyncEvent";
import InternalSyncRoute from "../../models/InternalSyncRoute";
import InternalSyncPeer from "../../models/InternalSyncPeer";
import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import { getInternalMessageSyncServerId } from "./featureFlags";
import { InternalMessageSyncPayload } from "./types";
import {
  buildPayloadHash,
  isDirectionAllowed,
  isMessageTypeAllowed,
  jidMatches,
  normalizeDigits
} from "./utils";

const isUnsupportedJid = (jid?: string): boolean =>
  Boolean(
    jid &&
      (jid.includes("@g.us") ||
        jid === "status@broadcast" ||
        jid.includes("broadcast"))
  );

const validatePayload = (payload: InternalMessageSyncPayload): void => {
  if (
    !payload ||
    payload.event !== "message.sent.fallback" ||
    payload.version !== 1
  ) {
    throw new AppError("ERR_INTERNAL_SYNC_PAYLOAD_INVALID", 400);
  }

  if (
    !payload.source?.serverId ||
    !payload.target?.serverId ||
    !payload.message?.wid
  ) {
    throw new AppError("ERR_INTERNAL_SYNC_PAYLOAD_REQUIRED_FIELDS", 400);
  }

  if (
    !payload.source.companyId ||
    !payload.source.whatsappId ||
    !payload.target.companyId ||
    !payload.target.whatsappId
  ) {
    throw new AppError("ERR_INTERNAL_SYNC_PAYLOAD_SCOPE_REQUIRED", 400);
  }
};

const ReceiveInternalMessageSyncService = async ({
  payload,
  peer,
  nonce
}: {
  payload: InternalMessageSyncPayload;
  peer: InternalSyncPeer;
  nonce: string;
}): Promise<{ status: string; eventId?: number; messageId?: number }> => {
  validatePayload(payload);

  const localServerId = getInternalMessageSyncServerId();
  if (localServerId && payload.target.serverId !== localServerId) {
    throw new AppError("ERR_INTERNAL_SYNC_TARGET_MISMATCH", 403);
  }

  const targetNumber = normalizeDigits(payload.target.number);
  const sourceNumber = normalizeDigits(payload.source.number);

  const route = await InternalSyncRoute.findOne({
    where: {
      localServerId: payload.target.serverId,
      remotePeerId: peer.id,
      remoteServerId: payload.source.serverId,
      localCompanyId: payload.target.companyId,
      localWhatsappId: payload.target.whatsappId,
      remoteCompanyId: payload.source.companyId,
      remoteWhatsappId: payload.source.whatsappId,
      status: "active"
    }
  });

  if (
    !route ||
    !isDirectionAllowed(route.direction, "inbound") ||
    !isMessageTypeAllowed(route.allowedMessageTypes, "text") ||
    normalizeDigits(route.localNumber) !== targetNumber ||
    normalizeDigits(route.remoteNumber) !== sourceNumber ||
    !jidMatches(route.localRemoteJid, payload.target.remoteJid) ||
    !jidMatches(route.remoteJid, payload.source.remoteJid)
  ) {
    throw new AppError("ERR_INTERNAL_SYNC_ROUTE_NOT_ALLOWED", 403);
  }

  const payloadHash = payload.dedupe?.payloadHash || buildPayloadHash(payload);

  const [event, created] = await InternalMessageSyncEvent.findOrCreate({
    where: {
      wid: payload.message.wid,
      targetCompanyId: payload.target.companyId,
      targetWhatsappId: payload.target.whatsappId,
      sourceServerId: payload.source.serverId
    },
    defaults: {
      wid: payload.message.wid,
      sourceServerId: payload.source.serverId,
      targetServerId: payload.target.serverId,
      sourceCompanyId: payload.source.companyId,
      targetCompanyId: payload.target.companyId,
      sourceWhatsappId: payload.source.whatsappId,
      targetWhatsappId: payload.target.whatsappId,
      sourceRemoteJid: payload.source.remoteJid,
      targetRemoteJid: payload.target.remoteJid,
      messageType: payload.message.type,
      direction: "inbound",
      status: "received",
      attempts: 1,
      payloadHash,
      nonce,
      receivedAt: new Date()
    } as any
  });

  if (
    !created &&
    ["processed", "duplicate", "skipped"].includes(event.status)
  ) {
    return { status: event.status, eventId: event.id };
  }

  if (
    payload.message.type !== "text" ||
    typeof payload.message.body !== "string" ||
    payload.message.body.trim() === "" ||
    isUnsupportedJid(payload.source.remoteJid) ||
    isUnsupportedJid(payload.target.remoteJid)
  ) {
    await event.update({
      status: "skipped",
      processedAt: new Date(),
      nonce,
      lastError: "unsupported MVP payload"
    });
    return { status: "skipped", eventId: event.id };
  }

  const existingMessage = await Message.findOne({
    where: {
      wid: payload.message.wid,
      companyId: payload.target.companyId
    }
  });

  if (existingMessage) {
    await event.update({
      status: "duplicate",
      processedAt: new Date(),
      nonce,
      lastError: null
    });
    return {
      status: "duplicate",
      eventId: event.id,
      messageId: existingMessage.id
    };
  }

  const whatsapp = await Whatsapp.findOne({
    where: {
      id: payload.target.whatsappId,
      companyId: payload.target.companyId
    }
  });

  if (!whatsapp) {
    await event.update({
      status: "failed",
      lastError: "target whatsapp not found"
    });
    throw new AppError("ERR_INTERNAL_SYNC_TARGET_WHATSAPP_NOT_FOUND", 404);
  }

  const whatsappNumber = normalizeDigits((whatsapp as any).number);
  if (whatsappNumber && whatsappNumber !== targetNumber) {
    await event.update({
      status: "failed",
      lastError: "target whatsapp number mismatch"
    });
    throw new AppError("ERR_INTERNAL_SYNC_TARGET_NUMBER_MISMATCH", 403);
  }

  const contact: Contact = await CreateOrUpdateContactService({
    name: sourceNumber || payload.source.number,
    number: sourceNumber || payload.source.number,
    isGroup: false,
    companyId: payload.target.companyId,
    remoteJid: payload.source.remoteJid,
    whatsappId: payload.target.whatsappId,
    msgBody: ""
  });

  const settings = await CompaniesSettings.findOne({
    where: { companyId: payload.target.companyId }
  });

  const ticket = await FindOrCreateTicketService(
    contact,
    whatsapp,
    1,
    payload.target.companyId,
    null,
    null,
    null,
    "whatsapp",
    false,
    true,
    settings,
    false,
    false
  );

  const timestamp = payload.message.timestamp
    ? new Date(payload.message.timestamp)
    : new Date();

  const dataJson = JSON.stringify({
    key: {
      id: payload.message.wid,
      remoteJid: payload.source.remoteJid,
      fromMe: false
    },
    message: {
      conversation: payload.message.body
    },
    messageTimestamp: Math.floor(timestamp.getTime() / 1000),
    status: payload.message.ack || 2,
    internalSync: {
      source: "internal_sync",
      isInternalSync: true,
      syncOriginServerId: payload.source.serverId,
      syncReceivedAt: new Date().toISOString(),
      originalTicketId: payload.dedupe?.originalTicketId
    }
  });

  const message = await CreateMessageService({
    messageData: {
      wid: payload.message.wid,
      ticketId: ticket.id,
      contactId: contact.id,
      body: payload.message.body,
      fromMe: false,
      read: false,
      mediaType: "conversation",
      ack: payload.message.ack || 2,
      remoteJid: payload.source.remoteJid,
      dataJson,
      createdAt: timestamp.toISOString(),
      ticketImported: false
    } as any,
    companyId: payload.target.companyId
  });

  await event.update({
    status: "processed",
    processedAt: new Date(),
    nonce,
    lastError: null
  });

  logger.info(
    {
      wid: payload.message.wid,
      sourceServerId: payload.source.serverId,
      targetServerId: payload.target.serverId,
      sourceCompanyId: payload.source.companyId,
      targetCompanyId: payload.target.companyId,
      sourceWhatsappId: payload.source.whatsappId,
      targetWhatsappId: payload.target.whatsappId,
      status: "processed"
    },
    "[InternalSync] inbound processed"
  );

  return { status: "processed", eventId: event.id, messageId: message.id };
};

export default ReceiveInternalMessageSyncService;
