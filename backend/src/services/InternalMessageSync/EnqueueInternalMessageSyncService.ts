import BullQueues from "../../libs/queue";
import Contact from "../../models/Contact";
import InternalMessageSyncEvent from "../../models/InternalMessageSyncEvent";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import { getInternalMessageSyncServerId } from "./featureFlags";
import ResolveInternalSyncTargetService from "./ResolveInternalSyncTargetService";
import { InternalMessageSyncPayload } from "./types";
import { buildPayloadHash, normalizeDigits } from "./utils";

const EnqueueInternalMessageSyncService = async ({
  message,
  ticket,
  contact
}: {
  message: Message;
  ticket: Ticket;
  contact: Contact;
}): Promise<void> => {
  try {
    const resolved = await ResolveInternalSyncTargetService({
      message,
      ticket,
      contact
    });
    if (!resolved) {
      return;
    }

    const sourceServerId = getInternalMessageSyncServerId();
    const whatsapp = await Whatsapp.findOne({
      where: { id: ticket.whatsappId, companyId: ticket.companyId }
    });

    if (!whatsapp) {
      return;
    }

    const sourceNumber =
      normalizeDigits(whatsapp.number) || normalizeDigits(whatsapp.name);
    const timestamp = message.createdAt
      ? new Date(message.createdAt).toISOString()
      : new Date().toISOString();

    const payload: InternalMessageSyncPayload = {
      event: "message.sent.fallback",
      version: 1,
      source: {
        serverId: sourceServerId,
        companyId: ticket.companyId,
        whatsappId: ticket.whatsappId,
        number: sourceNumber,
        remoteJid: sourceNumber ? `${sourceNumber}@s.whatsapp.net` : ""
      },
      target: {
        serverId: resolved.peer.publicId,
        companyId: resolved.targetCompanyId,
        whatsappId: resolved.targetWhatsappId,
        number: resolved.targetNumber,
        remoteJid: resolved.targetRemoteJid
      },
      message: {
        wid: message.wid,
        type: "text",
        body: message.body || "",
        timestamp,
        fromMe: false,
        ack: message.ack || 2
      },
      dedupe: {
        originalTicketId: ticket.id
      }
    };

    payload.dedupe.payloadHash = buildPayloadHash(payload);

    const [event, created] = await InternalMessageSyncEvent.findOrCreate({
      where: {
        wid: message.wid,
        targetCompanyId: resolved.targetCompanyId,
        targetWhatsappId: resolved.targetWhatsappId,
        sourceServerId
      },
      defaults: {
        wid: message.wid,
        sourceServerId,
        targetServerId: resolved.peer.publicId,
        sourceCompanyId: ticket.companyId,
        targetCompanyId: resolved.targetCompanyId,
        sourceWhatsappId: ticket.whatsappId,
        targetWhatsappId: resolved.targetWhatsappId,
        sourceRemoteJid: payload.source.remoteJid,
        targetRemoteJid: payload.target.remoteJid,
        messageType: "text",
        direction: "outbound",
        status: "pending",
        attempts: 0,
        payloadHash: payload.dedupe.payloadHash
      } as any
    });

    if (!created && ["sent", "processed", "duplicate"].includes(event.status)) {
      return;
    }

    try {
      await BullQueues.add("internalMessageSyncQueue", {
        eventId: event.id,
        peerId: resolved.peer.id,
        payload
      });
    } catch (queueError) {
      await event.update({
        status: "failed",
        lastError: queueError?.message || "queue enqueue failed"
      });
      throw queueError;
    }

    logger.info(
      {
        wid: message.wid,
        sourceServerId,
        targetServerId: resolved.peer.publicId,
        sourceCompanyId: ticket.companyId,
        targetCompanyId: resolved.targetCompanyId,
        sourceWhatsappId: ticket.whatsappId,
        targetWhatsappId: resolved.targetWhatsappId,
        status: "pending"
      },
      "[InternalSync] outbound queued"
    );
  } catch (error) {
    logger.error(
      { error: error?.message, wid: message?.wid },
      "[InternalSync] outbound enqueue failed"
    );
  }
};

export default EnqueueInternalMessageSyncService;
