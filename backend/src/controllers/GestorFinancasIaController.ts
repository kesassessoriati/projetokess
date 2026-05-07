import { Request, Response } from "express";
import { Includeable, Op } from "sequelize";
import AppError from "../errors/AppError";
import GfCategoria from "../models/GfCategoria";
import GfCategoriaMercado from "../models/GfCategoriaMercado";
import GfCategoriaMeta from "../models/GfCategoriaMeta";
import GfDespesa from "../models/GfDespesa";
import GfDivida from "../models/GfDivida";
import GfIaAnalysisResult from "../models/GfIaAnalysisResult";
import GfIaConfiguracao from "../models/GfIaConfiguracao";
import GfIaUpload from "../models/GfIaUpload";
import GfItemMercado from "../models/GfItemMercado";
import GfManutencao from "../models/GfManutencao";
import GfMeta from "../models/GfMeta";
import GfOrcamentoMercado from "../models/GfOrcamentoMercado";
import GfProfile from "../models/GfProfile";
import GfReceita from "../models/GfReceita";
import GfTipoManutencao from "../models/GfTipoManutencao";
import GfTransacao from "../models/GfTransacao";
import GfVeiculo from "../models/GfVeiculo";
import {
  finalizeAIUsage,
  resolveAIProviderConfig
} from "../services/AIProviderService/AIProviderService";
import { getStoredProviderModels } from "../services/AIProviderService/AIModelCatalogService";

const resources: Record<string, any> = {
  profiles: GfProfile,
  categorias: GfCategoria,
  receitas: GfReceita,
  despesas: GfDespesa,
  transacoes: GfTransacao,
  dividas: GfDivida,
  categorias_metas: GfCategoriaMeta,
  metas: GfMeta,
  categorias_mercado: GfCategoriaMercado,
  itens_mercado: GfItemMercado,
  orcamentos_mercado: GfOrcamentoMercado,
  veiculos: GfVeiculo,
  tipos_manutencao: GfTipoManutencao,
  manutencoes: GfManutencao,
  ia_configuracoes: GfIaConfiguracao,
  ia_uploads: GfIaUpload,
  ia_analysis_results: GfIaAnalysisResult
};

const snakeToCamel = (value: string): string =>
  value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const camelToSnake = (value: string): string =>
  value.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const normalizeInput = (payload: any): any => {
  if (Array.isArray(payload)) return payload.map(normalizeInput);
  if (!payload || typeof payload !== "object") return payload;

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (["id", "company_id", "companyId", "user_id", "userId", "created_at", "updated_at"].includes(key)) {
      return acc;
    }
    acc[snakeToCamel(key)] = value;
    return acc;
  }, {} as Record<string, any>);
};

const normalizeOutput = (record: any): any => {
  if (Array.isArray(record)) return record.map(normalizeOutput);
  if (!record) return record;

  const plain = typeof record.toJSON === "function" ? record.toJSON() : record;
  const output: Record<string, any> = {};

  Object.entries(plain).forEach(([key, value]) => {
    if (key === "company" || key === "user") return;

    if (key === "categoria") {
      output.categorias = value ? normalizeOutput(value) : null;
      return;
    }

    if (key === "categoriaMeta") {
      output.categorias_metas = value ? normalizeOutput(value) : null;
      return;
    }

    if (key === "categoriaMercado") {
      output.categorias_mercado = value ? normalizeOutput(value) : null;
      return;
    }

    output[camelToSnake(key)] = value;
  });

  return output;
};

const buildIncludes = (resource: string, select?: string): Includeable[] => {
  const includes: Includeable[] = [];
  const wants = select || "";

  if (["receitas", "despesas", "transacoes", "dividas"].includes(resource) && wants.includes("categorias")) {
    includes.push({ model: GfCategoria, as: "categoria", attributes: ["nome", "cor", "icone"], required: false });
  }

  if (resource === "metas" && wants.includes("categorias_metas")) {
    includes.push({ model: GfCategoriaMeta, as: "categoriaMeta", attributes: ["nome", "cor", "descricao"], required: false });
  }

  if (resource === "itens_mercado" && wants.includes("categorias_mercado")) {
    includes.push({ model: GfCategoriaMercado, as: "categoriaMercado", attributes: ["nome", "cor", "descricao"], required: false });
  }

  return includes;
};

