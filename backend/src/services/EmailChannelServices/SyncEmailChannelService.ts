import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { Op } from "sequelize";

import Whatsapp from "../../models/Whatsapp";
import Message from "../../models/Message";
import logger from "../../utils/logger";
import FindOrCreateEmailContactService from "./FindOrCreateEmailContactService";
import EnsureEmailTicketService from "./EnsureEmailTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";

let isRunning = false;

const safeTextFromHtml = (html?: string | null): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const firstAddress = (value: any): string => {
  const address = value?.value?.[0]?.address || "";
  return String(address).trim().toLowerCase();
};

const joinAddresses = (value: any): string =>
  (value?.value || [])
    .map((item: any) => item.address)
    .filter(Boolean)
    .join(", ");

const pickThreadId = (parsed: any): string | null => {
  const refs = parsed.references?.value || [];
  if (refs.length > 0) return refs[refs.length - 1];
  if (parsed.inReplyTo?.value?.length > 0) return parsed.inReplyTo.value[0];
  if (parsed.messageId) return parsed.messageId;
  return null;
};

const processChannel = async (channel: Whatsapp): Promise<{ imported: number; errors: number }> => {
  const result = { imported: 0, errors: 0 };
  const imapHost = channel.emailImapHost;
  const imapUser = channel.emailImapUser;
  const imapPassword = channel.emailImapPassword;
  const imapPort = Number(channel.emailImapPort || 993);
  const imapSecure = Boolean(channel.emailImapSecure ?? true);
  const selfAddress = (channel.emailAddress || "").trim().toLowerCase();

  if (!imapHost || !imapUser || !imapPassword) {
    await channel.update({
      emailSyncError: "Configuracao IMAP incompleta.",
      emailLastSyncAt: new Date()
    });
    return result;
  }

  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: imapSecure,
    auth: {
      user: imapUser,
      pass: imapPassword
    },
    logger: false
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const sinceDate = channel.emailLastSyncAt
        ? new Date(channel.emailLastSyncAt)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const sequence = await client.search({ since: sinceDate });
      const fetchRange = Array.isArray(sequence) ? sequence.slice(-100) : [];

      for await (const msg of client.fetch(fetchRange, {
        uid: true,
        envelope: true,
        source: true,
        flags: true,
        internalDate: true
      })) {
        try {
          const wid = `email:${channel.id}:${msg.uid}`;
          const existing = await Message.findOne({
            where: {
              wid,
              companyId: channel.companyId
            }
          });

          if (existing) {
            continue;
          }

          const parsed = await simpleParser(msg.source);
          const sender = firstAddress(parsed.from || parsed.sender);
          const recipients = joinAddresses(parsed.to);
          const cc = joinAddresses(parsed.cc);
          const bcc = joinAddresses(parsed.bcc);
          const subject = (parsed.subject || "(sem assunto)").trim();
          const externalMessageId = parsed.messageId || wid;
          const inReplyTo = parsed.inReplyTo?.value?.[0] || null;
          const threadId = pickThreadId(parsed) || externalMessageId;
          const textBody =
            (parsed.text || "").trim() ||
            safeTextFromHtml(parsed.html as any) ||
            "[e-mail sem corpo]";
          const fromMe = Boolean(sender && (sender === selfAddress || sender === imapUser.toLowerCase()));

          const contactEmail = fromMe
            ? (recipients.split(",")[0] || "").trim().toLowerCase()
            : sender;

          const contactName = fromMe
            ? contactEmail
            : (parsed.from?.value?.[0]?.name || contactEmail);

          if (!contactEmail) {
            continue;
          }

          const contact = await FindOrCreateEmailContactService({
            companyId: channel.companyId,
            channelId: channel.id,
            email: contactEmail,
            name: contactName
          });

          if (!contact) continue;

          const ticket = await EnsureEmailTicketService({
            contact,
            channel,
            companyId: channel.companyId,
            unreadMessages: fromMe ? 0 : 1
          });

          await CreateMessageService({
            companyId: channel.companyId,
            messageData: {
              wid,
              ticketId: ticket.id,
              contactId: contact.id,
              body: textBody,
              fromMe,
              read: fromMe,
              ack: fromMe ? 2 : 0,
              mediaType: "email",
              externalMessageId,
              inReplyTo,
              threadId,
              emailFrom: sender,
              emailTo: recipients,
              emailCc: cc || null,
              emailBcc: bcc || null,
              emailSubject: subject,
              emailStatus: fromMe ? "synced_sent" : "received",
              emailMeta: {
                uid: msg.uid,
                internalDate: msg.internalDate,
                flags: Array.from(msg.flags || []),
                hasAttachments: (parsed.attachments || []).length > 0,
                attachments: (parsed.attachments || []).map((att: any) => ({
                  filename: att.filename,
                  contentType: att.contentType,
                  size: att.size
                }))
              }
            } as any
          });

          await ticket.update({
            lastMessage: textBody.slice(0, 1000),
            fromMe,
            unreadMessages: fromMe ? ticket.unreadMessages : (ticket.unreadMessages || 0) + 1,
            updatedAt: new Date()
          });

          result.imported += 1;
        } catch (err) {
          result.errors += 1;
          logger.error(`Email sync message error channel=${channel.id}`, err);
        }
      }
    } finally {
      lock.release();
    }

    await channel.update({
      emailSyncError: null,
      emailLastSyncAt: new Date()
    });
  } catch (error: any) {
    result.errors += 1;
    await channel.update({
      emailSyncError: error?.message || "Falha de sincronizacao IMAP.",
      emailLastSyncAt: new Date()
    });
    logger.error(`Email sync channel error channel=${channel.id}`, error);
  } finally {
    try {
      await client.logout();
    } catch (e) {
      // noop
    }
  }

  return result;
};

export const SyncOneEmailChannelService = async (channelId: number, companyId: number) => {
  const channel = await Whatsapp.findOne({
    where: {
      id: channelId,
      companyId,
      channel: "email"
    }
  });

  if (!channel) return { imported: 0, errors: 1 };
  return processChannel(channel);
};

const SyncEmailChannelService = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const channels = await Whatsapp.findAll({
      where: {
        channel: "email",
        emailSyncEnabled: true,
        status: { [Op.ne]: "DISCONNECTED" }
      }
    });

    for (const channel of channels) {
      await processChannel(channel);
    }
  } finally {
    isRunning = false;
  }
};

export default SyncEmailChannelService;
