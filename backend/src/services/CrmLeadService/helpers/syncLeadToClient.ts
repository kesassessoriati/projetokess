import { Op } from "sequelize";
import CrmLead from "../../../models/CrmLead";
import CrmClient from "../../../models/CrmClient";
import CrmClientContact from "../../../models/CrmClientContact";
import Contact from "../../../models/Contact";
import { syncCrmClientTags } from "../../CrmClientService/helpers/syncCrmClientTags";

const sanitizeDigits = (value?: string | null): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length ? digits : null;
};

const resolvePhoneCandidates = (phone?: string | null): string[] => {
  const digits = sanitizeDigits(phone);
  if (!digits) return [];
  const variants = [digits];
  if (digits.startsWith("55") && digits.length > 2) {
    variants.push(digits.slice(2));
  }
  return [...new Set(variants)];
};

const syncLeadToClient = async (lead: CrmLead): Promise<CrmClient | null> => {
  if (!lead) return null;

  // Só sincroniza se o status do Lead for 'convertido'
  if (lead.leadStatus !== "convertido" && lead.status !== "convertido") {
    return null;
  }

  let contact: Contact | null = null;
  if (lead.contactId) {
    contact = await Contact.findOne({
      where: { id: lead.contactId, companyId: lead.companyId }
    });
  }

  const normalizedDocument =
    sanitizeDigits(lead.document) || sanitizeDigits(contact?.cpfCnpj);
  const normalizedPhone =
    sanitizeDigits(lead.phone) || sanitizeDigits(contact?.number);
  const phoneCandidates = resolvePhoneCandidates(normalizedPhone || undefined);
  const leadWithTags = await CrmLead.findOne({ where: { id: lead.id, companyId: lead.companyId }, include: ["tags"] });
  const tagsStr = leadWithTags?.tags?.map(t => t.name).join(", ") || "";
  const tagsInput =
    leadWithTags?.tags?.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color
    })) || [];

  const email = lead.email || contact?.email || null;
  const name = lead.name || contact?.name || normalizedPhone || "Cliente";

  const orConditions: any[] = [];

  if (lead.contactId) {
    orConditions.push({ contactId: lead.contactId });
  }

  if (normalizedDocument) {
    orConditions.push({ document: normalizedDocument });
  }

  if (email) {
    orConditions.push({ email });
  }

  phoneCandidates.forEach(value => {
    orConditions.push({ phone: value });
  });

  let client: CrmClient | null = null;

  if (orConditions.length > 0) {
    client = await CrmClient.findOne({
      where: {
        companyId: lead.companyId,
        [Op.or]: orConditions
      }
    });
  }

  if (!client) {
    client = await CrmClient.create({
      companyId: lead.companyId,
      contactId: contact?.id || lead.contactId || null,
      type: "pf",
      name,
      companyName: lead.companyName,
      document: normalizedDocument || null,
      birthDate: lead.birthDate || contact?.birthday || null,
      email,
      phone: normalizedPhone || null,
      address: lead.address || null,
      status: "active",
      clientSince: lead.clientSince || new Date(),
      acquiredProduct: lead.product || null,
      paymentType: lead.paymentType || null,
      purchaseType: lead.purchaseType || null,
      purchaseValue: lead.purchaseValue != null ? lead.purchaseValue : null,
      acquisitionDate: lead.acquisitionDate || null,
      ownerUserId: lead.ownerUserId,
      notes: lead.notes,
      decisorName: lead.decisionMakerName,
      decisorPhone: lead.decisionMakerPhone,
      gmn: lead.gmn,
      site: lead.website,
      instagram: lead.instagram,
      linkedin: lead.linkedin,
      cargo: lead.position,
      origem: lead.source,
      campanhaTag: lead.campaign,
      temperatura: lead.temperature,
      score: lead.score,
      tags: tagsStr
    });
  } else {
    const updates: Partial<CrmClient> = {};
    if (contact?.id && client.contactId !== contact.id) {
      updates.contactId = contact.id;
    } else if (!client.contactId && lead.contactId) {
      updates.contactId = lead.contactId;
    }
    if (normalizedDocument && normalizedDocument !== client.document) {
      updates.document = normalizedDocument;
    }
    if (email && email !== client.email) {
      updates.email = email;
    }
    if (normalizedPhone && normalizedPhone !== client.phone) {
      updates.phone = normalizedPhone;
    }
    if (!client.name && name) {
      updates.name = name;
    }
    if (lead.companyName && lead.companyName !== client.companyName) {
      updates.companyName = lead.companyName;
    }
    if (lead.birthDate && lead.birthDate !== client.birthDate) {
      updates.birthDate = lead.birthDate;
    }
    if (lead.address && lead.address !== client.address) {
      updates.address = lead.address;
    }
    if (lead.clientSince && lead.clientSince !== client.clientSince) {
      updates.clientSince = lead.clientSince;
    }
    if (lead.product && lead.product !== client.acquiredProduct) {
      updates.acquiredProduct = lead.product;
    }
    if (lead.paymentType && lead.paymentType !== client.paymentType) {
      updates.paymentType = lead.paymentType;
    }
    if (lead.purchaseType && lead.purchaseType !== client.purchaseType) {
      updates.purchaseType = lead.purchaseType;
    }
    if (lead.purchaseValue != null && lead.purchaseValue !== client.purchaseValue) {
      updates.purchaseValue = lead.purchaseValue;
    }
    if (lead.acquisitionDate && lead.acquisitionDate !== client.acquisitionDate) {
      updates.acquisitionDate = lead.acquisitionDate;
    }
    if (
      contact?.birthday &&
      !lead.birthDate &&
      contact.birthday !== client.birthDate
    ) {
      updates.birthDate = contact.birthday;
    }
    if (lead.ownerUserId && lead.ownerUserId !== client.ownerUserId) {
      updates.ownerUserId = lead.ownerUserId;
    }
    if (lead.decisionMakerName && lead.decisionMakerName !== client.decisorName) {
      updates.decisorName = lead.decisionMakerName;
    }
    if (lead.decisionMakerPhone && lead.decisionMakerPhone !== client.decisorPhone) {
      updates.decisorPhone = lead.decisionMakerPhone;
    }
    if (lead.gmn && lead.gmn !== client.gmn) {
      updates.gmn = lead.gmn;
    }
    if (lead.website && lead.website !== client.site) {
      updates.site = lead.website;
    }
    if (lead.instagram && lead.instagram !== client.instagram) {
      updates.instagram = lead.instagram;
    }
    if (lead.linkedin && lead.linkedin !== client.linkedin) {
      updates.linkedin = lead.linkedin;
    }
    if (lead.position && lead.position !== client.cargo) {
      updates.cargo = lead.position;
    }
    if (lead.source && lead.source !== client.origem) {
      updates.origem = lead.source;
    }
    if (lead.campaign && lead.campaign !== client.campanhaTag) {
      updates.campanhaTag = lead.campaign;
    }
    if (lead.temperature && lead.temperature !== client.temperatura) {
      updates.temperatura = lead.temperature;
    }
    if (lead.score !== undefined && lead.score !== client.score) {
      updates.score = lead.score;
    }
    if (lead.notes && lead.notes !== client.notes) {
      updates.notes = lead.notes;
    }
    if (tagsStr && tagsStr !== client.tags) {
      updates.tags = tagsStr;
    }

    if (Object.keys(updates).length) {
      await client.update(updates);
    }
  }

  await syncCrmClientTags(client.id, lead.companyId, tagsInput);

  const effectiveContactId =
    contact?.id || lead.contactId || client.contactId || null;

  if (effectiveContactId) {
    await CrmClientContact.findOrCreate({
      where: {
        clientId: client.id,
        contactId: effectiveContactId
      },
      defaults: {
        clientId: client.id,
        contactId: effectiveContactId
      }
    });
  }

  // Usa hooks: false para evitar loop infinito com @AfterUpdate syncToClient
  await (lead as any).update({
    contactId: effectiveContactId || lead.contactId || null,
    convertedClientId: client.id,
    convertedAt: lead.convertedAt || new Date(),
    leadStatus: lead.leadStatus,
    document: normalizedDocument || lead.document || null,
    email,
    phone: normalizedPhone || lead.phone || null
  }, { hooks: false });

  return client;
};

export default syncLeadToClient;
