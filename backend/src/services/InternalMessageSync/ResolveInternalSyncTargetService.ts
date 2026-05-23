import Contact from "../../models/Contact";
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
  getSingleAllowedId,
  getSingleAllowedNumber,
  isValueAllowed,
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

  const peers = await InternalSyncPeer.findAll({
    where: { status: "active" }
  });

  const matches = peers.filter(peer => {
    if (peer.publicId === sourceServerId) {
      return false;
    }

    return isValueAllowed(peer.allowedNumbers, targetNumber);
  });

  if (matches.length !== 1) {
    if (matches.length > 1) {
      logger.warn(
        { wid: message.wid, targetNumber, matches: matches.length },
        "[InternalSync] outbound skipped: ambiguous peer"
      );
    }
    return null;
  }

  const [peer] = matches;
  const targetCompanyId = getSingleAllowedId(peer.allowedCompanyIds);
  const targetWhatsappId = getSingleAllowedId(peer.allowedWhatsappIds);
  const mappedTargetNumber = getSingleAllowedNumber(peer.allowedNumbers);

  if (!targetCompanyId || !targetWhatsappId || !mappedTargetNumber) {
    logger.warn(
      { wid: message.wid, peerId: peer.publicId },
      "[InternalSync] outbound skipped: peer mapping must be unambiguous in MVP"
    );
    return null;
  }

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

  return {
    peer,
    targetCompanyId,
    targetWhatsappId,
    targetNumber: mappedTargetNumber,
    targetRemoteJid: contact.remoteJid || `${mappedTargetNumber}@s.whatsapp.net`
  };
};

export default ResolveInternalSyncTargetService;
