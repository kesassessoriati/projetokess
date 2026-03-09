import nodemailer from "nodemailer";
import path from "path";
import { Op } from "sequelize";

import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import AppError from "../../errors/AppError";
import ResolveSmtpConfigService from "./ResolveSmtpConfigService";
import CreateMessageService from "../MessageServices/CreateMessageService";

interface SendRequest {
  ticket: Ticket;
  body: string;
  subject?: string;
  userId?: number;
  medias?: Express.Multer.File[];
}

const extractRecipient = (ticket: Ticket): string => {
  const email = ticket.contact?.email || "";
  if (email) return email.trim().toLowerCase();

  const number = (ticket.contact?.number || "").trim().toLowerCase();
  if (number.startsWith("email:")) {
    return number.replace("email:", "");
  }

  return "";
};

const SendEmailMessageService = async ({
  ticket,
  body,
  subject,
  userId,
  medias = []
}: SendRequest): Promise<Message> => {
  if (ticket.channel !== "email") {
    throw new AppError("Canal do ticket nao e email.", 400);
  }

  if (!ticket.whatsapp) {
    throw new AppError("Canal de e-mail nao vinculado ao ticket.", 400);
  }

  const recipient = extractRecipient(ticket);
  if (!recipient) {
    throw new AppError("Contato sem e-mail para envio.", 400);
  }

  const smtp = await ResolveSmtpConfigService(ticket.whatsapp as any);

  const transporterOptions: any = {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.password
    }
  };

  if (!smtp.secure) {
    transporterOptions.tls = { rejectUnauthorized: false };
  }

  const transporter = nodemailer.createTransport(transporterOptions);

  const latestThreadMessage = await Message.findOne({
    where: {
      ticketId: ticket.id,
      companyId: ticket.companyId,
      externalMessageId: { [Op.ne]: null }
    },
    order: [["createdAt", "DESC"]]
  });

  const messageSubject =
    (subject || "").trim() ||
    latestThreadMessage?.emailSubject ||
    `Atendimento #${ticket.id}`;

  const mailOptions: any = {
    from: `"${smtp.senderName}" <${smtp.senderEmail}>`,
    to: recipient,
    subject: messageSubject,
    html: body?.trim() || "",
    text: (body || "").replace(/<[^>]*>/g, "").trim()
  };

  const headers: Record<string, string> = {};
  if (latestThreadMessage?.externalMessageId) {
    headers["In-Reply-To"] = latestThreadMessage.externalMessageId;
    headers.References = latestThreadMessage.externalMessageId;
  }
  if (Object.keys(headers).length > 0) {
    mailOptions.headers = headers;
  }

  if (medias.length > 0) {
    mailOptions.attachments = medias.map(file => ({
      filename: file.originalname,
      path: path.resolve(file.path)
    }));
  }

  const info = await transporter.sendMail(mailOptions);
  const messageId = info.messageId || `sent-${Date.now()}-${ticket.id}`;

  const message = await CreateMessageService({
    companyId: ticket.companyId,
    messageData: {
      wid: `email:${ticket.whatsappId}:${messageId}`,
      ticketId: ticket.id,
      contactId: ticket.contactId,
      body: body?.trim() || "",
      fromMe: true,
      read: true,
      ack: 1,
      mediaType: "email",
      userId,
      externalMessageId: messageId,
      inReplyTo: latestThreadMessage?.externalMessageId || null,
      threadId:
        latestThreadMessage?.threadId ||
        latestThreadMessage?.externalMessageId ||
        messageId,
      emailFrom: smtp.senderEmail,
      emailTo: recipient,
      emailSubject: messageSubject,
      emailStatus: "sent",
      emailMeta: {
        accepted: info.accepted || [],
        rejected: info.rejected || [],
        response: info.response || null,
        envelope: info.envelope || null,
        attachments: medias.map(file => file.originalname)
      }
    } as any
  });

  await ticket.update({
    lastMessage: body?.trim() || `[E-mail] ${messageSubject}`,
    fromMe: true,
    updatedAt: new Date()
  });

  return message;
};

export default SendEmailMessageService;
