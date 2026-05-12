import { Request, Response } from "express";
import GetOrCreateExternalAgentConfigService from "../services/AiExternalAgentServices/GetOrCreateExternalAgentConfigService";
import UpdateExternalAgentConfigService from "../services/AiExternalAgentServices/UpdateExternalAgentConfigService";
import CreateExternalPromptVersionService from "../services/AiExternalAgentServices/CreateExternalPromptVersionService";
import RestoreExternalPromptVersionService from "../services/AiExternalAgentServices/RestoreExternalPromptVersionService";
import ListExternalPromptVersionsService from "../services/AiExternalAgentServices/ListExternalPromptVersionsService";
import ListExternalAgentEventsService from "../services/AiExternalAgentServices/ListExternalAgentEventsService";

const getScope = (req: Request) => ({
  companyId: Number(req.user.companyId),
  userId: Number(req.user.id)
});

export const showConfig = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, userId } = getScope(req);

  const config = await GetOrCreateExternalAgentConfigService({ companyId, userId });

  return res.json(config);
};

export const updateConfig = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, userId } = getScope(req);

  const config = await UpdateExternalAgentConfigService({
    companyId,
    userId,
    name: req.body.name,
    n8nWebhookUrl: req.body.n8nWebhookUrl,
    webhookEnabled: req.body.webhookEnabled,
    metadata: req.body.metadata
  });

  return res.json(config);
};

export const listPromptVersions = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, userId } = getScope(req);

  const versions = await ListExternalPromptVersionsService({ companyId, userId });

  return res.json({ versions });
};

export const createPromptVersion = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, userId } = getScope(req);

  const result = await CreateExternalPromptVersionService({
    companyId,
    userId,
    content: req.body.content,
    changeNote: req.body.changeNote
  });

  return res.status(201).json(result);
};

export const restorePromptVersion = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, userId } = getScope(req);
  const { versionId } = req.params;

  const result = await RestoreExternalPromptVersionService({
    companyId,
    userId,
    versionId: Number(versionId)
  });

  return res.status(201).json(result);
};

export const listEvents = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = getScope(req);
  const { pageNumber, status, eventType } = req.query as Record<string, string>;

  const result = await ListExternalAgentEventsService({
    companyId,
    pageNumber,
    status,
    eventType
  });

  return res.json(result);
};
