import { Request, Response } from "express";
import {
  listAiExternalFollowUpLeads,
  markLeadForAiExternalFollowUp,
  processAiExternalFollowUps
} from "../services/AiExternalFollowUpServices/AiExternalFollowUpService";
import {
  getOrCreateFollowUpConfig,
  updateFollowUpConfig,
  DEFAULT_FOLLOW_UP_PROMPT
} from "../services/AiExternalFollowUpServices/AiExternalFollowUpConfigService";
import { listFollowUpLogs } from "../services/AiExternalFollowUpServices/ListAiExternalFollowUpLogsService";
import { retryFollowUpLog } from "../services/AiExternalFollowUpServices/RetryAiExternalFollowUpService";

const scope = (req: Request) => ({
  companyId: Number(req.user.companyId)
});

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const { pageNumber } = req.query as Record<string, string>;
  return res.json(await listAiExternalFollowUpLeads({ companyId, pageNumber }));
};

export const mark = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  return res.json(await markLeadForAiExternalFollowUp({
    companyId,
    leadId: req.body.leadId ? Number(req.body.leadId) : undefined,
    accessId: req.body.accessId,
    phone: req.body.phone
  }));
};

export const process = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  return res.json(await processAiExternalFollowUps({ companyId }));
};

export const showConfig = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const config = await getOrCreateFollowUpConfig(companyId);
  return res.json({
    ...config.toJSON(),
    defaultPrompt: DEFAULT_FOLLOW_UP_PROMPT
  });
};

export const updateConfig = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const {
    enabled,
    prompt,
    abandonmentMinutes,
    cooldownHours,
    maxPerRun,
    maxPerDay,
    minDelaySeconds,
    maxDelaySeconds,
    ignoreCompanyAiPaused,
    timezone,
    executionTimes,
    lookbackHours,
    ignoreResolvedTickets,
    ignoreClosedTickets,
    typingSimulationEnabled
  } = req.body;

  const config = await updateFollowUpConfig(companyId, {
    enabled: enabled !== undefined ? Boolean(enabled) : undefined,
    prompt: prompt !== undefined ? (prompt || null) : undefined,
    abandonmentMinutes: abandonmentMinutes !== undefined ? Number(abandonmentMinutes) : undefined,
    cooldownHours: cooldownHours !== undefined ? Number(cooldownHours) : undefined,
    maxPerRun: maxPerRun !== undefined ? Number(maxPerRun) : undefined,
    maxPerDay: maxPerDay !== undefined ? Number(maxPerDay) : undefined,
    minDelaySeconds: minDelaySeconds !== undefined ? Number(minDelaySeconds) : undefined,
    maxDelaySeconds: maxDelaySeconds !== undefined ? Number(maxDelaySeconds) : undefined,
    ignoreCompanyAiPaused: ignoreCompanyAiPaused !== undefined ? Boolean(ignoreCompanyAiPaused) : undefined,
    timezone: timezone || undefined,
    executionTimes: Array.isArray(executionTimes) ? executionTimes : undefined,
    lookbackHours: lookbackHours !== undefined ? Number(lookbackHours) : undefined,
    ignoreResolvedTickets: ignoreResolvedTickets !== undefined ? Boolean(ignoreResolvedTickets) : undefined,
    ignoreClosedTickets: ignoreClosedTickets !== undefined ? Boolean(ignoreClosedTickets) : undefined,
    typingSimulationEnabled: typingSimulationEnabled !== undefined ? Boolean(typingSimulationEnabled) : undefined
  });

  return res.json(config);
};

export const logs = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const { status, pageNumber } = req.query as Record<string, string>;
  return res.json(await listFollowUpLogs({ companyId, status: status as any, pageNumber: Number(pageNumber) || 1 }));
};

export const retry = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const logId = Number(req.params.logId);
  return res.json(await retryFollowUpLog({ logId, companyId }));
};
