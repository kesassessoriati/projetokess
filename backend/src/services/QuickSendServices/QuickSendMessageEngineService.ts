// @ts-nocheck
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import CompaniesSettings from "../../models/CompaniesSettings";
import CrmLead from "../../models/CrmLead";
import Opportunity from "../../models/Opportunity";
import renderCampaignTemplate from "../../helpers/RenderCampaignTemplate";
import { renderAppointmentVariables } from "../../helpers/RenderAppointmentVariables";
import {
  getBrazilianPhoneVariants,
  normalizePhoneNumber
} from "../../helpers/normalizeContactNumber";
import { sendButtonMessage } from "../../helpers/SendInteractiveMessage";
import logger from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import CheckContactNumber from "../WbotServices/CheckNumber";
import { verifyMessage } from "../WbotServices/wbotMessageListener";

interface QuickSendMessageEngineRequest {
  companyId: number;
  userId?: number | null;
  number?: string | null;
  message?: string | null;
  whatsappId?: number | string | null;
  leadId?: number | string | null;
  opportunityId?: number | string | null;
  name?: string | null;
  queueId?: number | string | null;
  createIfNotExists?: boolean;
  buttons?: any[] | null;
  messageType?: string;
  contact?: Contact | null;
  ticket?: Ticket | null;
  renderAppointment?: boolean;
}

interface QuickSendMessageEngineResponse {
  ticket: Ticket;
  contact: Contact;
  warning?: string;
  sendError?: string;
}

const isTrustedDirectRemoteJid = (remoteJid?: string | null): boolean =>
  Boolean(
    remoteJid &&
      remoteJid.includes("@") &&
      remoteJid.endsWith("@s.whatsapp.net") &&
      !remoteJid.includes("@lid")
  );

const getAreaCodeFromReference = (reference?: string | null): string => {
  const digits = String(reference || "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");
  const normalized = normalizePhoneNumber(digits) || digits;
  const national = normalized.startsWith("55") ? normalized.slice(2) : normalized;

  return national.length >= 10 ? national.slice(0, 2) : "";
};

export const normalizeQuickSendNumber = (
  raw?: string | null,
  referenceNumber?: string | null
): string => {
  let digits = String(raw || "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");

  if (digits.length === 8 || digits.length === 9) {
    const areaCode = getAreaCodeFromReference(referenceNumber);
    if (areaCode) {
      digits = `${areaCode}${digits}`;
    }
  }

  return normalizePhoneNumber(digits) || digits;
};

const normalizeQuickSendButtons = (buttons?: any[] | null): any[] => {
  if (!Array.isArray(buttons)) return [];

  return buttons
    .map(button => {
      const displayText = String(button?.displayText || button?.text || "").trim();
      const rawType = String(button?.type || "reply").trim().toLowerCase();
      const value = String(
        button?.value ||
          button?.url ||
          button?.phoneNumber ||
          button?.copyText ||
          button?.id ||
          ""
      ).trim();

      const type =
        rawType === "quick_reply" || rawType === "response" || rawType === "resposta"
          ? "reply"
          : rawType === "phone" || rawType === "ligar"
          ? "call"
          : rawType === "copy_code" || rawType === "copiar"
          ? "copy"
          : ["reply", "url", "call", "copy"].includes(rawType)
          ? rawType
          : "reply";

      return {
        displayText,
        type,
        value: value || displayText
      };
    })
    .filter(button => button.displayText)
    .slice(0, 3);
};

const resolveOpportunityTarget = async ({
  companyId,
  opportunityId
}: {
  companyId: number;
  opportunityId?: number | string | null;
}) => {
  if (!opportunityId) return { opportunity: null, lead: null };

  const opportunity = await Opportunity.findOne({
    where: { id: Number(opportunityId), companyId },
    include: [
      { model: Contact, as: "contact", required: false },
      {
        model: Ticket,
        as: "ticket",
        required: false,
        include: [{ model: Contact, as: "contact", required: false }]
      },
      {
        model: CrmLead,
        as: "lead",
        required: false,
        include: [
          { model: Contact, as: "contact", required: false },
          {
            model: Ticket,
            as: "primaryTicket",
            required: false,
            include: [{ model: Contact, as: "contact", required: false }]
          }
        ]
      }
    ]
  });

  return { opportunity, lead: opportunity?.lead || null };
};

