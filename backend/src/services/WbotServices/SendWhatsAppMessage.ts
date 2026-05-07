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

  if (
    contactNumber.remoteJid &&
    contactNumber.remoteJid !== "" &&
    contactNumber.remoteJid.includes("@")
  ) {
    number =
      sanitizeRemoteJid(
        stripCompanionDeviceSuffix(contactNumber.remoteJid),
        contactNumber.number,
        ticket.isGroup
      ) || stripCompanionDeviceSuffix(contactNumber.remoteJid);
  } else {
    number = `${contactNumber.number}@${
      ticket.isGroup ? "g.us" : "s.whatsapp.net"
    }`;
  }

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
      logger.error("[SendWhatsAppMessage] invalid vCard payload", { vCard });
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
      return sentMessage;
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`[SendWhatsAppMessage] vCard send error: ${err?.message}`);
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
    return sentMessage;
  } catch (err) {
    logger.error(`[SendWhatsAppMessage] company=${ticket.companyId} error: ${err?.message}`);
    Sentry.captureException(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
