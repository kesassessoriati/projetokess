import { QueryTypes } from "sequelize";
import AppError from "../../errors/AppError";
import sequelize from "../../database";
import CrmLead from "../../models/CrmLead";
import Contact from "../../models/Contact";

const HISTORY_TABLE = "ai_external_n8n_chat_histories";
const DELETE_CONFIRMATION = "EXCLUIR MEMORIA";

type HistoryColumns = Set<string>;

type ChatMemoryKeyParts = {
  companyId: number | null;
  leadId: number | null;
  sessionId: string | null;
};

type ChatMemoryRow = {
  id: number;
  companyId?: number | null;
  key?: string | null;
  sessionId?: string | null;
  message?: any;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type EnrichedChatMemory = ChatMemoryRow & {
  parsed: ChatMemoryKeyParts;
  leadName: string | null;
  leadPhone: string | null;
  messageCount: number;
  preview: string;
  source: string;
};

const clampLimit = (limit?: string | number): number => {
  const parsed = Number(limit || 25);
  if (Number.isNaN(parsed) || parsed < 1) return 25;
  return Math.min(parsed, 100);
};

const parsePositiveInt = (value?: string | number | null): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

export const parseChatMemoryKey = (value?: string | null): ChatMemoryKeyParts => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d+):lead:(\d+):session:(.+)$/);

  if (!match) {
    return { companyId: null, leadId: null, sessionId: null };
  }

  return {
    companyId: Number(match[1]),
    leadId: Number(match[2]),
    sessionId: match[3] || null
  };
};

const tableExists = async (): Promise<boolean> => {
  const rows = (await sequelize.query(
    "SELECT to_regclass(:tableName) as name",
    {
      replacements: { tableName: `public.${HISTORY_TABLE}` },
      type: QueryTypes.SELECT
    }
  )) as Array<{ name: string | null }>;

  return Boolean(rows[0]?.name);
};

const getColumns = async (): Promise<HistoryColumns> => {
  if (!(await tableExists())) {
    throw new AppError("Tabela de Chat Memory do N8N nao encontrada.", 404);
  }

  const rows = (await sequelize.query(
    `SELECT column_name as name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :tableName`,
    {
      replacements: { tableName: HISTORY_TABLE },
      type: QueryTypes.SELECT
    }
  )) as Array<{ name: string }>;

  return new Set(rows.map(row => row.name));
};

const getScopedKeyColumns = (columns: HistoryColumns): string[] =>
  ["session_id", "key"].filter(column => columns.has(column));

const getCompanyColumn = (columns: HistoryColumns): string | null => {
  if (columns.has("company_id")) return "company_id";
  if (columns.has("companyId")) return "companyId";
  return null;
};

const requireScopedKeyColumn = (columns: HistoryColumns): string[] => {
  const scopedColumns = getScopedKeyColumns(columns);

  if (!getCompanyColumn(columns) && scopedColumns.length === 0) {
    throw new AppError("Tabela de Chat Memory sem company_id ou chave de escopo.", 500);
  }

  return scopedColumns;
};

const buildSelect = (columns: HistoryColumns): string => {
  const fields = ['"id"'];

  if (columns.has("company_id")) fields.push('"company_id" as "companyId"');
  if (columns.has("companyId")) fields.push('"companyId" as "companyId"');
  if (columns.has("session_id")) fields.push('"session_id" as "sessionId"');
  if (columns.has("key")) fields.push('"key"');
  if (columns.has("message")) fields.push('"message"');
  if (columns.has("data")) fields.push('"data"');
  if (columns.has("metadata")) fields.push('"metadata"');
  if (columns.has("created_at")) fields.push('"created_at" as "createdAt"');
  if (columns.has("updated_at")) fields.push('"updated_at" as "updatedAt"');

  return fields.join(", ");
};

const buildOrderBy = (columns: HistoryColumns): string => {
  if (columns.has("updated_at")) return '"updated_at" DESC NULLS LAST, "id" DESC';
  if (columns.has("created_at")) return '"created_at" DESC NULLS LAST, "id" DESC';
  return '"id" DESC';
};

const buildScopeWhere = (columns: HistoryColumns): string => {
  const companyColumn = getCompanyColumn(columns);
  if (companyColumn) {
    return `"${companyColumn}" = :companyId`;
  }

  const scopedColumns = requireScopedKeyColumn(columns);
  return `(${scopedColumns.map(column => `"${column}" LIKE :companyPrefix`).join(" OR ")})`;
};

const buildSearchWhere = (columns: HistoryColumns): string[] => {
  const clauses: string[] = [];
  const keyColumns = getScopedKeyColumns(columns);

  keyColumns.forEach(column => clauses.push(`"${column}" ILIKE :searchLike`));
  ["message", "data", "metadata"].forEach(column => {
    if (columns.has(column)) clauses.push(`"${column}"::text ILIKE :searchLike`);
  });
  clauses.push('CAST("id" AS TEXT) = :searchExact');

  return clauses;
};

