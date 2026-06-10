import path from "path";
import moment from "moment";
import { Op } from "sequelize";
import logger from "../../utils/logger";
import GroupCampaign from "../../models/GroupCampaign";
import GroupCampaignTarget from "../../models/GroupCampaignTarget";
import GroupCampaignLog from "../../models/GroupCampaignLog";
import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";
import { getIO } from "../../libs/socket";
import {
  sendButtonMessage,
  sendCarouselMessage,
  sendListMessage
} from "../../helpers/SendInteractiveMessage";
import { ProviderFactory } from "../whatsapp/providers/ProviderFactory";
import { dispatchGroupFlowTrigger } from "../FlowBuilderService/FlowTriggerPayloads";

const runningCampaigns = new Set<number>();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const emitCampaignUpdate = (companyId: number, payload: Record<string, any>) => {
  try {
    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-group-campaign`, payload);
  } catch (error) {
    // ignore socket errors
  }
};

const createCampaignLog = async (
  campaign: GroupCampaign,
  type: string,
  message: string,
  groupJid?: string,
  payload?: Record<string, any>
) => {
  const log = await GroupCampaignLog.create({
    companyId: campaign.companyId,
    campaignId: campaign.id,
    type,
    groupJid: groupJid || null,
    message,
    payload: payload || null
  });
  emitCampaignUpdate(campaign.companyId, { action: "log", campaignId: campaign.id, log });
};

const buildMentionsPayload = async (campaign: GroupCampaign, provider: any, groupJid: string) => {
  if (campaign.mentionsMode === "all") {
    const metadata = await provider.getGroupMetadata(groupJid);
    const mentions = (metadata?.participants || []).map((p: any) => p.id);
    const mentionText = mentions.map((m: string) => `@${String(m).split("@")[0]}`).join(" ");
    return { mentions, mentionText };
  }

  // ghost: participants in mention metadata only — text stays clean, no @names appended
  if (campaign.mentionsMode === "ghost") {
    const metadata = await provider.getGroupMetadata(groupJid);
    const mentions = (metadata?.participants || [])
      .map((p: any) => p.id)
      .filter(Boolean);
    logger.info(
      `[GroupCampaign] ghost mention companyId=${campaign.companyId} campaignId=${campaign.id} groupJid=${groupJid} participants=${mentions.length}`
    );
    return { mentions, mentionText: "" };
  }

  if (campaign.mentionsMode === "segmented") {
    const segmented = Array.isArray(campaign.segmentedMentions) ? campaign.segmentedMentions : [];
    const mentions = segmented.filter(Boolean).map((m: string) => (m.includes("@") ? m : `${m}@s.whatsapp.net`));
    const mentionText = mentions.map((m: string) => `@${String(m).split("@")[0]}`).join(" ");
    return { mentions, mentionText };
  }

  return { mentions: [], mentionText: "" };
};

const sendToTarget = async (campaign: GroupCampaign, target: GroupCampaignTarget): Promise<void> => {
  const connection = await Whatsapp.findOne({
    where: { id: campaign.whatsappId, companyId: campaign.companyId }
  });
  if (!connection) throw new Error("Conexão da campanha não encontrada.");
  if (connection.status !== "CONNECTED" && connection.status !== "qrcode") throw new Error("Conexão da campanha está desconectada.");

  const isWhatsMeow = connection.provider === "whatsmeow";

  // Ghost mention requires native Baileys/Whaileys mentions support
  if (campaign.mentionsMode === "ghost" && isWhatsMeow) {
    logger.warn(
      `[GroupCampaign] ghost mention unsupported provider=${connection.provider} companyId=${campaign.companyId} campaignId=${campaign.id} groupJid=${target.groupJid}`
    );
    throw new Error("Provider não suporta menção fantasma. Configure a conexão com Baileys ou Whaileys para usar este recurso.");
  }

  const wbot = isWhatsMeow ? null : getWbot(connection.id);
  const provider = ProviderFactory.createProvider(connection, wbot, campaign.companyId);
  const groupJid = target.groupJid;
  const { mentions, mentionText } = await buildMentionsPayload(campaign, provider, groupJid);

  const baseText = String(campaign.message || "");
  const text = mentionText ? `${baseText}\n\n${mentionText}`.trim() : baseText;

  if (campaign.mediaPath && campaign.mediaName) {
    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const filePath = path.join(publicFolder, `company${campaign.companyId}`, campaign.mediaPath);
    await provider.sendGroupMedia(groupJid, filePath, text);
    return;
  }

  if (campaign.messageType === "buttons" && Array.isArray(campaign.buttons) && campaign.buttons.length) {
    if (connection.provider === "whatsmeow") {
      // not fully supported yet by fallback adapter
      await provider.sendGroupMessage(groupJid, { text, buttons: campaign.buttons });
    } else {
      await sendButtonMessage(wbot, groupJid, text, "", campaign.buttons as any);
    }
    return;
  }

  if (campaign.messageType === "list" && Array.isArray(campaign.listItems) && campaign.listItems.length) {
    if (connection.provider === "whatsmeow") {
      await provider.sendGroupMessage(groupJid, {
        text,
        listItems: campaign.listItems,
        listButtonText: campaign.listButtonText,
        listFooter: campaign.listFooter
      });
    } else {
      await sendListMessage(wbot, groupJid, text, "Ver opções", campaign.listItems as any);
    }
    return;
  }

  if (
    campaign.messageType === "carousel" &&
    Array.isArray(campaign.carouselCards) &&
    campaign.carouselCards.length
  ) {
    if (connection.provider === "whatsmeow") {
      await provider.sendGroupMessage(groupJid, {
        text,
        carouselCards: campaign.carouselCards
      });
    } else {
      await sendCarouselMessage(wbot, groupJid, campaign.carouselCards as any);
    }
    return;
  }

  if (campaign.messageType === "poll") {
    const question = String(campaign.pollName || text || "").trim();
    const options = Array.isArray(campaign.pollOptions)
      ? campaign.pollOptions.filter(Boolean)
      : [];

    if (question && options.length >= 2) {
      const selectableCount = Math.max(
        1,
        Math.min(Number(campaign.pollSelectableCount) || 1, options.length)
      );

      if (connection.provider === "whatsmeow") {
        await provider.sendGroupMessage(groupJid, {
          poll: {
            name: question,
            values: options,
            selectableCount
          }
        });
      } else {
        await wbot.sendMessage(groupJid, {
          poll: {
            name: question,
            values: options,
            selectableCount
          }
        });
      }
      return;
    }
  }

  await provider.sendGroupMessage(groupJid, {
    text: text || " ",
    mentions: mentions.length ? mentions : undefined
  });
};

const applyRecurrence = async (campaign: GroupCampaign) => {
  const recurrence = String(campaign.recurrenceRule || "none");
  if (!["daily", "weekly"].includes(recurrence)) return;

  const baseDate = campaign.scheduledAt ? moment(campaign.scheduledAt) : moment();
  const next = recurrence === "daily" ? baseDate.add(1, "day") : baseDate.add(1, "week");

  await GroupCampaignTarget.update(
    {
      status: "PENDING",
      sentAt: null,
      lastAttemptAt: null,
      attempts: 0,
      errorMessage: null
    },
    { where: { campaignId: campaign.id, companyId: campaign.companyId } }
  );

  await campaign.update({
    status: "SCHEDULED",
    scheduledAt: next.toDate(),
    startedAt: null,
    completedAt: null,
    processedGroups: 0,
    successCount: 0,
    failedCount: 0,
    failureReason: null
  });
};

export const processGroupCampaignById = async (campaignId: number): Promise<void> => {
  if (runningCampaigns.has(campaignId)) return;
  runningCampaigns.add(campaignId);

  try {
    let campaign = await GroupCampaign.findByPk(campaignId);
    if (!campaign) return;
    if (["PAUSED", "CANCELED", "SENT", "FAILED"].includes(campaign.status)) return;
    if (campaign.status === "SCHEDULED" && campaign.scheduledAt && campaign.scheduledAt > new Date()) return;

    if (!campaign.startedAt) {
      await campaign.update({ status: "PROCESSING", startedAt: new Date(), failureReason: null });
      await createCampaignLog(campaign, "STARTED", "Campanha iniciada");
    } else if (campaign.status !== "PROCESSING") {
      await campaign.update({ status: "PROCESSING" });
    }

    const targets = await GroupCampaignTarget.findAll({
      where: {
        companyId: campaign.companyId,
        campaignId: campaign.id,
        status: "PENDING"
      },
      order: [["id", "ASC"]]
    });

    for (const target of targets) {
      campaign = await GroupCampaign.findByPk(campaign.id);
      if (!campaign) return;
      if (campaign.status === "PAUSED" || campaign.status === "CANCELED") {
        await createCampaignLog(campaign, "PAUSED", "Campanha pausada/cancelada durante processamento");
        return;
      }

      try {
        await sendToTarget(campaign, target);
        await target.update({
          status: "SENT",
          sentAt: new Date(),
          lastAttemptAt: new Date(),
          attempts: (target.attempts || 0) + 1,
          errorMessage: null
        });
        await campaign.update({
          processedGroups: (campaign.processedGroups || 0) + 1,
          successCount: (campaign.successCount || 0) + 1
        });
        await createCampaignLog(campaign, "TARGET_SENT", "Mensagem enviada com sucesso", target.groupJid);
        dispatchGroupFlowTrigger("group_message_sent", {
          companyId: campaign.companyId,
          whatsappId: campaign.whatsappId,
          groupJid: target.groupJid,
          subject: (target as any).groupName,
          message: campaign.message || "",
          metadata: {
            campaignId: campaign.id,
            targetId: target.id,
            messageType: campaign.messageType
          }
        });
      } catch (error) {
        await target.update({
          status: "FAILED",
          lastAttemptAt: new Date(),
          attempts: (target.attempts || 0) + 1,
          errorMessage: error?.message || "Falha no envio"
        });
        await campaign.update({
          processedGroups: (campaign.processedGroups || 0) + 1,
          failedCount: (campaign.failedCount || 0) + 1
        });
        await createCampaignLog(campaign, "TARGET_FAILED", error?.message || "Falha no envio", target.groupJid);
      }

      emitCampaignUpdate(campaign.companyId, { action: "progress", campaignId: campaign.id });
      const interval = Math.max(0, Number(campaign.intervalSeconds) || 0);
      if (interval > 0) {
        await delay(interval * 1000);
      }
    }

    campaign = await GroupCampaign.findByPk(campaign.id);
    if (!campaign) return;

    const pendingCount = await GroupCampaignTarget.count({
      where: { companyId: campaign.companyId, campaignId: campaign.id, status: "PENDING" }
    });

    if (pendingCount > 0) {
      await createCampaignLog(campaign, "INFO", "Campanha ainda possui alvos pendentes");
      return;
    }

    if ((campaign.failedCount || 0) > 0 && (campaign.successCount || 0) === 0) {
      await campaign.update({ status: "FAILED", completedAt: new Date(), failureReason: "Nenhum envio concluído com sucesso" });
      await createCampaignLog(campaign, "FAILED", "Campanha concluída com falhas");
      emitCampaignUpdate(campaign.companyId, { action: "failed", campaignId: campaign.id });
      return;
    }

    await campaign.update({ status: "SENT", completedAt: new Date(), failureReason: null });
    await createCampaignLog(campaign, "COMPLETED", "Campanha finalizada");
    emitCampaignUpdate(campaign.companyId, { action: "completed", campaignId: campaign.id });

    await applyRecurrence(campaign);
  } catch (error) {
    const campaign = await GroupCampaign.findByPk(campaignId);
    if (campaign) {
      await campaign.update({
        status: "FAILED",
        completedAt: new Date(),
        failureReason: error?.message || "Erro não identificado"
      });
      await createCampaignLog(campaign, "FAILED", error?.message || "Erro não identificado");
      emitCampaignUpdate(campaign.companyId, { action: "failed", campaignId: campaign.id });
    }
  } finally {
    runningCampaigns.delete(campaignId);
  }
};

export const processScheduledGroupCampaigns = async (): Promise<void> => {
  const now = new Date();
  const campaigns = await GroupCampaign.findAll({
    where: {
      status: { [Op.in]: ["SCHEDULED", "PROCESSING"] },
      [Op.or]: [
        { scheduledAt: null },
        { scheduledAt: { [Op.lte]: now } }
      ]
    },
    order: [["scheduledAt", "ASC"]],
    limit: 20
  });

  for (const campaign of campaigns) {
    processGroupCampaignById(campaign.id);
  }
};
