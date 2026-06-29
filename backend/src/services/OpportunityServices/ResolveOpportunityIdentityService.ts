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

  if (leadId) {
    lead = await CrmLead.findOne({ where: { id: leadId, companyId } });
    if (!lead) throw new AppError("Lead informado não encontrado para esta empresa.", 404);
  }

  if (contactId) {
    contact = await Contact.findOne({ where: { id: contactId, companyId } });
    if (!contact) throw new AppError("Contato informado não encontrado para esta empresa.", 404);
  }

  if (!contact && lead?.contactId) {
    contact = await Contact.findOne({ where: { id: lead.contactId, companyId } });
  }

  if (!contact && ticketId) {
    const ticket = await resolveTicket(companyId, ticketId);
    if (ticket?.contactId) {
      contact = await Contact.findOne({ where: { id: ticket.contactId, companyId } });
    }
  }

  const normalizedPhone =
    normalizeOpportunityPhone(phone) ||
    normalizeOpportunityPhone(number) ||
    normalizeOpportunityPhone(lead?.phone) ||
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