const buildFilters = ({
  columns,
  leadId,
  sessionId,
  range,
  search
}: {
  columns: HistoryColumns;
  leadId?: string | number;
  sessionId?: string;
  range?: string;
  search?: string;
}): string[] => {
  const filters: string[] = [];
  const keyColumns = getScopedKeyColumns(columns);

  if (leadId && keyColumns.length) {
    filters.push(`(${keyColumns.map(column => `"${column}" LIKE :leadPrefix`).join(" OR ")})`);
  }

  if (sessionId && keyColumns.length) {
    filters.push(`(${keyColumns.map(column => `"${column}" LIKE :sessionLike`).join(" OR ")})`);
  }

  if (range === "24h" && columns.has("created_at")) {
    filters.push('"created_at" >= NOW() - INTERVAL \'24 hours\'');
  }

  if (range === "7d" && columns.has("created_at")) {
    filters.push('"created_at" >= NOW() - INTERVAL \'7 days\'');
  }

  if (search?.trim()) {
    const searchClauses = buildSearchWhere(columns);
    if (searchClauses.length) {
      filters.push(`(${searchClauses.join(" OR ")})`);
    }
  }

  return filters;
};

const safeStringify = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const collectMessageTexts = (value: any, output: string[] = []): string[] => {
  if (value === null || value === undefined) return output;

  if (typeof value === "string") {
    output.push(value);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectMessageTexts(item, output));
    return output;
  }

  if (typeof value === "object") {
    ["content", "text", "message", "output", "input"].forEach(key => {
      if (typeof value[key] === "string") output.push(value[key]);
    });

    Object.values(value).forEach(item => {
      if (typeof item === "object") collectMessageTexts(item, output);
    });
  }

  return output;
};

const countMessages = (value: any): number => {
  if (Array.isArray(value)) return value.length;
  if (value?.messages && Array.isArray(value.messages)) return value.messages.length;
  if (value?.history && Array.isArray(value.history)) return value.history.length;
  const texts = collectMessageTexts(value);
  return texts.length || (value ? 1 : 0);
};

const summarizeMessage = (value: any): string => {
  const texts = collectMessageTexts(value).filter(Boolean);
  const source = texts.length ? texts[texts.length - 1] : safeStringify(value);
  return source.replace(/\s+/g, " ").trim().slice(0, 180);
};

const enrichRows = async (
  rows: ChatMemoryRow[],
  companyId: number
): Promise<EnrichedChatMemory[]> => {
  const leadIds = Array.from(new Set(
    rows
      .map(row => parseChatMemoryKey(row.sessionId || row.key).leadId)
      .filter(Boolean)
  )) as number[];

  const leads = leadIds.length
    ? await CrmLead.findAll({
      where: { companyId, id: leadIds },
      attributes: ["id", "name", "phone", "contactId"]
    })
    : [];

  const contactIds = leads.map((lead: any) => lead.contactId).filter(Boolean);
  const contacts = contactIds.length
    ? await Contact.findAll({
      where: { companyId, id: contactIds },
      attributes: ["id", "name", "number"]
    })
    : [];

  const leadMap = new Map<number, any>(leads.map((lead: any) => [lead.id, lead]));
  const contactMap = new Map<number, any>(contacts.map((contact: any) => [contact.id, contact]));

  return rows.map(row => {
    const key = row.sessionId || row.key || "";
    const parsed = parseChatMemoryKey(key);
    const lead = parsed.leadId ? leadMap.get(parsed.leadId) : null;
    const contact = lead?.contactId ? contactMap.get(lead.contactId) : null;

    return {
      ...row,
      parsed,
      leadName: lead?.name || contact?.name || null,
      leadPhone: lead?.phone || contact?.number || null,
      messageCount: countMessages(row.message),
      preview: summarizeMessage(row.message),
      source: "N8N Chat Memory"
    };
  });
};

