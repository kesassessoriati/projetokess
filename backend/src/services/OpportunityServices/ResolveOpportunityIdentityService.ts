import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import CrmLead from "../../models/CrmLead";
import Ticket from "../../models/Ticket";

interface Request {
  companyId: number;
  contactId?: number | null;
  leadId?: number | null;
  phone?: string | null;
  number?: string | null;
  ticketId?: number | null;
  email?: string | null;
  name?: string | null;
}

interface Response {
  contact: Contact;
  contactId: number;
  lead: CrmLead | null;
  leadId: number | null;
  normalizedPhone: string;
}

const ERROR_MESSAGE = "Não é permitido criar card no funil sem telefone/contato válido.";
const LEAD_CONTACT_MISMATCH =
  "Identidade inconsistente: lead e contato pertencem a pessoas diferentes.";
const TICKET_CONTACT_MISMATCH =
  "Identidade inconsistente: ticket e contato pertencem a pessoas diferentes.";
const TICKET_LEAD_MISMATCH =
  "Identidade inconsistente: ticket e lead pertencem a pessoas diferentes.";

export const normalizeOpportunityPhone = (value?: string | null): string | null => {
  const digits = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digits || digits.length < 8) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

const phoneVariants = (phone: string): string[] => {
  const variants = new Set<string>([phone]);
  if (phone.startsWith("55")) variants.add(phone.replace(/^55/, ""));
  return Array.from(variants);
};

const normalizedPhonesFor = (...values: Array<string | null | undefined>): string[] =>
  values
    .map(value => normalizeOpportunityPhone(value))
    .filter((value): value is string => Boolean(value));

const anyPhoneMatches = (
  incomingPhone: string | null,
  candidates: Array<string | null | undefined>
): boolean => {
  if (!incomingPhone) return true;
  const candidatePhones = normalizedPhonesFor(...candidates);
  if (candidatePhones.length === 0) return true;
  return candidatePhones.includes(incomingPhone);
};

const findContactByPhone = async (
  companyId: number,
  normalizedPhone: string
): Promise<Contact | null> =>
  Contact.findOne({
    where: {
      companyId,
      number: { [Op.in]: phoneVariants(normalizedPhone) }
    }
  });

const findLeadByPhone = async (
  companyId: number,
  normalizedPhone: string
): Promise<CrmLead | null> =>
  CrmLead.findOne({
    where: {
      companyId,
      phone: { [Op.in]: phoneVariants(normalizedPhone) }
    }
  });

const resolveTicket = async (
  companyId: number,
  ticketId?: number | null
): Promise<Ticket | null> => {
  if (!ticketId) return null;
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    include: [{ model: Contact, as: "contact", required: false }]
  });
  if (!ticket) {
    throw new AppError("Ticket informado não encontrado para esta empresa.", 404);
  }
  return ticket;
};

