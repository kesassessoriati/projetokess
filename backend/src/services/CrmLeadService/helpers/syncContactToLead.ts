import { Op } from "sequelize";
import Contact from "../../../models/Contact";
import CrmLead from "../../../models/CrmLead";
import { getIO } from "../../../libs/socket";
import { getBrazilianPhoneVariants } from "../../../helpers/normalizeContactNumber";
import logger from "../../../utils/logger";
import serializeCrmLead from "./serializeCrmLead";

interface Params {
  contact: Contact;
  companyId: number;
}

const normalizeDocument = (value?: string | null): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length ? digits : null;
};

const sanitizeName = (value?: string | null): string => (value || "").trim();

const isFallbackName = (value?: string | null): boolean =>
  /^Contato sem nome(?:\s+\d+)?$/i.test(sanitizeName(value));

const shouldSyncContactNameToLead = (
  contactName?: string | null,
  currentLeadName?: string | null,
  contactNumber?: string | null
): boolean => {
  const incomingName = sanitizeName(contactName);
  const currentName = sanitizeName(currentLeadName);
  const normalizedNumber = sanitizeName(contactNumber);

  if (!incomingName || incomingName === currentName) {
    return false;
  }

  if (isFallbackName(incomingName)) {
    return false;
  }

  if (normalizedNumber && incomingName === normalizedNumber) {
    return !currentName || isFallbackName(currentName);
  }

  return true;
};

const syncContactToLead = async ({
  contact,
  companyId
}: Params): Promise<void> => {
  if (contact.isGroup) {
    return;
  }

  const io = getIO();
  const normalizedPhone = contact.number || null;
  const phoneVariants = normalizedPhone
    ? getBrazilianPhoneVariants(normalizedPhone)
    : [];

  let lead = await CrmLead.findOne({
    where: {
      companyId,
      contactId: contact.id
    }
  });

  let action: "create" | "update" | null = null;

  if (!lead && phoneVariants.length > 0) {
    lead = await CrmLead.findOne({
      where: {
        companyId,
        contactId: { [Op.is]: null },
        phone: { [Op.in]: phoneVariants }
      },
      order: [["updatedAt", "DESC"]]
    });
  }

  if (!lead) {
    const normalizedDocument = normalizeDocument(contact.cpfCnpj);
    const email = contact.email || null;
    const name = contact.name || normalizedPhone || "Lead";

    lead = await CrmLead.create({
      companyId,
      contactId: contact.id,
      name,
      email,
      phone: normalizedPhone,
      document: normalizedDocument,
      leadStatus: "novo",
      lastActivityAt: new Date()
    });

    action = "create";
    logger.info(`Created new Lead ${lead.id} for Contact ${contact.id}`);
  } else {
    const updates: Partial<CrmLead> = {};
    const normalizedDocument = normalizeDocument(contact.cpfCnpj);

    if (!lead.contactId || lead.contactId !== contact.id) {
      updates.contactId = contact.id;
    }

    if (contact.number && contact.number !== lead.phone) {
      updates.phone = contact.number;
    }

    if (contact.email && contact.email !== lead.email) {
      updates.email = contact.email;
    }

    if (shouldSyncContactNameToLead(contact.name, lead.name, contact.number)) {
      updates.name = contact.name;
    }

    if (normalizedDocument && normalizedDocument !== lead.document) {
      updates.document = normalizedDocument;
    }

    if (Object.keys(updates).length > 0) {
      logger.info(`Syncing Contact ${contact.id} changes to Lead ${lead.id}:`, updates);
      await (lead as any).update(updates, { hooks: false });
      action = "update";
    }
  }

  if (action) {
    io.to(companyId.toString()).emit(`company-${companyId}-lead`, {
      action,
      lead: serializeCrmLead(lead)
    });
  }
};

export default syncContactToLead;
