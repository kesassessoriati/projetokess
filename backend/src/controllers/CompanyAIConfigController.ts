import { Request, Response } from "express";
import * as Yup from "yup";
import Company from "../models/Company";
import AppError from "../errors/AppError";
import {
  getCompanyAiSettings,
  upsertCompanyAiSetting
} from "../services/AIProviderService/AIProviderService";
import { getStoredProviderModels } from "../services/AIProviderService/AIModelCatalogService";

const updateSchema = Yup.object().shape({
  aiUsageMode: Yup.string().oneOf(["system", "own"]).optional(),
  aiPreferredProvider: Yup.string().oneOf(["openai", "gemini", "openrouter"]).optional(),
  openaiApiKey: Yup.string().nullable().optional(),
  geminiApiKey: Yup.string().nullable().optional(),
  openrouterApiKey: Yup.string().nullable().optional()
});

const ensureOwnership = async (requestCompanyId: number, targetCompanyId: number) => {
  if (requestCompanyId !== targetCompanyId) {
    throw new AppError("Você não possui permissão para acessar esta configuração.", 403);
  }
};

const getGlobalModels = async () => ({
  openai: await getStoredProviderModels("openai"),
  gemini: await getStoredProviderModels("gemini"),
  openrouter: await getStoredProviderModels("openrouter")
});

export const show = async (req: Request, res: Response): Promise<Response> => {
  const requestCompanyId = Number(req.user.companyId);
  const targetCompanyId = Number(req.params.companyId || requestCompanyId);

  await ensureOwnership(requestCompanyId, targetCompanyId);

  const data = await getCompanyAiSettings(targetCompanyId);
  const globalModels = await getGlobalModels();

  return res.status(200).json({
    usageMode: data.usageMode,
    preferredProvider: data.preferredProvider,
    maskedKeys: data.maskedKeys,
    hasOwnKeys: {
      openai: Boolean(data.ownKeys.openai),
      gemini: Boolean(data.ownKeys.gemini),
      openrouter: Boolean(data.ownKeys.openrouter)
    },
    creditInfo: data.creditInfo,
    planInfo: data.planInfo,
    globalModels
  });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const requestCompanyId = Number(req.user.companyId);
  const targetCompanyId = Number(req.params.companyId || requestCompanyId);

  await ensureOwnership(requestCompanyId, targetCompanyId);

  const payload = await updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

  const company = await Company.findByPk(targetCompanyId);
  if (!company) {
    throw new AppError("Empresa não encontrada.", 404);
  }

  if (payload.aiUsageMode || payload.aiPreferredProvider) {
    await company.update({
      aiUsageMode: payload.aiUsageMode || company.aiUsageMode || "system",
      aiPreferredProvider:
        payload.aiPreferredProvider || company.aiPreferredProvider || "openai"
    });
  }

  if (typeof payload.openaiApiKey === "string") {
    await upsertCompanyAiSetting(targetCompanyId, "openaiApiKey", payload.openaiApiKey);
  }

  if (typeof payload.geminiApiKey === "string") {
    await upsertCompanyAiSetting(targetCompanyId, "geminiApiKey", payload.geminiApiKey);
  }

  if (typeof payload.openrouterApiKey === "string") {
    await upsertCompanyAiSetting(targetCompanyId, "openrouterApiKey", payload.openrouterApiKey);
  }

  const data = await getCompanyAiSettings(targetCompanyId);
  const globalModels = await getGlobalModels();

  return res.status(200).json({
    usageMode: data.usageMode,
    preferredProvider: data.preferredProvider,
    maskedKeys: data.maskedKeys,
    hasOwnKeys: {
      openai: Boolean(data.ownKeys.openai),
      gemini: Boolean(data.ownKeys.gemini),
      openrouter: Boolean(data.ownKeys.openrouter)
    },
    creditInfo: data.creditInfo,
    planInfo: data.planInfo,
    globalModels
  });
};
