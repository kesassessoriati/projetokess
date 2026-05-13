import OpenAI from "openai";
import { QueryTypes } from "sequelize";
import AppError from "../../errors/AppError";
import sequelize from "../../database";
import { resolveAIProviderConfig } from "../AIProviderService/AIProviderService";

const RAG_TABLES: Record<string, string> = {
  empresa: "ai_external_rag_empresa",
  produtos: "ai_external_rag_produtos",
  suporte: "ai_external_rag_suporte",
  comercial: "ai_external_rag_comercial"
};

const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const Jimp = require("jimp");

const getTable = (base: string): string => {
  const table = RAG_TABLES[base];
  if (!table) throw new AppError("Base RAG invalida.", 400);
  return table;
};

const createEmbedding = async (companyId: number, content: string): Promise<number[]> => {
  const resolved = await resolveAIProviderConfig({
    companyId,
    provider: "openai",
    requestType: "agent"
  });
  if (resolved.provider !== "openai") {
    throw new AppError("RAG usa embeddings OpenAI. Configure uma chave OpenAI.", 400);
  }
  const openai = new OpenAI({ apiKey: resolved.apiKey });
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: content
  });
  return response.data[0].embedding;
};

const vectorLiteral = (embedding: number[]) => `[${embedding.join(",")}]`;

export const listRagDocuments = async ({
  companyId,
  base,
  pageNumber = 1
}: {
  companyId: number;
  base: string;
  pageNumber?: string | number;
}) => {
  const table = getTable(base);
  const limit = 50;
  const offset = limit * (Number(pageNumber) - 1);
  const rows = await sequelize.query(
    `SELECT id, company_id as "companyId", content, metadata, created_at as "createdAt", updated_at as "updatedAt"
     FROM ${table}
     WHERE company_id = :companyId
     ORDER BY created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements: { companyId, limit, offset }, type: QueryTypes.SELECT }
  );
  const countResult: any[] = await sequelize.query(
    `SELECT COUNT(*)::int as count FROM ${table} WHERE company_id = :companyId`,
    { replacements: { companyId }, type: QueryTypes.SELECT }
  );
  const count = countResult[0]?.count || 0;
  return { documents: rows, count, hasMore: count > offset + rows.length };
};

export const createRagDocument = async ({
  companyId,
  userId,
  base,
  content,
  metadata = {}
}: {
  companyId: number;
  userId?: number;
  base: string;
  content: string;
  metadata?: Record<string, any>;
}) => {
  if (!content?.trim()) throw new AppError("Conteudo RAG obrigatorio.", 400);
  const table = getTable(base);
  const embedding = await createEmbedding(companyId, content);
  const enrichedMetadata = { ...metadata, company_id: companyId };

  const rows: any[] = await sequelize.query(
    `INSERT INTO ${table} (company_id, content, metadata, embedding, created_by_user_id, created_at, updated_at)
     VALUES (:companyId, :content, :metadata::jsonb, :embedding::vector, :userId, now(), now())
     RETURNING id, company_id as "companyId", content, metadata, created_at as "createdAt"`,
    {
      replacements: {
        companyId,
        content,
        metadata: JSON.stringify(enrichedMetadata),
        embedding: vectorLiteral(embedding),
        userId: userId || null
      },
      type: QueryTypes.SELECT
    }
  );
  return rows[0];
};

const normalizeText = (value?: string): string =>
  (value || "").replace(/\r/g, " ").replace(/\t/g, " ").replace(/\s{2,}/g, " ").trim();

const extractUploadText = async (file: Express.Multer.File): Promise<string> => {
  const mime = file.mimetype || "";

  if (mime.includes("pdf") || /\.pdf$/i.test(file.originalname)) {
    const parsed = await pdfParse(file.buffer);
    return normalizeText(parsed?.text || "");
  }

  if (mime.startsWith("image/")) {
    const image = await Jimp.read(file.buffer);
    const prepared = await image
      .resize(Math.min(image.bitmap.width, 1400), Jimp.AUTO)
      .greyscale()
      .contrast(0.5)
      .normalize()
      .getBufferAsync(Jimp.MIME_PNG);
    const result = await Tesseract.recognize(prepared, process.env.AI_KNOWLEDGE_BASE_OCR_LANGS || "por+eng");
    return normalizeText(result?.data?.text || "");
  }

  if (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("csv") ||
    /\.(txt|csv|json|md)$/i.test(file.originalname)
  ) {
    return normalizeText(file.buffer.toString("utf8"));
  }

  throw new AppError("Formato de arquivo RAG nao suportado. Envie PDF, imagem ou documento de texto.", 400);
};

export const createRagDocumentFromUpload = async ({
  companyId,
  userId,
  base,
  file,
  metadata = {}
}: {
  companyId: number;
  userId?: number;
  base: string;
  file?: Express.Multer.File;
  metadata?: Record<string, any>;
}) => {
  if (!file) throw new AppError("Arquivo RAG obrigatorio.", 400);

  const content = await extractUploadText(file);
  if (!content) throw new AppError("Nao foi possivel extrair texto do arquivo enviado.", 400);

  return createRagDocument({
    companyId,
    userId,
    base,
    content,
    metadata: {
      ...metadata,
      source: "upload",
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    }
  });
};

export const deleteRagDocument = async ({
  companyId,
  base,
  id
}: {
  companyId: number;
  base: string;
  id: number;
}) => {
  const table = getTable(base);
  const result: any = await sequelize.query(
    `DELETE FROM ${table} WHERE id = :id AND company_id = :companyId`,
    { replacements: { id, companyId } }
  );
  return result;
};

export const searchRagDocuments = async ({
  companyId,
  base,
  query,
  matchCount = 5
}: {
  companyId: number;
  base: string;
  query: string;
  matchCount?: number;
}) => {
  if (!query?.trim()) throw new AppError("Consulta RAG obrigatoria.", 400);
  const table = getTable(base);
  const embedding = await createEmbedding(companyId, query);
  return sequelize.query(
    `SELECT id, content, metadata, 1 - (embedding <=> :embedding::vector) AS similarity
     FROM ${table}
     WHERE company_id = :companyId
     ORDER BY embedding <=> :embedding::vector
     LIMIT :matchCount`,
    {
      replacements: { companyId, embedding: vectorLiteral(embedding), matchCount },
      type: QueryTypes.SELECT
    }
  );
};
