import { Request, Response } from "express";
import { Op } from "sequelize";
import crypto from "crypto";
import logger from "../utils/logger";
import MetaLeadIntegration from "../models/MetaLeadIntegration";
import MetaLead from "../models/MetaLead";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import { processMetaLeadEntry } from "../services/MetaLeadAdsServices/ProcessMetaLeadService";

const maskToken = (token: string): string => {
  if (!token || token.length <= 10) return "••••••••";
  return `${token.substring(0, 6)}...${token.slice(-4)}`;
};

// GET /webhooks/meta/leadads — verificação do webhook pela Meta
export const verifyWebhook = async (req: Request, res: Response): Promise<void> => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  if (mode !== "subscribe" || !token || !challenge) {
    res.status(400).json({ error: "Parâmetros inválidos." });
    return;
  }

  // Busca integração com esse verify_token
  const integration = await MetaLeadIntegration.findOne({
    where: { verifyToken: token, isActive: true }
  });

  if (!integration) {
    logger.warn(`[META_LEAD_ADS] Verificação de webhook falhou: verify_token não encontrado`);
    res.status(403).json({ error: "Token de verificação inválido." });
    return;
  }

  logger.info(`[META_LEAD_ADS] Webhook verificado com sucesso para integração id=${integration.id}`);
  res.status(200).send(challenge);
};

// POST /webhooks/meta/leadads — recebimento de eventos
export const receiveWebhook = async (req: Request, res: Response): Promise<void> => {
  logger.info(`[META_LEAD_ADS] Webhook recebido`);

  // Responder imediatamente para a Meta (máximo 20s)
  res.status(200).json({ received: true });

  try {
    const body = req.body;
    if (!body || body.object !== "page") return;

    const entries: any[] = body.entry || [];
    for (const entry of entries) {
      const pageId = entry.id as string;
      const changes: any[] = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "leadgen") continue;

        const value = change.value || {};
        const leadgenId = value.leadgen_id as string;
        const formId = value.form_id as string;
        const adId = value.ad_id as string;
        const createdTime = value.created_time as number;

        if (!leadgenId) continue;

        logger.info(`[META_LEAD_ADS] leadgen_id recebido: ${leadgenId} page_id=${pageId} form_id=${formId}`);

        // Descobrir companyId via integração ativa para este page_id
        const integration = await MetaLeadIntegration.findOne({
          where: {
            pageId,
            isActive: true,
            [Op.or]: [
              { formId },
              { formId: null },
              { formId: "" }
            ]
          },
          order: [["formId", "DESC NULLS LAST"]]
        });

        if (!integration) {
          logger.warn(`[META_LEAD_ADS] Nenhuma integração ativa para page_id=${pageId}`);
          continue;
        }

        // Processar de forma assíncrona sem bloquear
        setImmediate(() =>
          processMetaLeadEntry(integration.companyId, {
            leadgen_id: leadgenId,
            form_id: formId,
            page_id: pageId,
            ad_id: adId,
            created_time: createdTime
          }).catch(err =>
            logger.error(`[META_LEAD_ADS] Erro ao processar leadgen_id=${leadgenId}: ${err.message}`)
          )
        );
      }
    }
  } catch (err: any) {
    logger.error(`[META_LEAD_ADS] Erro ao processar webhook: ${err.message}`);
  }
};

