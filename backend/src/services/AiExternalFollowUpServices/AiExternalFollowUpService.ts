import OpenAI from "openai";
import { Op, QueryTypes } from "sequelize";
import AppError from "../../errors/AppError";
import sequelize from "../../database";
import CrmLead from "../../models/CrmLead";
import AiExternalFollowUpLog from "../../models/AiExternalFollowUpLog";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import GetWhatsappWbot from "../../helpers/GetWhatsappWbot";
import { resolveAIProviderConfig } from "../AIProviderService/AIProviderService";
import { checkCompanyAiBlock } from "../AiActionsServices/CompanyAiBlockService";
import { getOrCreateFollowUpConfig, DEFAULT_FOLLOW_UP_PROMPT } from "./AiExternalFollowUpConfigService";
import { detectAbandonedConversations } from "./DetectAbandonedConversationsService";
import logger from "../../utils/logger";

export const FOLLOW_UP_STATUS = "follow_up";
export const FOLLOW_UP_SENT_STATUS = "follow_up_enviado";

const ADVANCED_STATUSES = new Set([
  "contactado",
  "qualificado",
  "reuniao_agendada",
  "nao_qualificado",
  "convertido",
  "perdido",
  FOLLOW_UP_SENT_STATUS
]);

const HISTORY_TABLE = "ai_external_n8n_chat_histories";

const normalizePhone = (value?: string | null) => {
  let digits = (value || "").replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }
  return digits;
};

const tableExists = async (tableName: string): Promise<boolean> => {
  const rows = await sequelize.query(
    "SELECT to_regclass(:tableName) as name",
    { replacements: { tableName: `public.${tableName}` }, type: QueryTypes.SELECT }
  ) as Array<{ name: string | null }>;
  return Boolean(rows[0]?.name);
};

const getHistoryColumns = async (): Promise<string[]> => {
  if (!(await tableExists(HISTORY_TABLE))) return [];
  const rows = await sequelize.query(
    `SELECT column_name as name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :tableName`,
    { replacements: { tableName: HISTORY_TABLE }, type: QueryTypes.SELECT }
  ) as Array<{ name: string }>;
  return rows.map(row => row.name);
};

const findHistoryByLead = async (lead: CrmLead): Promise<Record<string, any> | null> => {
  const columns = await getHistoryColumns();
  if (!columns.length) return null;

  const lookupColumns = [
    "access_id", "accessId", "accessid",
    "session_id", "sessionId", "sessionid",
    "lead_id", "leadId",
    "contact_id", "contactId",
    "phone", "number"
  ].filter(column => columns.includes(column));

  if (!lookupColumns.length) return null;

  const phone = normalizePhone(lead.phone);
  const values = [
    lead.sessionid,
    lead.lid,
    lead.id ? String(lead.id) : null,
    lead.contactId ? String(lead.contactId) : null,
    phone,
    phone ? phone.replace(/^55/, "") : null
  ].filter(Boolean);

  if (!values.length) return null;

  const orderColumn = ["updated_at", "updatedAt", "created_at", "createdAt", "id"]
    .find(column => columns.includes(column)) || "id";
  const where = lookupColumns.map(column => `"${column}" IN (:values)`).join(" OR ");

  const rows = await sequelize.query(
    `SELECT * FROM ${HISTORY_TABLE}
     WHERE ${where}
     ORDER BY "${orderColumn}" DESC
     LIMIT 1`,
    { replacements: { values }, type: QueryTypes.SELECT }
  ) as Array<Record<string, any>>;

  return rows[0] || null;
};

const historyToContext = (history: Record<string, any> | null): string => {
  if (!history) return "";
  const preferred = [
    "context", "conversation_context", "message", "messages",
    "history", "chat_history", "transcript", "last_context", "content"
  ];
  for (const key of preferred) {
    const value = history[key];
    if (value) return typeof value === "string" ? value : JSON.stringify(value);
  }
  return JSON.stringify(history);
};

const buildFallbackMessage = (lead: CrmLead) =>
  `Ola${lead.name ? `, ${lead.name}` : ""}! Passando para retomar nossa conversa. Posso te ajudar a dar continuidade ao atendimento ou tirar alguma duvida?`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateFollowUpMessage = async (
  lead: CrmLead,
  context: string,
  customPrompt?: string | null
): Promise<string> => {
  if (!context) return buildFallbackMessage(lead);

  try {
    const resolved = await resolveAIProviderConfig({
      companyId: lead.companyId,
      provider: "openai",
      requestType: "external_agent"
    });

    if (resolved.provider !== "openai") return buildFallbackMessage(lead);

    const systemPrompt = (customPrompt || DEFAULT_FOLLOW_UP_PROMPT)
      .replace(/\{\{leadName\}\}/g, lead.name || "cliente")
      .replace(/\{\{companyName\}\}/g, String(lead.companyId))
      .replace(/\{\{lastUserMessage\}\}/g, context.slice(0, 2000))
      .replace(/\{\{conversationSummary\}\}/g, context.slice(0, 3000));

    const openai = new OpenAI({ apiKey: resolved.apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content: "Voce cria mensagens curtas de follow-up por WhatsApp para recuperar conversas comerciais. Use tom humano, direto e natural. Nao invente dados. Nao mencione que leu historico ou que e IA."
        },
        {
          role: "user",
          content: systemPrompt + `\n\nContexto recente:\n${context.slice(0, 4000)}`
        }
      ]
    });

    return response.choices[0]?.message?.content?.trim() || buildFallbackMessage(lead);
  } catch (error) {
    logger.warn(`[AiExternalFollowUp] Falha ao gerar mensagem do lead ${lead.id}: ${error}`);
    return buildFallbackMessage(lead);
  }
};

