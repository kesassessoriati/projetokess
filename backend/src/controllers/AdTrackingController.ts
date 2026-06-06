import { Request, Response } from "express";
import { Op } from "sequelize";
import AdTrackingIntegration from "../models/AdTrackingIntegration";
import AdTrackingMapping from "../models/AdTrackingMapping";
import AdTrackingEvent from "../models/AdTrackingEvent";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import { testMetaConnection } from "../services/AdTrackingServices/MetaAdsService";
import { validateGoogleAdsConfig } from "../services/AdTrackingServices/GoogleAdsService";

const VALID_PROVIDERS = ["meta", "google"] as const;
type Provider = typeof VALID_PROVIDERS[number];

const maskCreds = (credentials: Record<string, any>): Record<string, any> => {
  const masked = { ...credentials };
  const sensitiveKeys = ["accessToken", "refreshToken", "clientSecret", "developerToken"];
  for (const key of sensitiveKeys) {
    if (masked[key]) {
      const v = String(masked[key]);
      masked[key] = v.length > 10 ? `${v.substring(0, 6)}...${v.slice(-4)}` : "••••••••";
    }
  }
  return masked;
};

// GET /ad-tracking/:provider/config
export const getConfig = async (req: Request, res: Response): Promise<Response> => {
  const { provider } = req.params;
  const companyId = (req as any).user.companyId;

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    return res.status(400).json({ error: "Provider inválido." });
  }

  const integration = await AdTrackingIntegration.findOne({
    where: { companyId, provider }
  });

  if (!integration) {
    return res.json({ found: false, active: false, credentials: {}, settings: {} });
  }

  return res.json({
    found: true,
    id: integration.id,
    active: integration.active,
    credentials: maskCreds(integration.credentials),
    settings: integration.settings
  });
};

// POST /ad-tracking/:provider/config
export const saveConfig = async (req: Request, res: Response): Promise<Response> => {
  const { provider } = req.params;
  const companyId = (req as any).user.companyId;

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    return res.status(400).json({ error: "Provider inválido." });
  }

  const { active, credentials, settings } = req.body;

  let integration = await AdTrackingIntegration.findOne({ where: { companyId, provider } });

  const newCreds = { ...(integration?.credentials || {}) };
  if (credentials && typeof credentials === "object") {
    for (const [k, v] of Object.entries(credentials)) {
      // If value is masked (contains "..."), keep existing
      if (typeof v === "string" && v.includes("...") && v.endsWith(v.slice(-4))) {
        continue;
      }
      if (v !== undefined && v !== null && v !== "") {
        newCreds[k] = v;
      }
    }
  }

  if (!integration) {
    integration = await AdTrackingIntegration.create({
      companyId,
      provider,
      active: Boolean(active),
      credentials: newCreds,
      settings: settings || {}
    });
  } else {
    await integration.update({
      active: Boolean(active),
      credentials: newCreds,
      settings: settings || integration.settings
    });
  }

  return res.json({
    id: integration.id,
    active: integration.active,
    credentials: maskCreds(integration.credentials),
    settings: integration.settings
  });
};

// POST /ad-tracking/:provider/test
export const testConnection = async (req: Request, res: Response): Promise<Response> => {
  const { provider } = req.params;
  const companyId = (req as any).user.companyId;

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    return res.status(400).json({ error: "Provider inválido." });
  }

  const integration = await AdTrackingIntegration.findOne({ where: { companyId, provider } });
  if (!integration) {
    return res.status(404).json({ ok: false, message: "Integração não configurada." });
  }

  const creds = integration.credentials || {};

  if (provider === "meta") {
    const result = await testMetaConnection(creds.pixelId, creds.accessToken);
    return res.json(result);
  }

  if (provider === "google") {
    const result = await validateGoogleAdsConfig(creds as any);
    return res.json(result);
  }

  return res.status(400).json({ ok: false, message: "Provider não suportado." });
};

