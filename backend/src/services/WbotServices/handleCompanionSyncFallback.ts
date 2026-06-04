// @ts-nocheck
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import Message from "../../models/Message";
import logger from "../../utils/logger";
import { runWithContext } from "../../context";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";

const extractAttr = (nodeStr: string, attr: string): string | null => {
  const m = nodeStr.match(new RegExp(`${attr}='([^']+)'`));
  return m ? m[1] : null;
};

const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 6) return "***";
  return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
};

const buildPlaceholderBody = (nodeStr: string): string => {
  const msgType = extractAttr(nodeStr, "type");
  if (msgType === "media") {
    const mediaType = extractAttr(nodeStr, "mediatype");
    switch (mediaType) {
      case "image":    return "📷 Imagem enviada pelo celular — aguardando sincronização";
      case "video":    return "🎥 Vídeo enviado pelo celular — aguardando sincronização";
      case "audio":    return "🎵 Áudio enviado pelo celular — aguardando sincronização";
      case "document": return "📄 Documento enviado pelo celular — aguardando sincronização";
      case "sticker":  return "🎭 Sticker enviado pelo celular — aguardando sincronização";
      default:         return "📎 Mídia enviada pelo celular — aguardando sincronização";
    }
  }
  return "💬 Mensagem enviada pelo celular — aguardando sincronização";
};

export async function handleCompanionSyncFallback(
  nodeStr: string,
  whatsappId: number,
  companyId: number
): Promise<void> {
  const peerPn = extractAttr(nodeStr, "peer_recipient_pn");
  if (!peerPn) return;

  const msgId = extractAttr(nodeStr, "id");
  if (!msgId) return;

  await runWithContext({ companyId }, async () => {
    try {
      const existing = await Message.findOne({ where: { wid: msgId, companyId } });
      if (existing) {
        logger.info(`[CompanionSync Fallback] Duplicate placeholder skipped: companyId=${companyId}`);
        return;
      }

      const contactNumber = peerPn.replace(/@s\.whatsapp\.net$/, "");

      const contact = await Contact.findOne({
        where: { number: contactNumber, companyId }
      });
      if (!contact) {
        logger.info(
          `[CompanionSync Fallback] No contact for ${maskPhone(contactNumber)} (companyId=${companyId}), skipping`
        );
        return;
      }

      const whatsapp = await Whatsapp.findByPk(whatsappId);
      if (!whatsapp) return;

      const ticket = await FindOrCreateTicketService(
        contact,
        whatsapp,
        0,
        companyId
      );

      const body = buildPlaceholderBody(nodeStr);
      const msgType = extractAttr(nodeStr, "type");
      const mediaType =
        msgType === "media" ? (extractAttr(nodeStr, "mediatype") || "chat") : "chat";

      const messageData = {
        wid: msgId,
        ticketId: ticket.id,
        contactId: contact.id,
        body,
        fromMe: true,
        read: true,
        mediaType,
        ack: 2,
        companyId,
        dataJson: JSON.stringify({ companionSyncFallback: true, peerRecipientPn: contactNumber })
      };

      await CreateMessageService({ messageData, companyId });
      logger.info(
        `[CompanionSync Fallback] Placeholder created: companyId=${companyId} ticketId=${ticket.id} mediaType=${mediaType}`
      );
    } catch (err: any) {
      logger.warn(`[CompanionSync Fallback] Error: ${err?.message}`);
    }
  });
}
