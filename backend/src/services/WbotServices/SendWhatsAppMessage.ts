import { WAMessage, delay } from "@whiskeysockets/baileys";
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { isNil } from "lodash";

import formatBody from "../../helpers/Mustache";
import {
  sanitizeRemoteJid,
  stripCompanionDeviceSuffix
} from "../../helpers/normalizeContactNumber";
import { ProviderFactory } from "../whatsapp/providers/ProviderFactory";
import logger from "../../utils/logger";
import EnsureWhatsAppContactNameService from "../ContactServices/EnsureWhatsAppContactNameService";

const isTrustedDirectRemoteJid = (remoteJid?: string | null): boolean =>
  Boolean(
    remoteJid &&
      remoteJid.includes("@") &&
      remoteJid.endsWith("@s.whatsapp.net") &&
      !remoteJid.includes("@lid")
  );

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  msdelay?: number;
  vCard?: Contact;
  isForwarded?: boolean;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg,
  msdelay,
  vCard,
  isForwarded = false
}: Request): Promise<WAMessage> => {
  let options = {};
  const wbot = await GetTicketWbot(ticket);
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  const provider = ProviderFactory.createProvider(whatsapp, wbot, ticket.companyId);
  const contactNumber = await Contact.findByPk(ticket.contactId);

  await EnsureWhatsAppContactNameService({
    contact: contactNumber,
    whatsappId: whatsapp?.id || ticket.whatsappId,
    wbot
  });

  let number: string;

  const storedRemoteJid = stripCompanionDeviceSuffix(contactNumber.remoteJid);

  if (ticket.isGroup && storedRemoteJid && storedRemoteJid.includes("@")) {
    number =
      sanitizeRemoteJid(storedRemoteJid, contactNumber.number, true) ||
      storedRemoteJid;
  } else if (isTrustedDirectRemoteJid(storedRemoteJid)) {
    number = storedRemoteJid;
  } else if (storedRemoteJid && storedRemoteJid.includes("@")) {
    number =
      sanitizeRemoteJid(storedRemoteJid, contactNumber.number, ticket.isGroup) ||
      storedRemoteJid;
  } else {
    number = `${contactNumber.number}@${
      ticket.isGroup ? "g.us" : "s.whatsapp.net"
    }`;
  }

  logger.info({
    companyId: ticket.companyId,
    ticketId: ticket.id,
    whatsappId: ticket.whatsappId,
    contactId: contactNumber?.id,
    contactNumber: contactNumber?.number,
    contactRemoteJid: contactNumber?.remoteJid,
    resolvedJid: number
  }, "[SendWhatsAppMessage] resolved whatsapp jid");

  if (quotedMsg) {
    const chatMessages = await Message.findOne({
      where: {
        id: quotedMsg.id
      }
    });

    if (chatMessages) {
      const msgFound = JSON.parse(chatMessages.dataJson);

      if (msgFound.message.extendedTextMessage !== undefined) {
        options = {
          quoted: {
            key: msgFound.key,
            message: {
              extendedTextMessage: msgFound.message.extendedTextMessage
            }
          }
        };
      } else {
        options = {
          quoted: {
            key: msgFound.key,
            message: {
              conversation: msgFound.message.conversation
            }
          }
        };
      }
    }
  }

  if (!isNil(vCard)) {
    const formattedName = String(vCard?.name || "").trim();
    const numberContact = String(vCard?.number || "").replace(/\D/g, "");

    if (!formattedName || !numberContact) {
      logger.error({ vCard }, "[SendWhatsAppMessage] invalid vCard payload");
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }

    const firstName = formattedName.split(" ")[0];
    const lastName = String(formattedName).replace(firstName, "").trim();

    const vcard =
      `BEGIN:VCARD\n` +
      `VERSION:3.0\n` +
      `N:${lastName};${firstName};;;\n` +
      `FN:${formattedName}\n` +
      `TEL;type=CELL;waid=${numberContact}:+${numberContact}\n` +
      `END:VCARD`;

    try {
      await delay(msdelay);
      const sentMessage = await provider.sendMessage(number, {
        contacts: {
          displayName: formattedName,
          contacts: [{ vcard }]
        }
      });
      await ticket.update({
        lastMessage: `Contato: ${formattedName}`,
        imported: null
      });
      logger.info({
        companyId: ticket.companyId,
        ticketId: ticket.id,
        whatsappId: ticket.whatsappId,
        contactId: contactNumber?.id,
        resolvedJid: number,
        wid: sentMessage?.key?.id,
        initialAck: sentMessage?.status,
        initialStatus: sentMessage?.status
      }, "[SendWhatsAppMessage] vCard provider response");
      return sentMessage;
    } catch (err) {
      Sentry.captureException(err);
      logger.error({
        companyId: ticket.companyId,
        ticketId: ticket.id,
        whatsappId: ticket.whatsappId,
        contactId: contactNumber?.id,
        resolvedJid: number,
        error: err?.message
      }, "[SendWhatsAppMessage] vCard send error");
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  }

  if (body === "" || body === undefined || formatBody(body, ticket) === "") {
    return {} as WAMessage;
  }

  try {
    await delay(msdelay);
    const sentMessage = await provider.sendMessage(
      number,
      {
        text: formatBody(body, ticket),
        contextInfo: {
          forwardingScore: isForwarded ? 2 : 0,
          isForwarded: isForwarded ? true : false
        },
        ...options
      }
    );
    await ticket.update({
      lastMessage: formatBody(body, ticket),
      imported: null
    });
    logger.info({
      companyId: ticket.companyId,
      ticketId: ticket.id,
      whatsappId: ticket.whatsappId,
      contactId: contactNumber?.id,
      contactNumber: contactNumber?.number,
      contactRemoteJid: contactNumber?.remoteJid,
      resolvedJid: number,
      wid: sentMessage?.key?.id,
      initialAck: sentMessage?.status,
      initialStatus: sentMessage?.status
    }, "[SendWhatsAppMessage] text provider response");
    return sentMessage;
  } catch (err) {
    logger.error({
      companyId: ticket.companyId,
      ticketId: ticket.id,
      whatsappId: ticket.whatsappId,
      contactId: contactNumber?.id,
      contactNumber: contactNumber?.number,
      contactRemoteJid: contactNumber?.remoteJid,
      resolvedJid: number,
      error: err?.message
    }, "[SendWhatsAppMessage] provider send error");
    Sentry.captureException(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
