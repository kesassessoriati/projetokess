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
        phone: { [Op.in]: phoneVariants }
      },
      order: [["updatedAt", "DESC"]]
    });
  }

  if (!lead && contact.email) {
    lead = await CrmLead.findOne({
      where: {
        companyId,
        email: contact.email
      },
      order: [["updatedAt", "DESC"]]
    });
  }

  if (!lead) {
    const normalizedDocument = normalizeDocument(contact.cpfCnpj);
    const email = contact.email || null;
    const name = contact.name || normalizedPhone || "Lead";

    try {
      lead = await CrmLead.create({
        companyId,
        contactId: contact.id,
        name,
        email,
        phone: normalizedPhone,
        document: normalizedDocument,
        status: "novo",
        leadStatus: "novo",
        lastActivityAt: new Date()
      });
      action = "create";
      logger.info(`Created new Lead ${lead.id} for Contact ${contact.id}`);
    } catch (createErr) {
      if (createErr.name === "SequelizeUniqueConstraintError") {
        logger.warn(
          `CrmLead.create unique constraint error for contact ${contact.id}. Attempting to resolve by finding existing lead.`
        );
        lead = await CrmLead.findOne({
          where: {
            companyId,
            [Op.or]: [
              normalizedPhone ? { phone: { [Op.in]: phoneVariants } } : null,
              email ? { email } : null
            ].filter(Boolean) as any
          },
          order: [["updatedAt", "DESC"]]
        });

        if (lead) {
          // Apenas vincula o contactId — não toca no phone para evitar nova
          // violação de constraint caso o lead encontrado seja uma variante
          // (ex: com/sem 9º dígito) e já exista outro lead com o número alvo.
          try {
            await (lead as any).update({ contactId: contact.id }, { hooks: false });
            action = "update";
            logger.info(`Resolved constraint conflict: linked Contact ${contact.id} to existing Lead ${lead.id}`);
          } catch (updateErr) {
            logger.warn(`syncContactToLead: recovery update failed for lead ${lead.id}: ${updateErr.message}`);
            // Não re-lança — o lead existe e o vínculo é secundário
          }
        } else {
          // O lead deve existir (ele causou a constraint), mas não foi localizado.
          // Não lança — deixa o fluxo continuar sem travar o QuickSend.
          logger.error(
            `syncContactToLead: lead not found after constraint error for company ${companyId}, phone ${normalizedPhone}`
          );
        }
      } else {
        throw createErr;
      }
    }
  } else {
    const updates: Partial<CrmLead> = {};
    const normalizedDocument = normalizeDocument(contact.cpfCnpj);

    if (!lead.contactId || lead.contactId !== contact.id) {
      updates.contactId = contact.id;
    }

    if (contact.number && contact.number !== lead.phone) {
      // Verifica se o novo número conflitaria com outro lead antes de atualizar
      const phoneConflict = await CrmLead.findOne({
        where: {
          companyId,
          phone: contact.number,
          id: { [Op.ne]: lead.id }
        }
      });
      if (!phoneConflict) {
        updates.phone = contact.number;
      } else {
        logger.warn(
          `syncContactToLead: skip phone update for lead ${lead.id} — "${contact.number}" already in use by lead ${phoneConflict.id}`
        );
      }
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
    if (!lead.status) {
      updates.status = lead.leadStatus || "novo";
    }
    if (!lead.leadStatus) {
      updates.leadStatus = lead.status || "novo";
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
