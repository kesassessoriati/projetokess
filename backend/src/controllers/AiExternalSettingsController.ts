import { Request, Response } from "express";
import GetOrCreateAiExternalSettingsService, {
  invalidateSettingsCache
} from "../services/AiExternalSettingsServices/GetOrCreateAiExternalSettingsService";

export const getSettings = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const forceRefresh = req.query.refresh === "1";

  if (forceRefresh) invalidateSettingsCache(companyId);

  const settings = await GetOrCreateAiExternalSettingsService(companyId, forceRefresh);
  return res.json(settings);
};

export const ensureSettings = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  invalidateSettingsCache(companyId);
  const settings = await GetOrCreateAiExternalSettingsService(companyId, true);
  return res.json(settings);
};
