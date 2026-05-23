import Contact from "../../models/Contact";
import InternalSyncRoute from "../../models/InternalSyncRoute";
import InternalSyncPeer from "../../models/InternalSyncPeer";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import {
  getInternalMessageSyncServerId,
  isInternalMessageSyncOutboundEnabled
} from "./featureFlags";
import {
  isDirectionAllowed,
  isMessageTypeAllowed,
  jidMatches,
  normalizeDigits
} from "./utils";

interface ResolvedTarget {
  peer: InternalSyncPeer;
  targetCompanyId: number;
  targetWhatsappId: number;
  targetNumber: string;
  targetRemoteJid: string;
}

const supportedTextTypes = new Set(["conversation", "extendedTextMessage"]);

const isInternalSyncMessage = (message: Message): boolean => {
  try {
    const data = message.dataJson ? JSON.parse(message.dataJson) : null;
    return Boolean(
      data?.internalSync?.isInternalSync ||
        data?.internalSync?.source === "internal_sync"
    );
  } catch {
    return false;
  }
};

const ResolveInternalSyncTargetService = async ({
  message,
  ticket,
  contact
}: {
  message: Message;
  ticket: Ticket;
  contact: Contact;
}): Promise<ResolvedTarget | null> => {
  if (!isInternalMessageSyncOutboundEnabled()) {
    return null;
  }

  const sourceServerId = getInternalMessageSyncServerId();
  if (!sourceServerId) {
    logger.warn(
      { wid: message.wid },
      "[InternalSync] outbound skipped: missing server id"
    );
    return null;
  }

  if (!message.fromMe || !message.wid || ticket.isGroup || contact.isGroup) {
    return null;
  }

  if (isInternalSyncMessage(message)) {
    return null;
  }

  if (!supportedTextTypes.has(message.mediaType) || message.mediaUrl) {
    logger.info(
      { wid: message.wid, mediaType: message.mediaType },
      "[InternalSync] outbound skipped: unsupported type"
    );
    return null;
  }

  const targetNumber = normalizeDigits(contact.number);
  if (!targetNumber) {
    return null;
  }

  const routes = await InternalSyncRoute.findAll({
    where: {
      localServerId: sourceServerId,
      localCompanyId: ticket.companyId,
      localWhatsappId: ticket.whatsappId,
      status: "active"
    }
  });

  const matches = routes.filter(route => {
    const routeRemoteNumber = normalizeDigits(route.remoteNumber);
    return (
      isDirectionAllowed(route.direction, "outbound") &&
      isMessageTypeAllowed(route.allowedMessageTypes, "text") &&
      routeRemoteNumber === targetNumber &&
      jidMatches(route.remoteJid, contact.remoteJid)
    );
  });

  if (matches.length !== 1) {
    if (matches.length > 1) {
      logger.warn(
        { wid: message.wid, targetNumber, matches: matches.length },
        "[InternalSync] outbound skipped: ambiguous route"
      );
    }
    return null;
  }

  const [route] = matches;
  const whatsapp = await Whatsapp.findOne({
    where: {
      id: ticket.whatsappId,
      companyId: ticket.companyId
    }
  });

  if (!whatsapp) {
    logger.warn(
      { wid: message.wid, whatsappId: ticket.whatsappId },
      "[InternalSync] outbound skipped: source whatsapp not found"
    );
    return null;
  }

  const localNumber =
    normalizeDigits((whatsapp as any).number) ||
    normalizeDigits((whatsapp as any).name);
  if (route.localNumber && normalizeDigits(route.localNumber) !== localNumber) {
    logger.warn(
      { wid: message.wid, routeId: route.id },
      "[InternalSync] outbound skipped: local number mismatch"
    );
    return null;
  }

  const peer = await InternalSyncPeer.findOne({
    where: {
      id: route.remotePeerId,
      publicId: route.remoteServerId,
      status: "active"
    }
  });

  if (!peer) {
    logger.warn(
      { wid: message.wid, routeId: route.id },
      "[InternalSync] outbound skipped: remote peer not active"
    );
    return null;
  }

  return {
    peer,
    targetCompanyId: route.remoteCompanyId,
    targetWhatsappId: route.remoteWhatsappId,
    targetNumber: normalizeDigits(route.remoteNumber),
    targetRemoteJid:
      route.remoteJid || `${normalizeDigits(route.remoteNumber)}@s.whatsapp.net`
  };
};

export default ResolveInternalSyncTargetService;