// GET /meta-lead-ads/integrations
export const listIntegrations = async (req: Request, res: Response): Promise<Response> => {
  const companyId = (req as any).user.companyId;

  const integrations = await MetaLeadIntegration.findAll({
    where: { companyId },
    include: [
      { model: Pipeline, attributes: ["id", "name"] },
      { model: PipelineStage, attributes: ["id", "name"] }
    ],
    order: [["createdAt", "DESC"]]
  });

  return res.json(
    integrations.map(i => ({
      id: i.id,
      pageId: i.pageId,
      pageName: i.pageName,
      formId: i.formId,
      formName: i.formName,
      accessToken: maskToken(i.accessToken),
      verifyToken: i.verifyToken,
      pipelineId: i.pipelineId,
      pipeline: (i as any).pipeline,
      stageId: i.stageId,
      stage: (i as any).stage,
      defaultWhatsappId: i.defaultWhatsappId,
      defaultTagName: i.defaultTagName,
      isActive: i.isActive,
      webhookUrl: `${process.env.BACKEND_URL || ""}/webhooks/meta/leadads`,
      createdAt: i.createdAt
    }))
  );
};

// POST /meta-lead-ads/integrations
export const createIntegration = async (req: Request, res: Response): Promise<Response> => {
  const companyId = (req as any).user.companyId;
  const {
    pageId, pageName, formId, formName, accessToken,
    pipelineId, stageId, defaultWhatsappId, defaultTagName, isActive
  } = req.body;

  if (!pageId || !accessToken) {
    return res.status(400).json({ error: "page_id e access_token são obrigatórios." });
  }

  const verifyToken = crypto.randomBytes(24).toString("hex");

  const integration = await MetaLeadIntegration.create({
    companyId,
    pageId,
    pageName: pageName || null,
    formId: formId || null,
    formName: formName || null,
    accessToken,
    verifyToken,
    pipelineId: pipelineId || null,
    stageId: stageId || null,
    defaultWhatsappId: defaultWhatsappId || null,
    defaultTagName: defaultTagName || "Meta Ads",
    isActive: isActive !== false
  } as any);

  return res.status(201).json({
    id: integration.id,
    verifyToken: integration.verifyToken,
    webhookUrl: `${process.env.BACKEND_URL || ""}/webhooks/meta/leadads`
  });
};

// PUT /meta-lead-ads/integrations/:id
export const updateIntegration = async (req: Request, res: Response): Promise<Response> => {
  const companyId = (req as any).user.companyId;
  const { id } = req.params;

  const integration = await MetaLeadIntegration.findOne({ where: { id, companyId } });
  if (!integration) return res.status(404).json({ error: "Integração não encontrada." });

  const {
    pageId, pageName, formId, formName, accessToken,
    pipelineId, stageId, defaultWhatsappId, defaultTagName, isActive
  } = req.body;

  const updateData: Partial<MetaLeadIntegration> = {};
  if (pageId !== undefined) updateData.pageId = pageId;
  if (pageName !== undefined) updateData.pageName = pageName;
  if (formId !== undefined) updateData.formId = formId || null;
  if (formName !== undefined) updateData.formName = formName || null;
  if (accessToken && !accessToken.includes("...")) updateData.accessToken = accessToken;
  if (pipelineId !== undefined) updateData.pipelineId = pipelineId || null;
  if (stageId !== undefined) updateData.stageId = stageId || null;
  if (defaultWhatsappId !== undefined) updateData.defaultWhatsappId = defaultWhatsappId || null;
  if (defaultTagName !== undefined) updateData.defaultTagName = defaultTagName;
  if (isActive !== undefined) updateData.isActive = isActive;

  await integration.update(updateData);

  return res.json({ ok: true });
};

// DELETE /meta-lead-ads/integrations/:id
export const deleteIntegration = async (req: Request, res: Response): Promise<Response> => {
  const companyId = (req as any).user.companyId;
  const { id } = req.params;

  const integration = await MetaLeadIntegration.findOne({ where: { id, companyId } });
  if (!integration) return res.status(404).json({ error: "Integração não encontrada." });

  await integration.destroy();
  return res.json({ ok: true });
};

// GET /meta-lead-ads/leads
export const listLeads = async (req: Request, res: Response): Promise<Response> => {
  const companyId = (req as any).user.companyId;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const status = req.query.status as string | undefined;

  const where: any = { companyId };
  if (status) where.status = status;

  const { count, rows } = await MetaLead.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [{ model: MetaLeadIntegration, attributes: ["id", "pageName", "formName"] }]
  });

  return res.json({ count, rows });
};

