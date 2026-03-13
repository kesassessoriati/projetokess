import { Op } from "sequelize";
import CrmClient from "../../models/CrmClient";
import logger from "../../utils/logger";

const INACTIVE_TAG = "cliente inativo";

const normalizeTags = (tags?: string | null): string[] =>
  String(tags || "")
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);

const ensureInactiveTag = (tags?: string | null): string => {
  const currentTags = normalizeTags(tags);
  const hasTag = currentTags.some(
    tag => tag.toLowerCase() === INACTIVE_TAG.toLowerCase()
  );

  if (!hasTag) {
    currentTags.push(INACTIVE_TAG);
  }

  return currentTags.join(", ");
};

const ProcessExpiredCrmClientsService = async (): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const clients = await CrmClient.findAll({
    where: {
      expirationDate: {
        [Op.ne]: null,
        [Op.lte]: today
      }
    }
  });

  for (const client of clients) {
    const nextTags = ensureInactiveTag(client.tags);
    const shouldUpdate = client.status !== "inactive" || nextTags !== (client.tags || "");

    if (!shouldUpdate) {
      continue;
    }

    await client.update({
      status: "inactive",
      tags: nextTags
    });

    logger.info(
      `[CRM Clients] Cliente ${client.id} marcado como inativo por vencimento em ${client.expirationDate}`
    );
  }
};

export default ProcessExpiredCrmClientsService;