const resolveConnectedWhatsapp = async ({
  whatsappId,
  companyId
}: {
  whatsappId?: number | string | null;
  companyId: number;
}): Promise<Whatsapp> => {
  let whatsapp: Whatsapp | null = null;

  if (whatsappId) {
    whatsapp = await Whatsapp.findOne({
      where: { id: Number(whatsappId), companyId, status: "CONNECTED" }
    });
  }

  if (!whatsapp) {
    whatsapp = await Whatsapp.findOne({
      where: { companyId, status: "CONNECTED", isDefault: true }
    });
  }

  if (!whatsapp) {
    whatsapp = await Whatsapp.findOne({
      where: { companyId, status: "CONNECTED" }
    });
  }

  if (!whatsapp) {
    throw new AppError("Conexão WhatsApp não encontrada ou não está conectada.", 404);
  }

  return whatsapp;
};

const resolveOrCreateContact = async ({
  companyId,
  normalized,
  validatedNumber,
  remoteJid,
  whatsappValidated,
  createContactName,
  createIfNotExists,
  initialContact,
  whatsappId
}: {
  companyId: number;
  normalized: string;
  validatedNumber: string;
  remoteJid: string;
  whatsappValidated: boolean;
  createContactName: string;
  createIfNotExists: boolean;
  initialContact?: Contact | null;
  whatsappId: number;
}): Promise<{ contact: Contact; remoteJid: string; validatedNumber: string }> => {
  const numberVariants = [
    ...new Set([
      ...getBrazilianPhoneVariants(validatedNumber),
      ...getBrazilianPhoneVariants(normalized)
    ])
  ];

  let contact =
    initialContact && numberVariants.includes(initialContact.number)
      ? initialContact
      : null;

  if (!contact) {
    contact = await Contact.findOne({
      where: {
        companyId,
        number: { [Op.in]: numberVariants }
      }
    });
  }

  if (!contact) {
    if (!createIfNotExists) {
      throw new AppError("Contato não encontrado.", 404);
    }

    const settings = await CompaniesSettings.findOne({ where: { companyId } });
    const acceptAudio = settings?.acceptAudioMessageContact === "enabled";

    contact = await CreateOrUpdateContactService({
      name: createContactName || validatedNumber,
      number: validatedNumber,
      remoteJid,
      remoteJidValidated: whatsappValidated,
      companyId,
      isGroup: false,
      channel: "whatsapp",
      profilePicUrl: "",
      acceptAudioMessage: acceptAudio,
      active: true,
      whatsappId
    });
  }

  if (!whatsappValidated && isTrustedDirectRemoteJid(contact?.remoteJid)) {
    remoteJid = contact.remoteJid;
    validatedNumber = remoteJid.split("@")[0] || validatedNumber;
  }

  const contactNumberVariants = getBrazilianPhoneVariants(validatedNumber);
  const contactNumberIsEquivalent = contactNumberVariants.includes(contact.number);
  const remoteJidNum = remoteJid.split("@")[0];
  const contactRemoteJidNum = (contact.remoteJid || "").split("@")[0];
  const remoteJidsAreEquivalent =
    remoteJidNum === contactRemoteJidNum ||
    getBrazilianPhoneVariants(remoteJidNum).includes(contactRemoteJidNum) ||
    getBrazilianPhoneVariants(contactRemoteJidNum).includes(remoteJidNum);
  const canonicalJidMismatch =
    whatsappValidated &&
    !!contact.remoteJid &&
    remoteJid !== contact.remoteJid &&
    remoteJidsAreEquivalent;

  if (
    !contactNumberIsEquivalent ||
    !remoteJidsAreEquivalent ||
    canonicalJidMismatch
  ) {
    contact = await CreateOrUpdateContactService({
      name: contact.name || createContactName || validatedNumber,
      number: validatedNumber,
      remoteJid,
      remoteJidValidated: whatsappValidated,
      companyId,
      isGroup: false,
      channel: "whatsapp",
      profilePicUrl: "",
      whatsappId
    });
  }

  return { contact, remoteJid, validatedNumber };
};

