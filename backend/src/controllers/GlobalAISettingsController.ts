import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import {
  AIProviderName,
  getGlobalAISettings,
  saveGlobalAISettings,
  syncProviderModels
} from "../services/AIProviderService/AIModelCatalogService";

const providers: AIProviderName[] = ["openai", "gemini", "openrouter"];

const ensureSuperAdmin = (req: Request) => {
  const isSuperAdmin = req.user.profile === "super" ||
    (req.user.profile === "admin" && Number(req.user.companyId) === 1);

  if (!isSuperAdmin) {
    throw new AppError("Apenas o superadmin pode gerenciar a configuração global de IA.", 403);
  }
};

const updateSchema = Yup.object().shape({
  preferredProvider: Yup.string().oneOf(providers).optional(),
  crmAiSystemPrompt: Yup.string().nullable().optional(),
  crmAiDefaultModel: Yup.string().nullable().optional(),
  keys: Yup.object().shape({
    openai: Yup.string().nullable().optional(),
    gemini: Yup.string().nullable().optional(),
    openrouter: Yup.string().nullable().optional()
  }).optional()
});

export const show = async (req: Request, res: Response): Promise<Response> => {
  ensureSuperAdmin(req);
  const data = await getGlobalAISettings();
  return res.status(200).json(data);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  ensureSuperAdmin(req);
  const payload = await updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  const data = await saveGlobalAISettings(payload as any);
  return res.status(200).json(data);
};

export const syncModels = async (req: Request, res: Response): Promise<Response> => {
  ensureSuperAdmin(req);
  const provider = String(req.params.provider || "") as AIProviderName;
  if (!providers.includes(provider)) {
    throw new AppError("Provedor de IA inválido.", 400);
  }

  const data = await syncProviderModels(provider, req.body?.apiKey);
  return res.status(200).json(data);
};
