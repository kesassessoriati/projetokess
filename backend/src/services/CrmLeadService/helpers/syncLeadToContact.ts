import CrmLead from "../../../models/CrmLead";
import Contact from "../../../models/Contact";
import { isGenericContactName } from "../../ContactServices/ContactIdentityResolverService";
import logger from "../../../utils/logger";

interface Params {
  lead: CrmLead;
  companyId: number;
}

const syncLeadToContact = async ({
  lead,
  companyId
}: Params): Promise<void> => {
  if (!lead.contactId) {
    logger.warn(`Lead ${lead.id} has no associated contact`);
    return;
  }

  const contact = await Contact.findOne({
    where: {
      id: lead.contactId,
      companyId
    }
  });

  if (!contact) {
    logger.warn(`Contact ${lead.contactId} not found for Lead ${lead.id}`);
    return;
  }

  const updates: Partial<Contact> = {};

  // Sincroniza campos relevantes do Lead para o Contact
  if (lead.email && lead.email !== contact.email) {
    updates.email = lead.email;
  }

  if (lead.phone && lead.phone !== contact.number) {
    updates.number = lead.phone;
  }

  if (
    lead.name &&
    lead.name !== contact.name &&
    isGenericContactName(contact.name, contact.number, contact.lid)
  ) {
    updates.name = lead.name;
  }

  if (lead.document && lead.document !== contact.cpfCnpj) {
    updates.cpfCnpj = lead.document;
  }

  // Se há atualizações, aplica ao contato
  if (Object.keys(updates).length > 0) {
    logger.info(`Syncing Lead ${lead.id} changes to Contact ${contact.id}:`, updates);
    // Usa hooks: false para evitar ciclo Lead→Contact→Lead
    await (contact as any).update(updates, { hooks: false });
  }
};

export default syncLeadToContact;
