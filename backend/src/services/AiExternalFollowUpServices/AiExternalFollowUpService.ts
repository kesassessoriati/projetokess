import OpenAI from "openai";
import { Op, QueryTypes } from "sequelize";
import AppError from "../../errors/AppError";
import sequelize from "../../database";
import CrmLead from "../../models/CrmLead";
import Contact from "../../models/Contact";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import GetWhatsappWbot from "../../helpers/GetWhatsappWbot";
import { resolveAIProviderConfig } from "../AIProviderService/AIProviderService";
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
    "access_id",
    "accessId",
    "accessid",
    "session_id",
    "sessionId",
    "sessionid",
    "lead_id",
    "leadId",
    "contact_id",
    "contactId",
    "phone",
    "number"
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

  const orderColumn = ["updated_at", "updatedAt", "created_at", "createdAt", "id"].find(column => columns.includes(column)) || "id";
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
    "context",
    "conversation_context",
    "message",
    "messages",
    "history",
    "chat_history",
    "transcript",
    "last_context",
    "content"
  ];

  for (const key of preferred) {
    const value = history[key];
    if (value) {
      return typeof value === "string" ? value : JSON.stringify(value);
    }
  }

  return JSON.stringify(history);
};

const buildFallbackMessage = (lead: CrmLead) =>
  `Ola${lead.name ? `, ${lead.name}` : ""}! Passando para retomar nossa conversa. Posso te ajudar a dar continuidade ao atendimento ou tirar alguma duvida?`;

const generateFollowUpMessage = async (lead: CrmLead, context: string): Promise<string> => {
  if (!context) return buildFallbackMessage(lead);

  try {
    const resolved = await resolveAIProviderConfig({
      companyId: lead.companyId,
      provider: "openai",
      requestType: "external_agent"
    });

    if (resolved.provider !== "openai") return buildFallbackMessage(lead);

    const openai = new OpenAI({ apiKey: resolved.apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "Voce cria mensagens curtas de follow-up por WhatsApp para recuperar conversas comerciais. Use tom humano, direto e natural. Nao invente dados. Nao mencione que leu historico ou que e IA."
        },
        {
          role: "user",
          content: `Lead: ${lead.name || "cliente"}\nTelefone: ${lead.phone || ""}\nContexto recente:\n${context.slice(0, 6000)}\n\nCrie uma unica mensagem de follow-up.`
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
  companyId,
  limit = 50
}: {
  companyId?: number;
  limit?: number;
} = {}) => {
  const where: any = {
    [Op.or]: [
      { status: FOLLOW_UP_STATUS },
      { leadStatus: FOLLOW_UP_STATUS }
    ]
  };
  if (companyId) where.companyId = companyId;

  const leads = await CrmLead.findAll({
    where,
    limit,
    order: [["updatedAt", "ASC"]]
  });

  const results: Array<Record<string, any>> = [];

  for (const lead of leads) {
    try {
      const freshLead = await CrmLead.findOne({ where: { id: lead.id, companyId: lead.companyId } });
      if (!freshLead) continue;

      if (
        ADVANCED_STATUSES.has(freshLead.status) ||
        ADVANCED_STATUSES.has(freshLead.leadStatus)
      ) {
        results.push({ leadId: lead.id, skipped: true, reason: "advanced_or_sent" });
        continue;
      }

      const history = await findHistoryByLead(freshLead);
      const context = historyToContext(history);
      const message = await generateFollowUpMessage(freshLead, context);
      await sendFollowUpMessage(freshLead, message);
      await freshLead.update({
        status: FOLLOW_UP_SENT_STATUS,
        leadStatus: FOLLOW_UP_SENT_STATUS,
        lastActivityAt: new Date(),
        notes: `${freshLead.notes || ""}\n\nFollow-up IA enviado em ${new Date().toISOString()}:\n${message}`.trim()
      });

      results.push({ leadId: lead.id, sent: true });
    } catch (error) {
      logger.warn(`[AiExternalFollowUp] Falha ao processar lead ${lead.id}: ${error}`);
      results.push({ leadId: lead.id, sent: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { processed: results.length, results };
};
