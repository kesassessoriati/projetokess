import { Op } from "sequelize";

import Contact from "../../models/Contact";
import CrmLead from "../../models/CrmLead";
import { getBrazilianPhoneVariants, formatPhoneFallback } from "../../helpers/normalizeContactNumber";
import logger from "../../utils/logger";

interface Params {
  contact: Contact;
  companyId: number;
  pushName?: string | null;
  profilePicUrl?: string | null;
}

interface HooklessUpdateModel<T> {
  update(values: object, options?: { hooks?: boolean }): Promise<T>;
}

const sanitize = (value?: string | null): string => String(value || "").trim();

export const isGenericContactName = (
  value?: string | null,
  referenceNumber?: string | null,
  referenceLid?: string | null
): boolean => {
  const name = sanitize(value);
  if (!name) return true;
  if (/^Contato sem nome(?:\s+\d+)?$/i.test(name)) return true;
  if (/^Lead$/i.test(name)) return true;
  if (/^lid[-\s]?/i.test(name)) return true;
  if (referenceNumber && name === referenceNumber) return true;
  if (referenceLid && name === referenceLid) return true;
  if (/^\+?\d[\d\s\-()]{5,}$/.test(name)) return true;
  return false;
};

const leadDisplayName = (lead?: CrmLead | null): string => {
  if (!lead) return "";
  return (
    sanitize(lead.name) ||
    sanitize(lead.companyName) ||
    sanitize(lead.decisionMakerName)
  );
};

const findLeadForContact = async (
  contact: Contact,
  companyId: number
): Promise<CrmLead | null> => {
  let lead = await CrmLead.findOne({
    where: { companyId, contactId: contact.id },
    order: [["updatedAt", "DESC"]]
  });

  if (lead || !contact.number) {
    return lead;
  }

  const phoneVariants = getBrazilianPhoneVariants(contact.number);
  if (!phoneVariants.length) {
    return null;
  }

  lead = await CrmLead.findOne({
    where: {
      companyId,
      phone: { [Op.in]: phoneVariants }
    },
    order: [
      ["contactId", "DESC"],
      ["updatedAt", "DESC"]
    ]
  });

  return lead;
};

const hasRealPicture = (contact: Contact): boolean => {
  const storedPicture = contact.getDataValue("urlPicture");
  const profilePicUrl = sanitize(contact.profilePicUrl);
  return Boolean(
    (storedPicture && storedPicture !== "nopicture.png") ||
      (profilePicUrl && !profilePicUrl.includes("nopicture.png"))
  );
};

const ContactIdentityResolverService = async ({
  contact,
  companyId,
  pushName,
  profilePicUrl
}: Params): Promise<Contact> => {
  if (!contact || contact.isGroup) {
    return contact;
  }

  const lead = await findLeadForContact(contact, companyId);
  const updates: Partial<Contact> = {};

  if (lead && lead.contactId !== contact.id) {
    await (lead as unknown as HooklessUpdateModel<CrmLead>).update(
      { contactId: contact.id },
      { hooks: false }
    );
    logger.info(
      {
        companyId,
        contactId: contact.id,
        leadId: lead.id
      },
      "[ContactIdentity] linked lead to contact"
    );
  }

  const currentNameIsGeneric = isGenericContactName(
    contact.name,
    contact.number,
    contact.lid
  );
  const leadName = leadDisplayName(lead);
  const cleanPushName = sanitize(pushName);
  const nextName =
    leadName ||
    (!isGenericContactName(cleanPushName, contact.number, contact.lid)
      ? cleanPushName
      : "") ||
    formatPhoneFallback(contact.number);

  if (currentNameIsGeneric && nextName && nextName !== contact.name) {
    updates.name = nextName;
  }

  if (
    profilePicUrl &&
    !profilePicUrl.includes("nopicture.png") &&
    !hasRealPicture(contact)
  ) {
    updates.profilePicUrl = profilePicUrl;
  }

  if (Object.keys(updates).length > 0) {
    await (contact as unknown as HooklessUpdateModel<Contact>).update(updates, {
      hooks: false
    });
    logger.info(
      {
        companyId,
        contactId: contact.id,
        leadId: lead?.id,
        updatedFields: Object.keys(updates)
      },
      "[ContactIdentity] enriched contact identity"
    );
    await contact.reload();
  }

  return contact;
};

export default ContactIdentityResolverService;
