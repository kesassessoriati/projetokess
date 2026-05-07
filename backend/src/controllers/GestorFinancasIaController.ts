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