const ResolveOpportunityIdentityService = async ({
  companyId,
  contactId,
  leadId,
  phone,
  number,
  ticketId,
  email,
  name
}: Request): Promise<Response> => {
  let lead: CrmLead | null = null;
  let contact: Contact | null = null;
  let ticket: Ticket | null = null;
  let ticketContact: Contact | null = null;

  if (leadId) {
    lead = await CrmLead.findOne({ where: { id: leadId, companyId } });
    if (!lead) throw new AppError("Lead informado não encontrado para esta empresa.", 404);
  }

  if (contactId) {
    contact = await Contact.findOne({ where: { id: contactId, companyId } });
    if (!contact) throw new AppError("Contato informado não encontrado para esta empresa.", 404);
  }

  if (ticketId) {
    ticket = await resolveTicket(companyId, ticketId);
    if (ticket?.contactId) {
      ticketContact = await Contact.findOne({ where: { id: ticket.contactId, companyId } });
      if (!ticketContact) throw new AppError(TICKET_CONTACT_MISMATCH, 400);
    }
  }

  if (lead?.contactId && contactId && Number(lead.contactId) !== Number(contactId)) {
    throw new AppError(LEAD_CONTACT_MISMATCH, 400);
  }

  if (ticket?.contactId && contactId && Number(ticket.contactId) !== Number(contactId)) {
    throw new AppError(TICKET_CONTACT_MISMATCH, 400);
  }

  if (
    ticket?.contactId &&
    lead?.contactId &&
    Number(ticket.contactId) !== Number(lead.contactId)
  ) {
    throw new AppError(TICKET_LEAD_MISMATCH, 400);
  }

  if (!contact && lead?.contactId) {
    contact = await Contact.findOne({ where: { id: lead.contactId, companyId } });
    if (!contact) throw new AppError(LEAD_CONTACT_MISMATCH, 400);
  }

  if (!contact && ticketContact) {
    contact = ticketContact;
  }

  const incomingPhone =
    normalizeOpportunityPhone(phone) || normalizeOpportunityPhone(number);
  const contactPhone = normalizeOpportunityPhone((contact as any)?.number);

  if (incomingPhone && contactPhone && incomingPhone !== contactPhone) {
    throw new AppError(LEAD_CONTACT_MISMATCH, 400);
  }

  if (
    incomingPhone &&
    lead &&
    !anyPhoneMatches(incomingPhone, [
      lead.phone,
      (lead as any).decisionMakerPhone
    ])
  ) {
    throw new AppError(LEAD_CONTACT_MISMATCH, 400);
  }

  if (lead && contact && !lead.contactId) {
    const leadPhones = normalizedPhonesFor(lead.phone, (lead as any).decisionMakerPhone);
    if (leadPhones.length > 0 && contactPhone && !leadPhones.includes(contactPhone)) {
      throw new AppError(LEAD_CONTACT_MISMATCH, 400);
    }
  }

  if (ticketContact && lead && !lead.contactId) {
    const leadPhones = normalizedPhonesFor(lead.phone, (lead as any).decisionMakerPhone);
    const ticketPhone = normalizeOpportunityPhone((ticketContact as any).number);
    if (leadPhones.length > 0 && ticketPhone && !leadPhones.includes(ticketPhone)) {
      throw new AppError(TICKET_LEAD_MISMATCH, 400);
    }
  }

  const normalizedPhone =
    incomingPhone ||
    normalizeOpportunityPhone(lead?.phone) ||
    normalizeOpportunityPhone((lead as any)?.decisionMakerPhone) ||
    normalizeOpportunityPhone((contact as any)?.number);

  if (!contact && normalizedPhone) {
    contact = await findContactByPhone(companyId, normalizedPhone);
  }

  if (!lead && normalizedPhone) {
    lead = await findLeadByPhone(companyId, normalizedPhone);
  }

  if (!contact && normalizedPhone) {
    const [createdContact] = await Contact.findOrCreate({
      where: { companyId, number: normalizedPhone },
      defaults: {
        companyId,
        number: normalizedPhone,
        name: name || lead?.name || normalizedPhone,
        email: email || lead?.email || "",
        isGroup: false,
        channel: "whatsapp",
        active: true,
        profilePicUrl: "",
        acceptAudioMessage: true
      }
    } as any);
    contact = createdContact;
  }

  if (!contact || !normalizeOpportunityPhone(contact.number)) {
    throw new AppError(ERROR_MESSAGE, 400);
  }

  const finalPhone = normalizeOpportunityPhone(contact.number);
  if (!finalPhone) throw new AppError(ERROR_MESSAGE, 400);

  if (lead && !lead.contactId) {
    await lead.update({
      contactId: contact.id,
      phone: lead.phone || finalPhone,
      lastActivityAt: new Date()
    });
  }

  return {
    contact,
    contactId: contact.id,
    lead,
    leadId: lead?.id || null,
    normalizedPhone: finalPhone
  };
};

export default ResolveOpportunityIdentityService;