const sendFollowUpMessage = async (lead: CrmLead, message: string) => {
  const phone = normalizePhone(lead.phone);
  if (!phone) throw new AppError("Lead sem telefone para follow-up.", 400);

  const whatsapp = await GetDefaultWhatsApp(undefined, lead.companyId);
  const wbot = await GetWhatsappWbot(whatsapp);
  const jid = `${phone.includes("@") ? phone : `${phone}@s.whatsapp.net`}`;
  return wbot.sendMessage(jid, { text: message });
};

export const listAiExternalFollowUpLeads = async ({
  companyId,
  pageNumber = 1
}: {
  companyId: number;
  pageNumber?: string | number;
}) => {
  const limit = 50;
  const offset = limit * (Number(pageNumber) - 1);
  const where = {
    companyId,
    [Op.or]: [
      { status: FOLLOW_UP_STATUS },
      { leadStatus: FOLLOW_UP_STATUS },
      { status: FOLLOW_UP_SENT_STATUS },
      { leadStatus: FOLLOW_UP_SENT_STATUS }
    ]
  } as any;

  const { rows, count } = await CrmLead.findAndCountAll({
    where,
    limit,
    offset,
    order: [["updatedAt", "DESC"]]
  });

  return { leads: rows, count, hasMore: count > offset + rows.length };
};

export const markLeadForAiExternalFollowUp = async ({
  companyId,
  leadId,
  accessId,
  phone
}: {
  companyId: number;
  leadId?: number;
  accessId?: string;
  phone?: string;
}) => {
  const phoneDigits = normalizePhone(phone);
  const where: any = { companyId };

  if (leadId) {
    where.id = leadId;
  } else if (accessId) {
    where[Op.or] = [{ sessionid: accessId }, { lid: accessId }];
  } else if (phoneDigits) {
    where[Op.or] = [
      { phone: phoneDigits },
      { phone: phoneDigits.replace(/^55/, "") }
    ];
  } else {
    throw new AppError("Informe leadId, accessId ou phone para marcar follow-up.", 400);
  }

  const lead = await CrmLead.findOne({ where });
  if (!lead) throw new AppError("Lead nao encontrado para follow-up.", 404);

  const currentStatus = lead.status || lead.leadStatus || "novo";
  const currentLeadStatus = lead.leadStatus || lead.status || "novo";

  if (currentStatus !== "novo" && currentLeadStatus !== "novo") {
    return { lead, marked: false, reason: "lead_not_new" };
  }

  if (ADVANCED_STATUSES.has(currentStatus) || ADVANCED_STATUSES.has(currentLeadStatus)) {
    return { lead, marked: false, reason: "advanced_or_already_sent" };
  }

  await lead.update({
    status: FOLLOW_UP_STATUS,
    leadStatus: FOLLOW_UP_STATUS,
    lastActivityAt: new Date()
  });

  return { lead: await lead.reload(), marked: true };
};

