import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import CreatePromptService from "../services/PromptServices/CreatePromptService";
import DeletePromptService from "../services/PromptServices/DeletePromptService";
import ListPromptsService from "../services/PromptServices/ListPromptsService";
import ShowPromptService from "../services/PromptServices/ShowPromptService";
import UpdatePromptService from "../services/PromptServices/UpdatePromptService";
import DuplicatePromptService from "../services/PromptServices/DuplicatePromptService";
import GetPromptMetricsService from "../services/PromptServices/GetPromptMetricsService";
import TestPromptService from "../services/PromptServices/TestPromptService";
import SavePromptChannelBindingService from "../services/PromptChannelBindingServices/SavePromptChannelBindingService";
import Whatsapp from "../models/Whatsapp";
import { verify } from "jsonwebtoken";
import authConfig from "../config/auth";
import { getPromptSafeResponse } from "../services/AIProviderService/AIProviderService";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber, searchParam } = req.query as IndexQuery;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  const { prompts, count, hasMore } = await ListPromptsService({ searchParam, pageNumber, companyId });

  return res.status(200).json({
    prompts: prompts.map(prompt => getPromptSafeResponse(prompt)),
    count,
    hasMore
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  const {
    name,
    apiKey,
    prompt,
    maxTokens,
    temperature,
    promptTokens,
    completionTokens,
    totalTokens,
    queueId,
    maxMessages,
    voice,
    voiceKey,
    voiceRegion,
    provider,
    model,
    aiUsageMode,
    templateKey,
    description,
    toolsEnabled,
    knowledgeBase,
    channelBinding
  } = req.body;
  const promptTable = await CreatePromptService({
    name,
    apiKey,
    prompt,
    maxTokens,
    temperature,
    promptTokens,
    completionTokens,
    totalTokens,
    queueId,
    maxMessages,
    companyId,
    voice,
    voiceKey,
    voiceRegion,
    provider,
    model,
    aiUsageMode,
    templateKey,
    description,
    toolsEnabled,
    knowledgeBase
  });

  if (channelBinding?.whatsappId) {
    await SavePromptChannelBindingService({
      companyId: Number(companyId),
      promptId: promptTable.id,
      ...channelBinding
    });
  }

  const promptWithBindings = await ShowPromptService({ promptId: promptTable.id, companyId });

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-prompt`, {
    action: "create",
    prompt: getPromptSafeResponse(promptWithBindings)
  });

  return res.status(200).json(getPromptSafeResponse(promptWithBindings));
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  const prompt = await ShowPromptService({ promptId, companyId });

  return res.status(200).json(getPromptSafeResponse(prompt));
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { promptId } = req.params;
  const promptData = req.body;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  const prompt = await UpdatePromptService({ promptData, promptId: promptId, companyId });

  if (promptData.channelBinding) {
    await SavePromptChannelBindingService({
      companyId: Number(companyId),
      promptId: Number(promptId),
      ...promptData.channelBinding
    });
  }

  const promptWithBindings = await ShowPromptService({ promptId, companyId });

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-prompt`, {
    action: "update",
    prompt: getPromptSafeResponse(promptWithBindings)
  });

  return res.status(200).json(getPromptSafeResponse(promptWithBindings));
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  const promptId = req.params.promptId ? Number(req.params.promptId) : null;
  const companyId = Number(req.user.companyId);

  const data = await TestPromptService({
    companyId,
    promptId,
    prompt: req.body?.prompt,
    message: req.body?.message,
    provider: req.body?.provider,
    model: req.body?.model,
    temperature: req.body?.temperature,
    maxTokens: req.body?.maxTokens,
    aiUsageMode: req.body?.aiUsageMode,
    allowedTools: req.body?.allowedTools,
    context: req.body?.context
  });

  return res.status(200).json(data);
};

export const duplicate = async (req: Request, res: Response): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  const prompt = await DuplicatePromptService({ promptId, companyId });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-prompt`, {
      action: "create",
      prompt: getPromptSafeResponse(prompt)
    });

  return res.status(200).json(getPromptSafeResponse(prompt));
};

export const metrics = async (req: Request, res: Response): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  const data = await GetPromptMetricsService({ promptId, companyId });
  return res.status(200).json(data);
};

export const toggleBinding = async (req: Request, res: Response): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  const prompt = await ShowPromptService({ promptId, companyId });
  const binding = (prompt as any).channelBindings?.find((item: any) => item.channelType === "whatsapp");

  if (!binding?.whatsappId) {
    return res.status(400).json({ error: "Configure um canal de atuação para ativar este agente." });
  }

  await SavePromptChannelBindingService({
    companyId: Number(companyId),
    promptId: Number(promptId),
    whatsappId: binding.whatsappId,
    isActive: !binding.isActive,
    events: binding.events
  });

  const updated = await ShowPromptService({ promptId, companyId });
  return res.status(200).json(getPromptSafeResponse(updated));
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  try {
    const { count } = await Whatsapp.findAndCountAll({ where: { promptId: +promptId, companyId } });

    if (count > 0) return res.status(200).json({ message: "Não foi possível excluir! Verifique se este prompt está sendo usado nas conexões Whatsapp!" });

    await DeletePromptService(promptId, companyId);

    const io = getIO();
    io.of(String(companyId))
  .emit(`company-${companyId}-prompt`, {
      action: "delete",
      promptId: +promptId
    });

    return res.status(200).json({ message: "Prompt deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Não foi possível excluir! Verifique se este prompt está sendo usado!" });
  }
};

