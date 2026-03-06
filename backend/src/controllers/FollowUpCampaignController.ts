// @ts-nocheck
import { Request, Response } from "express";
import { Op } from "sequelize";
import FollowUpCampaign from "../models/FollowUpCampaign";
import FollowUpStage from "../models/FollowUpStage";
import FollowUpLog from "../models/FollowUpLog";

// ── LIST ──────────────────────────────────────────────────────────────
export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const campaigns = await FollowUpCampaign.findAll({
    where: { companyId },
    include: [
      { model: FollowUpStage, as: "stages", order: [["order", "ASC"]] },
    ],
    order: [["createdAt", "DESC"]],
  });

  return res.json(campaigns);
};

// ── SHOW ──────────────────────────────────────────────────────────────
export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const campaign = await FollowUpCampaign.findOne({
    where: { id, companyId },
    include: [{ model: FollowUpStage, as: "stages", order: [["order", "ASC"]] }],
  });

  if (!campaign) return res.status(404).json({ error: "Not found" });
  return res.json(campaign);
};

// ── CREATE ────────────────────────────────────────────────────────────
export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, whatsappId, isActive, sourceType, stages } = req.body;

  const campaign = await FollowUpCampaign.create({
    name,
    companyId,
    whatsappId: whatsappId || null,
    isActive: isActive !== undefined ? isActive : true,
    sourceType: sourceType || "manual",
  });

  if (Array.isArray(stages) && stages.length) {
    await FollowUpStage.bulkCreate(
      stages.map((s, idx) => ({
        followUpCampaignId: campaign.id,
        order: s.order ?? idx + 1,
        delayMinutes: s.delayMinutes ?? 60,
        messageType: s.messageType ?? "text",
        message: s.message ?? "",
        buttons: s.buttons ?? null,
        isActive: s.isActive !== undefined ? s.isActive : true,
      }))
    );
  }

  const created = await FollowUpCampaign.findOne({
    where: { id: campaign.id },
    include: [{ model: FollowUpStage, as: "stages", order: [["order", "ASC"]] }],
  });

  return res.status(201).json(created);
};

// ── UPDATE ────────────────────────────────────────────────────────────
export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { name, whatsappId, isActive, sourceType, stages } = req.body;

  const campaign = await FollowUpCampaign.findOne({ where: { id, companyId } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  await campaign.update({
    name: name ?? campaign.name,
    whatsappId: whatsappId !== undefined ? whatsappId : campaign.whatsappId,
    isActive: isActive !== undefined ? isActive : campaign.isActive,
    sourceType: sourceType ?? campaign.sourceType,
  });

  // Replace stages if provided
  if (Array.isArray(stages)) {
    await FollowUpStage.destroy({ where: { followUpCampaignId: campaign.id } });
    if (stages.length) {
      await FollowUpStage.bulkCreate(
        stages.map((s, idx) => ({
          followUpCampaignId: campaign.id,
          order: s.order ?? idx + 1,
          delayMinutes: s.delayMinutes ?? 60,
          messageType: s.messageType ?? "text",
          message: s.message ?? "",
          buttons: s.buttons ?? null,
          isActive: s.isActive !== undefined ? s.isActive : true,
        }))
      );
    }
  }

  const updated = await FollowUpCampaign.findOne({
    where: { id: campaign.id },
    include: [{ model: FollowUpStage, as: "stages", order: [["order", "ASC"]] }],
  });

  return res.json(updated);
};

// ── DELETE ────────────────────────────────────────────────────────────
export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const campaign = await FollowUpCampaign.findOne({ where: { id, companyId } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  await campaign.destroy();
  return res.status(200).json({ ok: true });
};

// ── STATS ─────────────────────────────────────────────────────────────
export const stats = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const campaign = await FollowUpCampaign.findOne({ where: { id, companyId } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalSent, sentToday, responded] = await Promise.all([
    FollowUpLog.count({ where: { followUpCampaignId: campaign.id, status: "sent" } }),
    FollowUpLog.count({ where: { followUpCampaignId: campaign.id, status: "sent", sentAt: { [Op.gte]: today } } }),
    FollowUpLog.count({ where: { followUpCampaignId: campaign.id, status: "responded" } }),
  ]);

  const responseRate = totalSent > 0 ? Math.round((responded / totalSent) * 100) : 0;

  return res.json({ totalSent, sentToday, responded, responseRate });
};