export const listChatMemory = async ({
  companyId,
  search,
  leadId,
  sessionId,
  range = "recent",
  page = 1,
  limit
}: {
  companyId: number;
  search?: string;
  leadId?: string | number;
  sessionId?: string;
  range?: string;
  page?: string | number;
  limit?: string | number;
}) => {
  const columns = await getColumns();
  const pageNumber = Math.max(Number(page || 1), 1);
  const pageLimit = clampLimit(limit);
  const offset = pageLimit * (pageNumber - 1);
  const scopedWhere = buildScopeWhere(columns);
  const filters = buildFilters({ columns, leadId, sessionId, range, search });
  const where = [scopedWhere, ...filters].join(" AND ");
  const orderBy = buildOrderBy(columns);
  const parsedLeadId = parsePositiveInt(leadId);

  const replacements = {
    companyId,
    companyPrefix: `${companyId}:lead:%`,
    leadPrefix: `${companyId}:lead:${parsedLeadId || 0}:session:%`,
    sessionLike: `%:session:${sessionId || ""}%`,
    searchLike: `%${String(search || "").trim()}%`,
    searchExact: String(search || "").trim(),
    limit: pageLimit,
    offset
  };

  const rows = (await sequelize.query(
    `SELECT ${buildSelect(columns)}
     FROM ${HISTORY_TABLE}
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  )) as ChatMemoryRow[];

  const countRows = (await sequelize.query(
    `SELECT COUNT(*)::int as count
     FROM ${HISTORY_TABLE}
     WHERE ${where}`,
    { replacements, type: QueryTypes.SELECT }
  )) as Array<{ count: number }>;

  const count = countRows[0]?.count || 0;
  const memories = await enrichRows(rows, companyId);

  return {
    memories,
    count,
    page: pageNumber,
    limit: pageLimit,
    hasMore: count > offset + rows.length,
    scope: getCompanyColumn(columns) || "key_prefix"
  };
};

export const showChatMemory = async ({
  companyId,
  id
}: {
  companyId: number;
  id: number;
}) => {
  const columns = await getColumns();
  const scopedWhere = buildScopeWhere(columns);
  const rows = (await sequelize.query(
    `SELECT ${buildSelect(columns)}
     FROM ${HISTORY_TABLE}
     WHERE "id" = :id AND ${scopedWhere}
     LIMIT 1`,
    {
      replacements: { id, companyId, companyPrefix: `${companyId}:lead:%` },
      type: QueryTypes.SELECT
    }
  )) as ChatMemoryRow[];

  if (!rows[0]) throw new AppError("Chat Memory nao encontrado.", 404);

  const [memory] = await enrichRows(rows, companyId);
  return memory;
};

export const deleteChatMemoryById = async ({
  companyId,
  id
}: {
  companyId: number;
  id: number;
}) => {
  const columns = await getColumns();
  const scopedWhere = buildScopeWhere(columns);

  const [, metadata] = (await sequelize.query(
    `DELETE FROM ${HISTORY_TABLE}
     WHERE "id" = :id AND ${scopedWhere}`,
    { replacements: { id, companyId, companyPrefix: `${companyId}:lead:%` } }
  )) as any;

  return { deleted: metadata?.rowCount || 0 };
};

export const deleteChatMemoryByLead = async ({
  companyId,
  leadId
}: {
  companyId: number;
  leadId: number;
}) => {
  const columns = await getColumns();
  const scopedColumns = requireScopedKeyColumn(columns);
  if (!leadId || !scopedColumns.length) throw new AppError("Lead ID invalido.", 400);

  const where = [
    buildScopeWhere(columns),
    `(${scopedColumns.map(column => `"${column}" LIKE :leadPrefix`).join(" OR ")})`
  ].join(" AND ");

  const [, metadata] = (await sequelize.query(
    `DELETE FROM ${HISTORY_TABLE}
     WHERE ${where}`,
    {
      replacements: {
        companyId,
        companyPrefix: `${companyId}:lead:%`,
        leadPrefix: `${companyId}:lead:${leadId}:session:%`
      }
    }
  )) as any;

  return { deleted: metadata?.rowCount || 0 };
};

export const deleteChatMemoryBySession = async ({
  companyId,
  sessionId
}: {
  companyId: number;
  sessionId: string;
}) => {
  const columns = await getColumns();
  const scopedColumns = requireScopedKeyColumn(columns);
  if (!sessionId?.trim() || !scopedColumns.length) {
    throw new AppError("Session ID invalido.", 400);
  }

  const where = [
    buildScopeWhere(columns),
    `(${scopedColumns.map(column => `"${column}" LIKE :sessionLike`).join(" OR ")})`
  ].join(" AND ");

  const [, metadata] = (await sequelize.query(
    `DELETE FROM ${HISTORY_TABLE}
     WHERE ${where}`,
    {
      replacements: {
        companyId,
        companyPrefix: `${companyId}:lead:%`,
        sessionLike: `%:session:${sessionId}%`
      }
    }
  )) as any;

  return { deleted: metadata?.rowCount || 0 };
};

export const deleteCompanyChatMemory = async ({
  companyId,
  confirmation
}: {
  companyId: number;
  confirmation?: string;
}) => {
  if (confirmation !== DELETE_CONFIRMATION) {
    throw new AppError("Confirmacao invalida para exclusao da memoria.", 400);
  }

  const columns = await getColumns();
  const scopedWhere = buildScopeWhere(columns);

  const [, metadata] = (await sequelize.query(
    `DELETE FROM ${HISTORY_TABLE}
     WHERE ${scopedWhere}`,
    {
      replacements: {
        companyId,
        companyPrefix: `${companyId}:lead:%`
      }
    }
  )) as any;

  return { deleted: metadata?.rowCount || 0 };
};