const maybeSyncLead = async ({
  lead,
  contact,
  ticket,
  validatedNumber,
  companyId
}: {
  lead?: CrmLead | null;
  contact: Contact;
  ticket?: Ticket | null;
  validatedNumber: string;
  companyId: number;
}) => {
  if (!lead) return;

  const leadUpdates: Record<string, any> = {};
  if (lead.contactId !== contact.id) {
    leadUpdates.contactId = contact.id;
  }

  if (lead.phone !== validatedNumber) {
    const existingLeadWithPhone = await CrmLead.findOne({
      where: {
        companyId,
        phone: { [Op.in]: getBrazilianPhoneVariants(validatedNumber) },
        id: { [Op.ne]: lead.id }
      }
    });

    if (!existingLeadWithPhone) {
      leadUpdates.phone = validatedNumber;
    }
  }

  if (ticket && lead.primaryTicketId !== ticket.id) {
    leadUpdates.primaryTicketId = ticket.id;
  }

  if (Object.keys(leadUpdates).length > 0) {
    await lead.update(leadUpdates, { hooks: false });
  }
};

const resolveTicket = async ({
  contact,
  whatsapp,
  companyId,
  queueId,
  userId,
  initialTicket
}: {
  contact: Contact;
  whatsapp: Whatsapp;
  companyId: number;
  queueId?: number | string | null;
  userId?: number | null;
  initialTicket?: Ticket | null;
}): Promise<Ticket> => {
  let ticket =
    initialTicket &&
    Number(initialTicket.companyId) === Number(companyId) &&
    Number(initialTicket.contactId) === Number(contact.id) &&
    Number(initialTicket.whatsappId) === Number(whatsapp.id)
      ? initialTicket
      : null;

  if (!ticket) {
    ticket = await FindOrCreateTicketService(
      contact,
      whatsapp,
      0,
      companyId,
      queueId ? Number(queueId) : null,
      userId || null,
      undefined,
      "whatsapp"
    );
  }

  if (Number(ticket.whatsappId) !== Number(whatsapp.id)) {
    await ticket.update({ whatsappId: whatsapp.id });
  }

  await UpdateTicketService({
    ticketId: ticket.id,
    companyId,
    ticketData: {
      status: "open",
      userId: userId === undefined ? ticket.userId : userId,
      queueId: queueId === undefined ? ticket.queueId : Number(queueId)
    }
  });

  return ShowTicketService(ticket.id, companyId);
};

const sendMessage = async ({
  messageType,
  buttons,
  message,
  ticket,
  contact,
  remoteJid,
  whatsappId,
  userId
}: {
  messageType: string;
  buttons?: any[] | null;
  message: string;
  ticket: Ticket;
  contact: Contact;
  remoteJid: string;
  whatsappId: number;
  userId?: number | null;
}) => {
  if (messageType === "buttons") {
    const normalizedButtons = normalizeQuickSendButtons(buttons);
    if (!normalizedButtons.length) {
      throw new AppError("Nenhum botão configurado na ação.", 400);
    }

    const sentMsg = await sendButtonMessage(
      getWbot(Number(whatsappId)),
      remoteJid,
      message || "",
      "",
      normalizedButtons
    );

    if (sentMsg?.key) {
      await verifyMessage(
        sentMsg,
        ticket,
        contact,
        undefined,
        false,
        false,
        false,
        true,
        userId || undefined
      );
    }

    return;
  }

  if (!message) {
    logger.debug({ ticketId: ticket.id }, "QuickSend engine: ticket created without message.");
    return;
  }

  const sentMsg = await SendWhatsAppMessage({
    body: message,
    ticket,
    quotedMsg: null
  });

  if (sentMsg?.key) {
    await verifyMessage(
      sentMsg,
      ticket,
      contact,
      undefined,
      false,
      false,
      false,
      true,
      userId || undefined
    );
  }
};

