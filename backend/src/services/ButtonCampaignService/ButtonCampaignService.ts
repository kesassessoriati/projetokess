import ButtonCampaign from "../../models/ButtonCampaign";
import ButtonCampaignShipping from "../../models/ButtonCampaignShipping";
import Whatsapp from "../../models/Whatsapp";
import { getWbotWhaileys } from "../../libs/wbotWhaileys";
import { getWbot } from "../../libs/wbot";
import {
  sendButtonMessage,
  sendListMessage,
  InteractiveButton,
  ListSection
} from "../../helpers/SendInteractiveMessage";
import logger from "../../utils/logger";
import { resolveDispatchWhatsapp } from "../ChipServices/ChipRoutingService";

interface CreateInput {
  companyId: number;
  whatsappId: number;
  dispatchMode?: "fixed" | "round_robin";
  chipIds?: number[];
  name: string;
  messageType: "buttons" | "list";
  message: string;
  footer?: string;
  buttons?: InteractiveButton[];
  listSections?: ListSection[];
  listButtonText?: string;
  targetNumbers: string[];
  intervalSeconds?: number;
  scheduledAt?: string;
}

interface UpdateInput extends Partial<CreateInput> {
  status?: string;
}

function sanitizeNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

function buildJid(number: string): string {
  const clean = sanitizeNumber(number);
  return `${clean}@s.whatsapp.net`;
}

async function getWbotForWhatsapp(whatsappId: number): Promise<any> {
  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) throw new Error(`Whatsapp ${whatsappId} nao encontrado`);

  if (whatsapp.channel === "whatsapp_whaileys") {
    return getWbotWhaileys(whatsappId);
  }
  return getWbot(whatsappId);
}

export const createButtonCampaign = async (
  data: CreateInput
): Promise<ButtonCampaign> => {
  const campaign = await ButtonCampaign.create({
    companyId: data.companyId,
    whatsappId: data.whatsappId,
    dispatchMode: data.dispatchMode || "fixed",
    chipIds: Array.isArray(data.chipIds) ? data.chipIds.map(Number).filter(Boolean) : [],
    name: data.name,
    messageType: data.messageType || "buttons",
    message: data.message,
    footer: data.footer || "",
    buttons: data.buttons || [],
    listSections: data.listSections || [],
    listButtonText: data.listButtonText || "Ver opcoes",
    targetNumbers: data.targetNumbers || [],
    intervalSeconds: data.intervalSeconds ?? 3,
    totalTargets: (data.targetNumbers || []).length,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    status: "DRAFT"
  });

  return campaign;
};

export const listButtonCampaigns = async (
  companyId: number,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
): Promise<{ rows: ButtonCampaign[]; count: number }> => {
  const offset = (page - 1) * limit;
  return ButtonCampaign.findAndCountAll({
    where: { companyId },
    include: [{ model: Whatsapp, attributes: ["id", "name", "channel"] }],
    order: [["createdAt", "DESC"]],
    limit,
    offset
  });
};

export const showButtonCampaign = async (
  id: number,
  companyId: number
): Promise<ButtonCampaign> => {
  const campaign = await ButtonCampaign.findOne({
    where: { id, companyId },
    include: [
      { model: Whatsapp, attributes: ["id", "name", "channel"] },
      {
        model: ButtonCampaignShipping,
        as: "shippings",
        limit: 100,
        order: [["createdAt", "DESC"]]
      }
    ]
  });
  if (!campaign) throw new Error("Campanha nao encontrada");
  return campaign;
};

export const updateButtonCampaign = async (
  id: number,
  companyId: number,
  data: UpdateInput
): Promise<ButtonCampaign> => {
  const campaign = await ButtonCampaign.findOne({ where: { id, companyId } });
  if (!campaign) throw new Error("Campanha nao encontrada");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.whatsappId !== undefined) updateData.whatsappId = data.whatsappId;
  if (data.dispatchMode !== undefined) updateData.dispatchMode = data.dispatchMode;
  if (data.chipIds !== undefined) updateData.chipIds = data.chipIds.map(Number).filter(Boolean);
  if (data.messageType !== undefined) updateData.messageType = data.messageType;
  if (data.message !== undefined) updateData.message = data.message;
  if (data.footer !== undefined) updateData.footer = data.footer;
  if (data.buttons !== undefined) updateData.buttons = data.buttons;
  if (data.listSections !== undefined) updateData.listSections = data.listSections;
  if (data.listButtonText !== undefined) updateData.listButtonText = data.listButtonText;
  if (data.intervalSeconds !== undefined) updateData.intervalSeconds = data.intervalSeconds;
  if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.targetNumbers !== undefined) {
    updateData.targetNumbers = data.targetNumbers;
    updateData.totalTargets = data.targetNumbers.length;
  }

  await campaign.update(updateData);
  return campaign;
};

