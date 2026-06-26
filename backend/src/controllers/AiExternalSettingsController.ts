import { Request, Response } from "express";
import GetOrCreateAiExternalSettingsService, {
  invalidateSettingsCache
} from "../services/AiExternalSettingsServices/GetOrCreateAiExternalSettingsService";
import SaveAiExternalCustomStagesService from "../services/AiExternalSettingsServices/SaveAiExternalCustomStagesService";

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

export const updateCustomStages = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  // companyId vem SEMPRE do JWT; nunca do body.
  const { custom_stages: customStages } = req.body;
  const settings = await SaveAiExternalCustomStagesService({ companyId, customStages });
  return res.json(settings);
};