// GET /ad-tracking/:provider/mappings
export const getMappings = async (req: Request, res: Response): Promise<Response> => {
  const { provider } = req.params;
  const companyId = (req as any).user.companyId;

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    return res.status(400).json({ error: "Provider inválido." });
  }

  const mappings = await AdTrackingMapping.findAll({
    where: { companyId, provider },
    include: [
      { model: Pipeline, as: "pipeline", attributes: ["id", "name"] },
      { model: PipelineStage, as: "stage", attributes: ["id", "name"] }
    ],
    order: [["createdAt", "DESC"]]
  });

  return res.json(mappings);
};

// POST /ad-tracking/:provider/mappings
export const createMapping = async (req: Request, res: Response): Promise<Response> => {
  const { provider } = req.params;
  const companyId = (req as any).user.companyId;

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    return res.status(400).json({ error: "Provider inválido." });
  }

  const { pipelineId, stageId, eventName, customEventName } = req.body;

  if (!pipelineId || !stageId || !eventName) {
    return res.status(400).json({ error: "pipelineId, stageId e eventName são obrigatórios." });
  }

  const pipeline = await Pipeline.findOne({ where: { id: pipelineId, companyId } });
  if (!pipeline) return res.status(404).json({ error: "Pipeline não encontrado." });

  const stage = await PipelineStage.findOne({ where: { id: stageId, pipelineId } });
  if (!stage) return res.status(404).json({ error: "Etapa não encontrada." });

  let integration = await AdTrackingIntegration.findOne({ where: { companyId, provider } });
  if (!integration) {
    integration = await AdTrackingIntegration.create({
      companyId,
      provider: provider as Provider,
      active: false,
      credentials: {},
      settings: {}
    });
  }

  const mapping = await AdTrackingMapping.create({
    companyId,
    provider: provider as Provider,
    integrationId: integration.id,
    pipelineId: Number(pipelineId),
    stageId: Number(stageId),
    eventName,
    customEventName: customEventName || null,
    active: true
  });

  const full = await AdTrackingMapping.findOne({
    where: { id: mapping.id },
    include: [
      { model: Pipeline, as: "pipeline", attributes: ["id", "name"] },
      { model: PipelineStage, as: "stage", attributes: ["id", "name"] }
    ]
  });

  return res.status(201).json(full);
};

// PUT /ad-tracking/:provider/mappings/:id
export const updateMapping = async (req: Request, res: Response): Promise<Response> => {
  const { provider, id } = req.params;
  const companyId = (req as any).user.companyId;

  const mapping = await AdTrackingMapping.findOne({ where: { id: Number(id), companyId, provider } });
  if (!mapping) return res.status(404).json({ error: "Mapeamento não encontrado." });

  const { pipelineId, stageId, eventName, customEventName, active } = req.body;

  await mapping.update({
    pipelineId: pipelineId !== undefined ? Number(pipelineId) : mapping.pipelineId,
    stageId: stageId !== undefined ? Number(stageId) : mapping.stageId,
    eventName: eventName || mapping.eventName,
    customEventName: customEventName !== undefined ? customEventName : mapping.customEventName,
    active: active !== undefined ? Boolean(active) : mapping.active
  });

  return res.json(mapping);
};

// DELETE /ad-tracking/:provider/mappings/:id
export const deleteMapping = async (req: Request, res: Response): Promise<Response> => {
  const { provider, id } = req.params;
  const companyId = (req as any).user.companyId;

  const mapping = await AdTrackingMapping.findOne({ where: { id: Number(id), companyId, provider } });
  if (!mapping) return res.status(404).json({ error: "Mapeamento não encontrado." });

  await mapping.destroy();
  return res.json({ ok: true });
};

// GET /ad-tracking/:provider/events
export const getEvents = async (req: Request, res: Response): Promise<Response> => {
  const { provider } = req.params;
  const companyId = (req as any).user.companyId;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    return res.status(400).json({ error: "Provider inválido." });
  }

  const { count, rows } = await AdTrackingEvent.findAndCountAll({
    where: { companyId, provider },
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    attributes: [
      "id", "provider", "integrationId", "mappingId",
      "leadId", "opportunityId", "contactId",
      "pipelineId", "stageId", "eventName",
      "status", "errorMessage", "createdAt",
      // resposta apenas sem tokens
      "response"
    ]
  });

  return res.json({ count, rows });
};
