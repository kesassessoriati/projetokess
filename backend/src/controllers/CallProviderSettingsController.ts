import { Request, Response } from "express";
import {
  getCallProviderSettings,
  upsertCallProviderSettings
} from "../services/CallProviderServices/CallProviderSettingsService";
import { normalizeCallProvider } from "../services/CallProviderServices/CallProviderTypes";
import { startWavoipCall } from "../services/CallProviderServices/WavoipProviderService";
import AppError from "../errors/AppError";

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const settings = await getCallProviderSettings(Number(companyId));

  return res.json(settings);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const settings = await upsertCallProviderSettings({
    ...req.body,
    companyId: Number(companyId)
  });

  return res.json(settings);
};

export const start = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const provider = normalizeCallProvider(req.body?.provider || "wavoip");
  const toNumber = String(req.body?.toNumber || "").replace(/\D/g, "");

  if (!toNumber) {
    throw new AppError("Numero de destino obrigatorio.", 400);
  }

  if (provider !== "wavoip") {
    throw new AppError("Provider nao suportado por este endpoint.", 400);
  }

  const result = await startWavoipCall({
    companyId: Number(companyId),
    userId: Number(userId),
    provider,
    toNumber,
    contactId: req.body?.contactId || null,
    ticketId: req.body?.ticketId || null,
    leadId: req.body?.leadId || null,
    opportunityId: req.body?.opportunityId || null,
    metadata: {
      source: req.body?.source || "manual"
    }
  });

  return res.status(202).json(result);
};