const buildWhere = (filters: Array<{ column: string; operator: string; value: any }>, companyId: number, userId: number) => {
  const where: Record<string, any> = { companyId, userId };

  filters.forEach(filter => {
    const column = snakeToCamel(filter.column);
    if (["companyId", "userId"].includes(column)) return;

    if (filter.operator === "eq") {
      where[column] = filter.value;
    }

    if (filter.operator === "in" && Array.isArray(filter.value)) {
      where[column] = { [Op.in]: filter.value };
    }
  });

  return where;
};

export const query = async (req: Request, res: Response): Promise<Response> => {
  const { resource } = req.params;
  const Model = resources[resource];

  if (!Model) {
    throw new AppError("Recurso do Gestor Financeiro IA não encontrado.", 404);
  }

  const userId = Number(req.user.id);
  const companyId = Number(req.user.companyId);
  const {
    action = "select",
    filters = [],
    order,
    payload,
    select,
    single = false,
    maybeSingle = false
  } = req.body || {};

  const where = buildWhere(filters, companyId, userId);
  const include = buildIncludes(resource, select);

  if (action === "select") {
    const rows = await Model.findAll({
      where,
      include,
      order: order?.column ? [[snakeToCamel(order.column), order.ascending === false ? "DESC" : "ASC"]] : undefined
    });
    const data = normalizeOutput(rows);
    return res.json({ data: single || maybeSingle ? data[0] || null : data, error: null });
  }

  if (action === "insert") {
    const normalized = normalizeInput(payload);
    const rows = Array.isArray(normalized) ? normalized : [normalized];
    const created = await Promise.all(rows.map(row => Model.create({ ...row, companyId, userId })));
    const data = normalizeOutput(created);
    return res.status(201).json({ data: single ? data[0] : data, error: null });
  }

  if (action === "update") {
    await Model.update(normalizeInput(payload), { where });
    const rows = await Model.findAll({ where, include });
    const data = normalizeOutput(rows);
    return res.json({ data: single || maybeSingle ? data[0] || null : data, error: null });
  }

  if (action === "delete") {
    await Model.destroy({ where });
    return res.json({ data: null, error: null });
  }

  throw new AppError("Ação do Gestor Financeiro IA inválida.", 400);
};

export const me = async (req: Request, res: Response): Promise<Response> => {
  return res.json({
    data: {
      user: {
        id: String(req.user.id),
        company_id: req.user.companyId
      }
    },
    error: null
  });
};

const extractJson = (content: string) => {
  const clean = String(content || "").replace(/```json\s*|\s*```/g, "").trim();
  return JSON.parse(clean);
};

const getDefaultModel = async (provider: string, requestedModel?: string | null) => {
  const fallbackModels = await getStoredProviderModels(provider as any);
  return requestedModel ||
    fallbackModels[0]?.id ||
    (provider === "gemini"
      ? "gemini-2.5-flash"
      : provider === "openrouter"
        ? "deepseek/deepseek-chat-v3.1:free"
        : "gpt-4o-mini");
};