// GET /meta-lead-ads/by-lead/:crmLeadId — dados Meta para um lead específico do CRM
export const getLeadByCrmLeadId = async (req: Request, res: Response): Promise<Response> => {
  const companyId = (req as any).user.companyId;
  const crmLeadId = Number(req.params.crmLeadId);

  if (!crmLeadId || isNaN(crmLeadId)) {
    return res.status(400).json({ error: "crmLeadId inválido." });
  }

  const metaLead = await MetaLead.findOne({
    where: { companyId, crmLeadId },
    include: [{ model: MetaLeadIntegration, attributes: ["id", "pageName", "formName"] }],
    order: [["createdAt", "DESC"]]
  });

  if (!metaLead) {
    return res.status(404).json({ error: "Nenhum dado Meta Lead Ads encontrado para este lead." });
  }

  const rawFields: any[] = (metaLead.normalizedPayload as any)?.rawFields || [];
  const formResponses = rawFields.map((f: any) => ({
    name: f.name,
    value: Array.isArray(f.values) ? f.values[0] : String(f.values ?? "")
  }));

  const integration = (metaLead as any).integration;

  return res.json({
    id: metaLead.id,
    leadgenId: metaLead.leadgenId,
    formId: metaLead.formId,
    pageId: metaLead.pageId,
    adId: metaLead.adId || null,
    campaignId: metaLead.campaignId || null,
    adsetId: metaLead.adsetId || null,
    leadName: metaLead.leadName,
    leadPhone: metaLead.leadPhone,
    leadEmail: metaLead.leadEmail,
    status: metaLead.status,
    errorMessage: metaLead.status === "error" ? metaLead.errorMessage : undefined,
    formResponses,
    capturedAt: metaLead.createdAt,
    integration: integration
      ? { id: integration.id, pageName: integration.pageName, formName: integration.formName }
      : null
  });
};

// POST /meta-lead-ads/simulate — teste local sem chamar a Graph API
export const simulateLead = async (req: Request, res: Response): Promise<Response> => {
  const companyId = (req as any).user.companyId;
  const { integrationId, name, phone, email } = req.body;

  const integration = await MetaLeadIntegration.findOne({ where: { id: integrationId, companyId } });
  if (!integration) return res.status(404).json({ error: "Integração não encontrada." });

  const fakeLeadgenId = `sim_${Date.now()}`;

  // Monta payload simulado
  const fakeGraphData = {
    id: fakeLeadgenId,
    created_time: Math.floor(Date.now() / 1000),
    form_id: integration.formId || "sim_form",
    field_data: [
      { name: "full_name", values: [name || "Lead Simulado"] },
      ...(phone ? [{ name: "phone_number", values: [phone] }] : []),
      ...(email ? [{ name: "email", values: [email] }] : [])
    ]
  };

  // Criar registro direto sem passar pela Graph API
  try {
    const { normalizeMetaLead } = await import("../services/MetaLeadAdsServices/NormalizeMetaLeadService");
    const normalized = normalizeMetaLead(fakeGraphData.field_data);

    const existing = await MetaLead.findOne({ where: { companyId, leadgenId: fakeLeadgenId } });
    if (existing) return res.json({ ok: true, message: "Simulação já processada.", leadgenId: fakeLeadgenId });

    setImmediate(() =>
      processMetaLeadEntry(companyId, {
        leadgen_id: fakeLeadgenId,
        form_id: integration.formId || undefined,
        page_id: integration.pageId,
        ad_id: undefined,
        created_time: fakeGraphData.created_time
      }).catch(e => logger.error(`[META_LEAD_ADS] Erro na simulação: ${e.message}`))
    );

    return res.json({ ok: true, message: "Simulação disparada.", leadgenId: fakeLeadgenId, normalized });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
