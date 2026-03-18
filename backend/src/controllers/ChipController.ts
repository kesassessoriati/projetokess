import { Request, Response } from "express";
import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Chip from "../models/Chip";
import {
  CHIP_EVENT_TYPES,
  applyChipLevelPreset,
  attachChipToWhatsapp,
  buildChipDashboard,
  createChipActivityLog,
  getChipDisplayLabel,
  getChipByIdOrThrow,
  getChipLogs,
  syncChipHealth,
  syncCompanyChips
} from "../services/ChipServices/ChipMonitoringService";

const ensureAdminForWrite = (req: Request) => {
  if (req.user.profile !== "admin") {
    throw new AppError("Apenas administradores podem alterar chips.", 403);
  }
};

const buildPayload = (body: any) => {
  const preset = body.warmupLevel !== undefined ? applyChipLevelPreset({ warmupLevel: body.warmupLevel } as any) : null;
  return {
    number: body.number || null,
    carrier: body.carrier,
    planType: body.planType,
    lastRechargeAt: body.lastRechargeAt || null,
    rechargePeriodicityDays: body.rechargePeriodicityDays != null ? Number(body.rechargePeriodicityDays) : 30,
    rechargeValue: body.rechargeValue != null ? String(body.rechargeValue) : "0",
    whatsappId: body.whatsappId ? Number(body.whatsappId) : null,
    device: body.device,
    responsible: body.responsible,
    activationDate: body.activationDate || null,
    notes: body.notes || null,
    warmupLevel: preset?.warmupLevel ?? body.warmupLevel ?? 1,
    warmupMessageLimit: preset?.warmupMessageLimit ?? body.warmupMessageLimit ?? 20,
    warmupMinInterval: preset?.warmupMinInterval ?? body.warmupMinInterval ?? 5,
    warmupMaxInterval: preset?.warmupMaxInterval ?? body.warmupMaxInterval ?? 15
  };
};

export const dashboard = async (req: Request, res: Response): Promise<Response> => {
  const data = await buildChipDashboard(req.user.companyId);
  return res.json(data);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "").trim();

  try {
    await syncCompanyChips(companyId, { syncChannels: true });
  } catch (syncErr) {
    console.warn("[ChipController.index] syncCompanyChips falhou, retornando chips sem sincronizar:", (syncErr as any)?.message);
  }

  const where: any = { companyId };
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { number: { [Op.iLike]: `%${search}%` } },
      { sourceConnectionName: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const chips = await Chip.findAll({
    where,
    order: [["updatedAt", "DESC"]]
  });

  return res.json(chips);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const chip = await getChipByIdOrThrow(Number(req.params.id), req.user.companyId);
  await syncChipHealth(chip);
  const logs = await getChipLogs(chip.id, chip.companyId, Number(req.query.limit) || 100);
  return res.json({ chip, logs });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  ensureAdminForWrite(req);
  const payload = buildPayload(req.body);

  const chip = await Chip.create({
    ...payload,
    companyId: req.user.companyId,
    status: payload.whatsappId ? "active" : "inactive"
  });

  if (payload.whatsappId) {
    await attachChipToWhatsapp(chip, payload.whatsappId);
  }

  await createChipActivityLog({
    chipId: chip.id,
    companyId: chip.companyId,
    eventType: CHIP_EVENT_TYPES.CONNECTION,
    description: `Chip ${getChipDisplayLabel(chip)} cadastrado no modulo de infraestrutura.`,
    metadata: { whatsappId: chip.whatsappId || null }
  });

  await syncChipHealth(chip);
  return res.status(201).json(chip);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  ensureAdminForWrite(req);
  const chip = await getChipByIdOrThrow(Number(req.params.id), req.user.companyId);
  const payload = buildPayload(req.body);

  if (chip.syncSource === "whatsapp_channel") {
    payload.number = chip.number || null;
    payload.whatsappId = chip.whatsappId || null;
  }

  await chip.update({
    ...payload,
    status: payload.whatsappId ? chip.status : "inactive"
  });

  if (req.body.whatsappId !== undefined) {
    await attachChipToWhatsapp(chip, payload.whatsappId);
  }

  await syncChipHealth(chip);
  return res.json(chip);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  ensureAdminForWrite(req);
  const chip = await getChipByIdOrThrow(Number(req.params.id), req.user.companyId);
  await chip.destroy();
  return res.status(204).send();
};

export const recharge = async (req: Request, res: Response): Promise<Response> => {
  ensureAdminForWrite(req);
  const chip = await getChipByIdOrThrow(Number(req.params.id), req.user.companyId);
  const lastRechargeAt = req.body.lastRechargeAt || new Date().toISOString().slice(0, 10);
  const rechargeValue = req.body.rechargeValue != null ? String(req.body.rechargeValue) : chip.rechargeValue;

  await chip.update({ lastRechargeAt, rechargeValue });

  await createChipActivityLog({
    chipId: chip.id,
    companyId: chip.companyId,
    eventType: CHIP_EVENT_TYPES.RECHARGE,
    description: `Recarga registrada para o chip ${getChipDisplayLabel(chip)}.`,
    metadata: { rechargeValue, lastRechargeAt }
  });

  await syncChipHealth(chip);
  return res.json(chip);
};

export const logs = async (req: Request, res: Response): Promise<Response> => {
  const chip = await getChipByIdOrThrow(Number(req.params.id), req.user.companyId);
  const records = await getChipLogs(chip.id, chip.companyId, Number(req.query.limit) || 100);
  return res.json(records);
};

export const linkWhatsapp = async (req: Request, res: Response): Promise<Response> => {
  ensureAdminForWrite(req);
  const chip = await getChipByIdOrThrow(Number(req.params.id), req.user.companyId);
  await attachChipToWhatsapp(chip, req.body.whatsappId ? Number(req.body.whatsappId) : null);
  await syncChipHealth(chip);
  return res.json(chip);
};

export const refreshMonitoring = async (req: Request, res: Response): Promise<Response> => {
  ensureAdminForWrite(req);
  const chips = await syncCompanyChips(req.user.companyId, { syncChannels: true });
  return res.json({ success: true, count: chips.length });
};
