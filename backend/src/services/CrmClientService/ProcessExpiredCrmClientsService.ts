import { Op } from "sequelize";
import CrmClient from "../../models/CrmClient";
import User from "../../models/User";
import Notification from "../../models/Notification";
import CreateNotificationService from "../NotificationServices/CreateNotificationService";
import logger from "../../utils/logger";
import { dispatchClientFlowTrigger } from "../FlowBuilderService/FlowTriggerPayloads";

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

    const notificationMetadata = {
      clientId: client.id,
      product: client.acquiredProduct,
      expirationDate: client.expirationDate
    };

    await client.update({
      status: "inactive",
      tags: nextTags
    });
    dispatchClientFlowTrigger("client_inactivated", client, { reason: "expiration" });

    logger.info(
      `[CRM Clients] Cliente ${client.id} marcado como inativo por vencimento em ${client.expirationDate}`
    );

    const usersToNotify = await User.findAll({
      where: {
        companyId: client.companyId,
        [Op.or]: [
          { profile: "admin" },
          ...(client.ownerUserId ? [{ id: client.ownerUserId }] : [])
        ]
      },
      attributes: ["id"]
    });

    for (const user of usersToNotify) {
      const alreadySent = await Notification.findOne({
        where: {
          companyId: client.companyId,
          userId: user.id,
          type: "crm_client_expired",
          metadata: notificationMetadata
        }
      });

      if (alreadySent) continue;

      await CreateNotificationService({
        companyId: client.companyId,
        userId: user.id,
        type: "crm_client_expired",
        title: "Produto de cliente vencido",
        body: `${client.name || "Cliente"}${client.acquiredProduct ? ` - ${client.acquiredProduct}` : ""} venceu em ${client.expirationDate}.`,
        metadata: notificationMetadata
      });
    }
  }
};

export default ProcessExpiredCrmClientsService;