export const analyzeReceipt = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { fileName, mimeType, base64, provider, model } = req.body || {};

  if (!base64 || !mimeType) {
    throw new AppError("Arquivo inválido para análise.", 400);
  }

  const resolved = await resolveAIProviderConfig({
    companyId,
    provider,
    requestType: "agent",
    model
  });

  const prompt = `Analise este comprovante financeiro e extraia as informações em JSON:
{
  "tipo": "receita" ou "despesa",
  "descricao": "descrição clara da transação",
  "valor": número,
  "categoria": "categoria apropriada",
  "data": "YYYY-MM-DD",
  "confianca": número de 0 a 100
}
Responda apenas com JSON válido.`;

  let content = "";
  const defaultModel = await getDefaultModel(resolved.provider, model);

  try {
    if (resolved.provider === "gemini") {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(resolved.apiKey);
      const genModel = genAI.getGenerativeModel({ model: defaultModel });
      const result = await genModel.generateContent([
        { text: prompt },
        { inlineData: { data: base64, mimeType } }
      ]);
      content = result.response.text();
    } else {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: resolved.apiKey,
        baseURL: resolved.provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined,
        defaultHeaders: resolved.provider === "openrouter" ? {
          "HTTP-Referer": process.env.FRONTEND_URL || "https://atendzappy.com",
          "X-Title": "AtendZappy CRM"
        } : undefined
      });

      const completion = await openai.chat.completions.create({
        model: defaultModel,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` }
            }
          ] as any
        }],
        temperature: 0.1,
        max_tokens: 500
      });
      content = completion.choices[0]?.message?.content || "";
    }

    const analysis = extractJson(content);
    const data = {
      file_name: fileName || "comprovante",
      tipo: analysis.tipo,
      descricao: analysis.descricao,
      valor: parseFloat(String(analysis.valor).replace(",", ".")),
      categoria: analysis.categoria,
      data: analysis.data,
      confianca: Number(analysis.confianca || 0),
      status: "pending"
    };

    const creditInfo = await finalizeAIUsage({
      companyId,
      provider: resolved.provider,
      usageMode: resolved.usageMode,
      requestType: "gestor_financeiro_ia",
      model: defaultModel,
      status: "success",
      metadata: { fileName, mimeType }
    });

    return res.status(200).json({ data, creditInfo });
  } catch (err: any) {
    await finalizeAIUsage({
      companyId,
      provider: resolved.provider,
      usageMode: resolved.usageMode,
      requestType: "gestor_financeiro_ia",
      model: defaultModel,
      status: "error",
      errorCode: err?.status ? String(err.status) : "provider_error",
      metadata: { fileName, message: err?.message }
    }).catch(() => undefined);

    throw err;
  }
};

export const chat = async (req: Request, res: Response): Promise<Response> => {
  const companyId = Number(req.user.companyId);
  const { message, messages = [], systemPrompt, model, provider } = req.body || {};

  if (!message || typeof message !== "string") {
    throw new AppError("Mensagem inválida para o assistente financeiro.", 400);
  }

  const resolved = await resolveAIProviderConfig({
    companyId,
    provider,
    requestType: "agent",
    model
  });
  const selectedModel = await getDefaultModel(resolved.provider, model);
  const basePrompt = systemPrompt || "Você é o WA Gestor Financeiro IA, um assistente financeiro do CRM. Ajude com orçamento, receitas, despesas, metas, dívidas, organização financeira e decisões práticas. Responda em português do Brasil, de forma objetiva e segura. Não prometa retornos financeiros.";

  try {
    let content = "";

    if (resolved.provider === "gemini") {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(resolved.apiKey);
      const genModel = genAI.getGenerativeModel({ model: selectedModel });
      const history = Array.isArray(messages)
        ? messages
          .slice(-12)
          .map((item: any) => `${item.role === "assistant" ? "Assistente" : "Usuário"}: ${item.content}`)
          .join("\n")
        : "";
      const result = await genModel.generateContent(`${basePrompt}\n\n${history}\nUsuário: ${message}`);
      content = result.response.text() || "";
    } else {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: resolved.apiKey,
        baseURL: resolved.provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined,
        defaultHeaders: resolved.provider === "openrouter" ? {
          "HTTP-Referer": process.env.FRONTEND_URL || "https://atendzappy.com",
          "X-Title": "AtendZappy CRM"
        } : undefined
      });

      const chatMessages: any[] = [
        { role: "system", content: basePrompt },
        ...(Array.isArray(messages) ? messages.slice(-12).map((item: any) => ({
          role: item.role === "assistant" ? "assistant" : "user",
          content: String(item.content || "")
        })) : []),
        { role: "user", content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: chatMessages,
        temperature: 0.3,
        max_tokens: 700
      });
      content = completion.choices[0]?.message?.content || "";
    }

    const creditInfo = await finalizeAIUsage({
      companyId,
      provider: resolved.provider,
      usageMode: resolved.usageMode,
      requestType: "gestor_financeiro_ia_chat",
      model: selectedModel,
      status: "success",
      metadata: { source: "financial_assistant" }
    });

    return res.status(200).json({
      data: {
        content: content || "Não consegui gerar uma resposta agora.",
        provider: resolved.provider,
        model: selectedModel
      },
      creditInfo
    });
  } catch (err: any) {
    await finalizeAIUsage({
      companyId,
      provider: resolved.provider,
      usageMode: resolved.usageMode,
      requestType: "gestor_financeiro_ia_chat",
      model: selectedModel,
      status: "error",
      errorCode: err?.status ? String(err.status) : "provider_error",
      metadata: { message: err?.message }
    }).catch(() => undefined);

    throw err;
  }
};
