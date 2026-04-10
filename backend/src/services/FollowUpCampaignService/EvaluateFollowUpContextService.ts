// @ts-nocheck
import PipelineStage from "../../models/PipelineStage";
import {
  DEFAULT_STOP_KEYWORDS,
  DEFAULT_SUCCESS_KEYWORDS
} from "./followUpDefaults";

const normalizeText = (value?: string | null) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const keywordMatch = (text: string, keywords: string[] = []) =>
  keywords.some((keyword) => text.includes(normalizeText(keyword)));

const resolveKeywordList = (keywords: any, fallback: string[]) => {
  if (!Array.isArray(keywords) || !keywords.length) {
    return fallback;
  }

  const normalized = keywords
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return normalized.length ? normalized : fallback;
};

const resolveStageProgress = async (campaign: any, ticket: any) => {
  if (!campaign?.pipelineStageId || !ticket?.crmLead?.stageId) {
    return { advanced: false, reason: null };
  }

  if (Number(ticket.crmLead.pipelineId || 0) && Number(campaign.pipelineId || 0)) {
    if (Number(ticket.crmLead.pipelineId) !== Number(campaign.pipelineId)) {
      return {
        advanced: true,
        reason: "lead_movido_para_outro_funil"
      };
    }
  }

  const [targetStage, currentStage] = await Promise.all([
    PipelineStage.findByPk(campaign.pipelineStageId),
    PipelineStage.findByPk(ticket.crmLead.stageId)
  ]);

  if (!targetStage || !currentStage) {
    return { advanced: false, reason: null };
  }

  if (Number(currentStage.id) === Number(targetStage.id)) {
    return { advanced: false, reason: null };
  }

  return {
    advanced: Number(currentStage.order || 0) >= Number(targetStage.order || 0),
    reason: currentStage.name
      ? `lead_em_etapa_${normalizeText(currentStage.name).replace(/\s+/g, "_")}`
      : "lead_movido_no_funil"
  };
};

const extractLatestInboundText = (message: any) => normalizeText(message?.body || "");

const evaluateFollowUpContextService = async ({
  campaign,
  ticket,
  latestInboundMessage
}) => {
  const inboundText = extractLatestInboundText(latestInboundMessage);
  const successKeywords = resolveKeywordList(campaign?.successKeywords, DEFAULT_SUCCESS_KEYWORDS);
  const stopKeywords = resolveKeywordList(campaign?.stopKeywords, DEFAULT_STOP_KEYWORDS);

  const stageProgress = await resolveStageProgress(campaign, ticket);
  if (stageProgress.advanced) {
    return {
      shouldStop: true,
      advanced: true,
      reason: stageProgress.reason || "lead_avancou_no_funil"
    };
  }

  if (!inboundText) {
    return {
      shouldStop: false,
      advanced: false,
      reason: "sem_resposta_relevante"
    };
  }

  if (keywordMatch(inboundText, stopKeywords)) {
    return {
      shouldStop: true,
      advanced: false,
      reason: "contato_pediu_interrupcao"
    };
  }

  if (keywordMatch(inboundText, successKeywords)) {
    return {
      shouldStop: true,
      advanced: true,
      reason: "mensagem_indica_avanco"
    };
  }

  return {
    shouldStop: false,
    advanced: false,
    reason: "resposta_sem_avanco"
  };
};

export default evaluateFollowUpContextService;
