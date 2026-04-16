import CrmLead from "../../../models/CrmLead";
import CrmClient from "../../../models/CrmClient";
import logger from "../../../utils/logger";
import Tag from "../../../models/Tag";
import { syncCrmLeadTags } from "../../CrmLeadService/helpers/syncCrmLeadTags";

interface Params {
  client: CrmClient;
  companyId: number;
}

const normalizeDocument = (value?: string | null): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length ? digits : null;
};

const syncClientToLead = async ({
  client,
  companyId
}: Params): Promise<void> => {
  const clientWithTags = await CrmClient.findOne({
    where: { id: client.id, companyId },
    include: [
      {
        model: Tag,
        as: "assignedTags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] },
        required: false
      }
    ]
  });

  const tagsInput =
    typeof client.tags === "string"
      ? client.tags
          .split(",")
          .map(name => name.trim())
          .filter(Boolean)
          .map(name => ({ name }))
      : clientWithTags?.assignedTags?.map(tag => ({
          id: tag.id,
          name: tag.name,
          color: tag.color
        })) || [];

  // Busca todos os leads associados a este cliente
  const leads = await CrmLead.findAll({
    where: {
      companyId,
      convertedClientId: client.id
    }
  });

  if (leads.length === 0) {
    logger.warn(`No leads found for Client ${client.id}`);
    return;
  }

  // Para cada lead, verifica se precisa sincronizar
  for (const lead of leads) {
    const updates: Partial<CrmLead> = {};
    const normalizedDocument = normalizeDocument(client.document);

    if (client.email && client.email !== lead.email) {
      updates.email = client.email;
    }

    if (client.phone && client.phone !== lead.phone) {
      updates.phone = client.phone;
    }

    if (client.name && client.name !== lead.name) {
      updates.name = client.name;
    }

    if (client.companyName && client.companyName !== lead.companyName) {
      updates.companyName = client.companyName;
    }

    if (client.address && client.address !== lead.address) {
      updates.address = client.address;
    }

    if (client.acquiredProduct && client.acquiredProduct !== lead.product) {
      updates.product = client.acquiredProduct;
    }

    if (client.paymentType && client.paymentType !== lead.paymentType) {
      updates.paymentType = client.paymentType;
    }

    if (client.purchaseType && client.purchaseType !== lead.purchaseType) {
      updates.purchaseType = client.purchaseType;
    }

    if (client.purchaseValue != null && client.purchaseValue !== lead.purchaseValue) {
      updates.purchaseValue = client.purchaseValue;
    }

    if (client.acquisitionDate && client.acquisitionDate !== lead.acquisitionDate) {
      updates.acquisitionDate = client.acquisitionDate;
    }

    if (normalizedDocument && normalizedDocument !== lead.document) {
      updates.document = normalizedDocument;
    }

    // Se há atualizações, aplica ao lead
    if (Object.keys(updates).length > 0) {
      logger.info(`Syncing Client ${client.id} changes to Lead ${lead.id}:`, updates);
      await lead.update(updates);
    }

    await syncCrmLeadTags(lead.id, companyId, tagsInput);
  }
};

export default syncClientToLead;
