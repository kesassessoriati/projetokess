import { Request, Response } from "express";
import { Op } from "sequelize";

import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";
import { SyncOneEmailChannelService } from "../services/EmailChannelServices/SyncEmailChannelService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import ShowPlanService from "../services/PlanService/ShowPlanService";
import { getPlanChannelLabel, isPlanChannelEnabled } from "../helpers/planChannelRules";

const hideSecrets = (row: Whatsapp) => {
  const plain = row.toJSON() as any;
  plain.emailImapPassword = "";
  plain.emailSmtpPassword = "";
  return plain;
};

const normalizeStatus = (value?: string) => {
  const status = (value || "").toUpperCase();
  if (!status) return "CONNECTED";
  return status;
};

const ensureEmailPlanEnabled = async (companyId: number) => {
  const company = await ShowCompanyService(companyId);
  const plan = await ShowPlanService(company.planId);

  if (!isPlanChannelEnabled(plan, { channel: "email" })) {
    throw new AppError(
      `Seu plano nÃ£o possui permissÃ£o para ${getPlanChannelLabel({ channel: "email" })}.`,
      403
    );
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  await ensureEmailPlanEnabled(companyId);
  const channels = await Whatsapp.findAll({
    where: { companyId, channel: "email" },
    order: [["updatedAt", "DESC"]]
  });
  return res.json(channels.map(hideSecrets));
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { emailChannelId } = req.params;
  await ensureEmailPlanEnabled(companyId);

  const channel = await Whatsapp.findOne({
    where: { id: emailChannelId, companyId, channel: "email" }
  });

  if (!channel) throw new AppError("Canal de e-mail nao encontrado.", 404);
  return res.json(hideSecrets(channel));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const payload = req.body || {};
  await ensureEmailPlanEnabled(companyId);

  if (!payload.name || !payload.emailAddress) {
    throw new AppError("Nome e e-mail de origem sao obrigatorios.", 400);
  }

  const emailAddress = String(payload.emailAddress).trim().toLowerCase();
  const exists = await Whatsapp.findOne({
    where: {
      companyId,
      channel: "email",
      [Op.or]: [
        { name: payload.name },
        { emailAddress }
      ]
    }
  });
  if (exists) {
    throw new AppError("Ja existe canal de e-mail com este nome ou endereco.", 400);
  }

  const channel = await Whatsapp.create({
    name: String(payload.name).trim(),
    channel: "email",
    status: normalizeStatus(payload.status),
    companyId,
    greetingMessage: "",
    queueIds: [],
    isDefault: false,
    emailAddress,
    emailDisplayName: payload.emailDisplayName || payload.name,
    emailSignature: payload.emailSignature || "",
    emailUseCompanySmtp: payload.emailUseCompanySmtp !== false,
    emailSmtpHost: payload.emailSmtpHost || null,
    emailSmtpPort: payload.emailSmtpPort || null,
    emailSmtpSecure: Boolean(payload.emailSmtpSecure),
    emailSmtpUser: payload.emailSmtpUser || null,
    emailSmtpPassword: payload.emailSmtpPassword || null,
    emailImapHost: payload.emailImapHost || null,
    emailImapPort: payload.emailImapPort || 993,
    emailImapSecure: payload.emailImapSecure !== false,
    emailImapUser: payload.emailImapUser || null,
    emailImapPassword: payload.emailImapPassword || null,
    emailSyncEnabled: payload.emailSyncEnabled !== false
  } as any);

  const io = getIO();
  const channelPayload = { action: "update", whatsapp: hideSecrets(channel) };
  io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, channelPayload);
  io.of(String(companyId)).emit(`company-${companyId}-channel`, channelPayload);

  return res.status(201).json(hideSecrets(channel));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { emailChannelId } = req.params;
  const payload = req.body || {};
  await ensureEmailPlanEnabled(companyId);

  const channel = await Whatsapp.findOne({
    where: { id: emailChannelId, companyId, channel: "email" }
  });

  if (!channel) throw new AppError("Canal de e-mail nao encontrado.", 404);

  const emailAddress = payload.emailAddress
    ? String(payload.emailAddress).trim().toLowerCase()
    : channel.emailAddress;

  const duplicate = await Whatsapp.findOne({
    where: {
      id: { [Op.ne]: channel.id },
      companyId,
      channel: "email",
      [Op.or]: [
        { name: payload.name || channel.name },
        { emailAddress }
      ]
    }
  });
  if (duplicate) {
    throw new AppError("Ja existe canal de e-mail com este nome ou endereco.", 400);
  }

  await channel.update({
    name: payload.name ?? channel.name,
    status: normalizeStatus(payload.status ?? channel.status),
    emailAddress,
    emailDisplayName: payload.emailDisplayName ?? channel.emailDisplayName,
    emailSignature: payload.emailSignature ?? channel.emailSignature,
    emailUseCompanySmtp:
      payload.emailUseCompanySmtp !== undefined
        ? Boolean(payload.emailUseCompanySmtp)
        : channel.emailUseCompanySmtp,
    emailSmtpHost: payload.emailSmtpHost ?? channel.emailSmtpHost,
    emailSmtpPort: payload.emailSmtpPort ?? channel.emailSmtpPort,
    emailSmtpSecure:
      payload.emailSmtpSecure !== undefined
        ? Boolean(payload.emailSmtpSecure)
        : channel.emailSmtpSecure,
    emailSmtpUser: payload.emailSmtpUser ?? channel.emailSmtpUser,
    emailSmtpPassword: payload.emailSmtpPassword || channel.emailSmtpPassword,
    emailImapHost: payload.emailImapHost ?? channel.emailImapHost,
    emailImapPort: payload.emailImapPort ?? channel.emailImapPort,
    emailImapSecure:
      payload.emailImapSecure !== undefined
        ? Boolean(payload.emailImapSecure)
        : channel.emailImapSecure,
    emailImapUser: payload.emailImapUser ?? channel.emailImapUser,
    emailImapPassword: payload.emailImapPassword || channel.emailImapPassword,
    emailSyncEnabled:
      payload.emailSyncEnabled !== undefined
        ? Boolean(payload.emailSyncEnabled)
        : channel.emailSyncEnabled
  } as any);

  const io = getIO();
  const channelPayload = { action: "update", whatsapp: hideSecrets(channel) };
  io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, channelPayload);
  io.of(String(companyId)).emit(`company-${companyId}-channel`, channelPayload);

  return res.json(hideSecrets(channel));
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { emailChannelId } = req.params;
  await ensureEmailPlanEnabled(companyId);

  const channel = await Whatsapp.findOne({
    where: { id: emailChannelId, companyId, channel: "email" }
  });

  if (!channel) throw new AppError("Canal de e-mail nao encontrado.", 404);

  await channel.destroy();

  const io = getIO();
  const deletePayload = { action: "delete", whatsappId: Number(emailChannelId) };
  io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, deletePayload);
  io.of(String(companyId)).emit(`company-${companyId}-channel`, deletePayload);

  return res.status(204).send();
};

export const syncNow = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { emailChannelId } = req.params;
  await ensureEmailPlanEnabled(companyId);
  const result = await SyncOneEmailChannelService(Number(emailChannelId), companyId);
  return res.json(result);
};
