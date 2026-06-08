import { QueryTypes, Op } from "sequelize";
import sequelize from "../../database";
import AiExternalFollowUpLog from "../../models/AiExternalFollowUpLog";
import { checkCompanyAiBlock } from "../AiActionsServices/CompanyAiBlockService";
import logger from "../../utils/logger";

const HISTORY_TABLE = "ai_external_n8n_chat_histories";

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
  return rows.map(r => r.name);
};

export interface AbandonedCandidate {
  companyId: number;
  contactId: number | null;
  ticketId: number | null;
  sessionId: string | null;
  lastUserMessage: string;
  lastAgentMessage: string;
  conversationSummary: string;
  detectedIntent: string | null;
  rawHistory: Record<string, any>;
}

export const detectAbandonedConversations = async ({
  companyId,
  abandonmentMinutes = 120,
  lookbackHours = 12,
  cooldownHours = 24,
  ignoreResolvedTickets = true,
  ignoreClosedTickets = true,
  maxCandidates = 30
}: {
  companyId: number;
  abandonmentMinutes?: number;
  lookbackHours?: number;
  cooldownHours?: number;
  ignoreResolvedTickets?: boolean;
  ignoreClosedTickets?: boolean;
  maxCandidates?: number;
}): Promise<AbandonedCandidate[]> => {
  const aiBlock = await checkCompanyAiBlock(companyId);
  if (aiBlock.blocked) {
    logger.info(`[DetectAbandoned] companyId=${companyId} bloqueada: ${aiBlock.reason}`);
    return [];
  }

  const columns = await getHistoryColumns();
  if (!columns.length) {
    logger.info(`[DetectAbandoned] tabela ${HISTORY_TABLE} não existe`);
    return [];
  }

  const companyCol = ["company_id", "companyId", "companyid"].find(c => columns.includes(c));
  const updatedCol = ["updated_at", "updatedAt", "last_updated"].find(c => columns.includes(c))
    || ["created_at", "createdAt"].find(c => columns.includes(c))
    || "id";
  const sessionCol = ["session_id", "sessionId", "access_id", "accessId"].find(c => columns.includes(c));
  const contactCol = ["contact_id", "contactId"].find(c => columns.includes(c));
  const ticketCol = ["ticket_id", "ticketId"].find(c => columns.includes(c));
  const lastUserCol = ["last_user_message", "lastUserMessage", "user_message", "userMessage"].find(c => columns.includes(c));
  const lastAgentCol = ["last_agent_message", "lastAgentMessage", "agent_message", "agentMessage", "last_response", "lastResponse"].find(c => columns.includes(c));
  const summaryCol = ["summary", "conversation_summary", "conversationSummary", "context", "conversation_context"].find(c => columns.includes(c));
  const intentCol = ["intent", "detected_intent", "detectedIntent", "intenção", "intencao"].find(c => columns.includes(c));

  const now = new Date();
  const abandonmentCutoff = new Date(now.getTime() - abandonmentMinutes * 60 * 1000);
  const lookbackCutoff = new Date(now.getTime() - lookbackHours * 3600 * 1000);

  let whereClause = `"${updatedCol}" <= :abandonmentCutoff AND "${updatedCol}" >= :lookbackCutoff`;
  const replacements: Record<string, any> = { abandonmentCutoff, lookbackCutoff, companyId };

  if (companyCol) {
    whereClause += ` AND "${companyCol}" = :companyId`;
  }

  const rows = await sequelize.query(
    `SELECT * FROM ${HISTORY_TABLE} WHERE ${whereClause} ORDER BY "${updatedCol}" ASC LIMIT :limit`,
    { replacements: { ...replacements, limit: maxCandidates * 3 }, type: QueryTypes.SELECT }
  ) as Array<Record<string, any>>;

  if (!rows.length) return [];

  // Buscar cooldown: quais contactIds/sessionIds já receberam follow-up recentemente
  const cooldownCutoff = new Date(now.getTime() - cooldownHours * 3600 * 1000);
  const recentLogs = await AiExternalFollowUpLog.findAll({
    where: {
      companyId,
      status: { [Op.in]: ["sent", "processing"] },
      createdAt: { [Op.gte]: cooldownCutoff }
    },
    attributes: ["contactId", "sessionId"]
  });

  const cooldownContactIds = new Set(recentLogs.map(l => l.contactId).filter(Boolean));
  const cooldownSessions = new Set(recentLogs.map(l => l.sessionId).filter(Boolean));

  const candidates: AbandonedCandidate[] = [];

  for (const row of rows) {
    if (candidates.length >= maxCandidates) break;

    const sid = sessionCol ? String(row[sessionCol] || "") : "";
    const cid = contactCol ? Number(row[contactCol]) : null;
    const tid = ticketCol ? Number(row[ticketCol]) : null;

    if (sid && cooldownSessions.has(sid)) continue;
    if (cid && cooldownContactIds.has(cid)) continue;

    // Ignorar tickets resolvidos/fechados se configurado
    if ((ignoreResolvedTickets || ignoreClosedTickets) && tid) {
      const ticketRow = await sequelize.query(
        `SELECT status FROM "Tickets" WHERE id = :ticketId AND "companyId" = :companyId LIMIT 1`,
        { replacements: { ticketId: tid, companyId }, type: QueryTypes.SELECT }
      ) as Array<{ status: string }>;
      if (ticketRow[0]) {
        const ts = ticketRow[0].status;
        if (ignoreResolvedTickets && ts === "closed") continue;
        if (ignoreClosedTickets && (ts === "closed" || ts === "resolved")) continue;
      }
    }

    const lastUser = lastUserCol ? String(row[lastUserCol] || "") : "";
    const lastAgent = lastAgentCol ? String(row[lastAgentCol] || "") : "";
    const summary = summaryCol ? String(row[summaryCol] || "") : lastUser;
    const intent = intentCol ? String(row[intentCol] || "") : null;

    if (!lastUser && !summary) continue;

    candidates.push({
      companyId,
      contactId: cid || null,
      ticketId: tid || null,
      sessionId: sid || null,
      lastUserMessage: lastUser,
      lastAgentMessage: lastAgent,
      conversationSummary: summary,
      detectedIntent: intent,
      rawHistory: row
    });
  }

  logger.info(`[DetectAbandoned] companyId=${companyId} candidatos=${candidates.length}`);
  return candidates;
};
