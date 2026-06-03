// @ts-nocheck
/**
 * Fallback for companion sync pkmsg decryption failures.
 * When the phone sends a message that the CRM cannot decrypt (Signal session
 * issue), this creates a placeholder message so agents can see that a message
 * was sent from the phone.
 */
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
      // Avoid duplicate processing on retries
      const existing = await Message.findOne({ where: { wid: msgId, companyId } });
      if (existing) {
        logger.info(`[CompanionSync Fallback] msg ${msgId} already registered, skipping`);
        return;
      }

      const contactNumber = peerPn.replace(/@s\.whatsapp\.net$/, "");

      // Find the contact — only create placeholder if we know who it is
      const contact = await Contact.findOne({
        where: { number: contactNumber, companyId }
      });
      if (!contact) {
        logger.info(`[CompanionSync Fallback] No contact for ${contactNumber}, skipping`);
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

      const messageData = {
        wid: msgId,
        ticketId: ticket.id,
        contactId: contact.id,
        body: "🔒 [Mensagem enviada pelo celular — conteúdo indisponível]",
        fromMe: true,
        read: true,
        mediaType: "chat",
        ack: 2,
        companyId
      };

      await CreateMessageService({ messageData, companyId });
      logger.info(
        `[CompanionSync Fallback] Placeholder created: msg=${msgId} contact=${contactNumber} ticket=${ticket.id}`
      );
    } catch (err: any) {
      logger.warn(`[CompanionSync Fallback] Error: ${err?.message}`);
    }
  });
}