const QuickSendMessageEngineService = async ({
  companyId,
  userId,
  number,
  message = "",
  whatsappId,
  leadId,
  opportunityId,
  name,
  queueId,
  createIfNotExists = true,
  buttons = null,
  messageType = "text",
  contact: initialContact = null,
  ticket: initialTicket = null,
  renderAppointment = false
}: QuickSendMessageEngineRequest): Promise<QuickSendMessageEngineResponse> => {
  const { opportunity, lead: opportunityLead } = await resolveOpportunityTarget({
    companyId,
    opportunityId
  });

  let lead = opportunityLead;
  if (!lead && leadId) {
    lead = await CrmLead.findOne({
      where: { id: Number(leadId), companyId },
      include: [{ model: Contact, as: "contact", required: false }]
    });
  }

  const targetContact =
    initialContact ||
    opportunity?.contact ||
    initialTicket?.contact ||
    opportunity?.ticket?.contact ||
    lead?.contact ||
    opportunity?.lead?.primaryTicket?.contact ||
    null;
  const targetTicket =
    initialTicket ||
    opportunity?.ticket ||
    opportunity?.lead?.primaryTicket ||
    null;
  const referenceNumber = lead?.phone || targetContact?.number || "";
  const rawNumber =
    number ||
    targetContact?.number ||
    lead?.phone ||
    lead?.decisionMakerPhone ||
    "";
  const normalized = normalizeQuickSendNumber(rawNumber, referenceNumber);

  if (!normalized || !/^\d{10,15}$/.test(normalized)) {
    throw new AppError("Número inválido. Use apenas dígitos com DDD.", 400);
  }

  const whatsapp = await resolveConnectedWhatsapp({ whatsappId, companyId });
  let remoteJid = `${normalized}@s.whatsapp.net`;
  let validatedNumber = normalized;
  let whatsappValidated = false;

  try {
    const checkedNumber = await CheckContactNumber(
      normalized,
      companyId,
      false,
      whatsapp.id
    );

    if (checkedNumber) {
      validatedNumber = checkedNumber;
      remoteJid = `${validatedNumber}@s.whatsapp.net`;
      whatsappValidated = true;
    }
  } catch (err: any) {
    logger.warn(
      { companyId, whatsappId: whatsapp.id, err: err?.message },
      "QuickSend engine: optional WhatsApp number check failed"
    );
  }

  const createContactName =
    name ||
    lead?.name ||
    targetContact?.name ||
    validatedNumber;

  const resolvedContact = await resolveOrCreateContact({
    companyId,
    normalized,
    validatedNumber,
    remoteJid,
    whatsappValidated,
    createContactName,
    createIfNotExists,
    initialContact: targetContact,
    whatsappId: whatsapp.id
  });
  const contact = resolvedContact.contact;
  remoteJid = resolvedContact.remoteJid;
  validatedNumber = resolvedContact.validatedNumber;

  let ticket = await resolveTicket({
    contact,
    whatsapp,
    companyId,
    queueId,
    userId,
    initialTicket: targetTicket
  });

  await maybeSyncLead({
    lead,
    contact,
    ticket,
    validatedNumber,
    companyId
  });

  if (opportunity && Number(opportunity.ticketId) !== Number(ticket.id)) {
    await opportunity.update({ ticketId: ticket.id });
  }

  const templateContact = {
    name: contact.name,
    email: contact.email,
    number: contact.number
  };
  const appointmentMessage = renderAppointment
    ? await renderAppointmentVariables(String(message || ""), {
        companyId,
        contactId: contact.id
      })
    : String(message || "");
  const renderedMessage = renderCampaignTemplate(
    appointmentMessage,
    templateContact,
    []
  ) as string;
  const renderedButtons = renderCampaignTemplate(
    normalizeQuickSendButtons(buttons),
    templateContact,
    []
  ) as any[];

  try {
    await sendMessage({
      messageType,
      buttons: renderedButtons,
      message: renderedMessage,
      ticket,
      contact,
      remoteJid,
      whatsappId: whatsapp.id,
      userId
    });
  } catch (err: any) {
    logger.error(
      { companyId, ticketId: ticket.id, err: err?.message },
      "QuickSend engine: error sending message"
    );

    return {
      ticket,
      contact,
      warning:
        "Ticket criado, mas houve erro ao enviar a mensagem. Abra o ticket para tentar novamente.",
      sendError: err?.message
    };
  }

  ticket = await ShowTicketService(ticket.id, companyId);

  return { ticket, contact };
};

export default QuickSendMessageEngineService;