export const processAiExternalFollowUps = async ({
  companyId
}: {
  companyId?: number;
} = {}) => {
  if (!companyId) return { processed: 0, sent: 0, skipped: 0, failed: 0, results: [] };

  const config = await getOrCreateFollowUpConfig(companyId);

  if (!config.enabled) {
    logger.info(`[AiExternalFollowUp] Agente desativado companyId=${companyId}`);
    return { processed: 0, sent: 0, skipped: 0, failed: 0, results: [], disabled: true };
  }

  if (config.ignoreCompanyAiPaused !== false) {
    const companyBlock = await checkCompanyAiBlock(companyId);
    if (companyBlock.blocked) {
      logger.info(`[AiExternalFollowUp] Bloqueado companyId=${companyId} reason=${companyBlock.reason}`);
      await AiExternalFollowUpLog.create({
        companyId,
        status: "skipped",
        reason: `company_ai_${companyBlock.reason}`,
        metadata: { blockedAt: new Date() }
      } as any);
      return { processed: 0, sent: 0, skipped: 0, failed: 0, results: [], blocked: true, blockReason: companyBlock.reason };
    }
  }

  const maxPerRun = config.maxPerRun ?? 30;
  const minDelay = (config.minDelaySeconds ?? 60) * 1000;
  const maxDelay = (config.maxDelaySeconds ?? 180) * 1000;
  const customPrompt = config.prompt || null;

  // Fase 1: Detectar candidatos no Chat Memory
  const abandoned = await detectAbandonedConversations({
    companyId,
    abandonmentMinutes: config.abandonmentMinutes,
    lookbackHours: config.lookbackHours,
    cooldownHours: config.cooldownHours,
    ignoreResolvedTickets: config.ignoreResolvedTickets,
    ignoreClosedTickets: config.ignoreClosedTickets,
    maxCandidates: maxPerRun
  });

  // Fase 2: Leads CRM marcados como follow_up (retrocompatibilidade)
  const where: any = {
    companyId,
    [Op.or]: [
      { status: FOLLOW_UP_STATUS },
      { leadStatus: FOLLOW_UP_STATUS }
    ]
  };
  const crmLeads = await CrmLead.findAll({ where, limit: maxPerRun, order: [["updatedAt", "ASC"]] });

  const results: Array<Record<string, any>> = [];
  let totalProcessed = 0;

  // Processar candidatos do Chat Memory
  for (const candidate of abandoned) {
    if (totalProcessed >= maxPerRun) break;

    const log = await AiExternalFollowUpLog.create({
      companyId,
      contactId: candidate.contactId,
      ticketId: candidate.ticketId,
      sessionId: candidate.sessionId,
      status: "processing",
      detectedIntent: candidate.detectedIntent,
      lastUserMessage: candidate.lastUserMessage.slice(0, 2000),
      lastAgentMessage: candidate.lastAgentMessage.slice(0, 2000),
      conversationSummary: candidate.conversationSummary.slice(0, 3000)
    } as any);

    try {
      const lead = candidate.contactId
        ? await CrmLead.findOne({ where: { contactId: candidate.contactId, companyId } })
        : null;

      const fakeLead = { id: lead?.id || 0, name: lead?.name || null, phone: lead?.phone || null, companyId } as any;
      const message = await generateFollowUpMessage(fakeLead, candidate.conversationSummary, customPrompt);

      if (lead && lead.phone) {
        await sendFollowUpMessage(lead as CrmLead, message);
        await lead.update({
          status: FOLLOW_UP_SENT_STATUS,
          leadStatus: FOLLOW_UP_SENT_STATUS,
          lastActivityAt: new Date(),
          notes: `${lead.notes || ""}\n\nFollow-up IA em ${new Date().toISOString()}:\n${message}`.trim()
        });
      }

      await log.update({ status: "sent", generatedMessage: message, sentAt: new Date() });
      results.push({ logId: log.id, contactId: candidate.contactId, sent: true, message });
      logger.info(`[AiExternalFollowUp] lead_move_success logId=${log.id} companyId=${companyId}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await log.update({ status: "failed", errorMessage: errMsg });
      logger.warn(`[AiExternalFollowUp] movement_agent_retry_failed logId=${log.id}: ${errMsg}`);
      results.push({ logId: log.id, sent: false, error: errMsg });
    }

    totalProcessed++;

    if (totalProcessed < abandoned.length + crmLeads.length && minDelay > 0) {
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      await sleep(delay);
    }
  }

  // Processar leads CRM legacy
  for (const lead of crmLeads) {
    if (totalProcessed >= maxPerRun) break;

    const freshLead = await CrmLead.findOne({ where: { id: lead.id, companyId: lead.companyId } });
    if (!freshLead || ADVANCED_STATUSES.has(freshLead.status) || ADVANCED_STATUSES.has(freshLead.leadStatus)) {
      results.push({ leadId: lead.id, skipped: true, reason: "advanced_or_sent" });
      continue;
    }

    const log = await AiExternalFollowUpLog.create({
      companyId,
      status: "processing",
      lastUserMessage: freshLead.notes?.slice(0, 500) || ""
    } as any);

    try {
      const history = await findHistoryByLead(freshLead);
      const context = historyToContext(history);
      const message = await generateFollowUpMessage(freshLead, context, customPrompt);
      await sendFollowUpMessage(freshLead, message);
      await freshLead.update({
        status: FOLLOW_UP_SENT_STATUS,
        leadStatus: FOLLOW_UP_SENT_STATUS,
        lastActivityAt: new Date(),
        notes: `${freshLead.notes || ""}\n\nFollow-up IA em ${new Date().toISOString()}:\n${message}`.trim()
      });
      await log.update({ status: "sent", generatedMessage: message, sentAt: new Date() });
      results.push({ logId: log.id, leadId: lead.id, leadName: freshLead.name, sent: true, message });
      logger.info(`[AiExternalFollowUp] lead_move_success leadId=${lead.id} companyId=${companyId}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await log.update({ status: "failed", errorMessage: errMsg });
      logger.warn(`[AiExternalFollowUp] lead_move_failed leadId=${lead.id}: ${errMsg}`);
      results.push({ logId: log.id, leadId: lead.id, sent: false, error: errMsg });
    }

    totalProcessed++;

    if (totalProcessed < maxPerRun && minDelay > 0) {
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      await sleep(delay);
    }
  }

  const sent = results.filter(r => r.sent).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => r.sent === false && !r.skipped).length;

  return { processed: results.length, sent, skipped, failed, results };
};