export const deleteButtonCampaign = async (
  id: number,
  companyId: number
): Promise<void> => {
  const campaign = await ButtonCampaign.findOne({ where: { id, companyId } });
  if (!campaign) throw new Error("Campanha nao encontrada");
  await ButtonCampaignShipping.destroy({ where: { campaignId: id } });
  await campaign.destroy();
};

export const executeButtonCampaign = async (
  id: number,
  companyId: number
): Promise<void> => {
  const campaign = await ButtonCampaign.findOne({ where: { id, companyId } });
  if (!campaign) throw new Error("Campanha nao encontrada");
  if (campaign.status === "SENDING") throw new Error("Campanha ja esta sendo enviada");

  await campaign.update({
    status: "SENDING",
    startedAt: new Date(),
    processedTargets: 0,
    successCount: 0,
    failedCount: 0,
    rotationCursor: 0
  });

  const numbers = (campaign.targetNumbers as string[]) || [];
  await ButtonCampaignShipping.destroy({ where: { campaignId: id } });

  const shippings = await ButtonCampaignShipping.bulkCreate(
    numbers.map(number => ({
      companyId,
      campaignId: id,
      number: sanitizeNumber(number),
      status: "PENDING"
    }))
  );

  setImmediate(() => processCampaign(campaign, shippings));
};

async function processCampaign(
  campaign: ButtonCampaign,
  shippings: ButtonCampaignShipping[]
): Promise<void> {
  let success = 0;
  let failed = 0;

  for (const shipping of shippings) {
    const freshCampaign = await ButtonCampaign.findByPk(campaign.id);
    if (!freshCampaign || freshCampaign.status === "CANCELLED") {
      await campaign.update({ status: "CANCELLED", completedAt: new Date() });
      return;
    }

    const routing = await resolveDispatchWhatsapp({
      companyId: freshCampaign.companyId,
      dispatchMode: freshCampaign.dispatchMode,
      chipIds: freshCampaign.chipIds,
      fallbackWhatsappId: freshCampaign.whatsappId,
      rotationCursor: freshCampaign.rotationCursor
    });

    if (!routing.whatsappId) {
      await campaign.update({
        status: "FAILED",
        failureReason: "Nenhum chip ativo disponivel.",
        completedAt: new Date()
      });
      return;
    }

    let wbot: any;
    try {
      wbot = await getWbotForWhatsapp(routing.whatsappId);
    } catch (err) {
      logger.error(`[ButtonCampaign] Erro ao obter wbot: ${err}`);
      await campaign.update({ status: "FAILED", failureReason: String(err), completedAt: new Date() });
      return;
    }

    const jid = buildJid(shipping.number);

    try {
      if (freshCampaign.messageType === "list") {
        await sendListMessage(
          wbot,
          jid,
          freshCampaign.message,
          freshCampaign.listButtonText || "Ver opcoes",
          (freshCampaign.listSections as any[]) || [],
          freshCampaign.footer || undefined
        );
      } else {
        await sendButtonMessage(
          wbot,
          jid,
          freshCampaign.message,
          freshCampaign.footer || "",
          (freshCampaign.buttons as InteractiveButton[]) || []
        );
      }

      await shipping.update({ status: "SENT", sentAt: new Date() });
      success++;
    } catch (err) {
      logger.error(`[ButtonCampaign] Erro ao enviar para ${shipping.number}: ${err}`);
      await shipping.update({ status: "FAILED", errorMessage: String(err) });
      failed++;
    }

    await campaign.update({
      processedTargets: success + failed,
      successCount: success,
      failedCount: failed,
      rotationCursor: freshCampaign.dispatchMode === "round_robin" ? routing.nextCursor : freshCampaign.rotationCursor
    });

    const interval = (freshCampaign.intervalSeconds || 3) * 1000;
    if (interval > 0 && (success + failed) < shippings.length) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  await campaign.update({
    status: "COMPLETED",
    completedAt: new Date(),
    processedTargets: success + failed,
    successCount: success,
    failedCount: failed
  });

  logger.info(`[ButtonCampaign] Campanha ${campaign.id} concluida: ${success} enviados, ${failed} falhas`);
}
