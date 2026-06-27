import { Request, Response } from "express";
import axios from "axios";
import { Op } from "sequelize";
import AppError from "../errors/AppError";
import GroupWebhookSetting from "../models/GroupWebhookSetting";
import GroupDirectory from "../models/GroupDirectory";
import { isSafeWebhookUrl } from "../helpers/isSafeWebhookUrl";
import logger from "../utils/logger";
import {
  ALLOWED_GROUP_WEBHOOK_EVENTS,
  isValidGroupWebhookEvents,
  normalizeGroupWebhookEvents
} from "../services/GroupWebhookServices/groupWebhookCore";
import { invalidateGroupWebhookCache } from "../services/GroupWebhookServices/GroupWebhookDispatchService";

// Nunca retorna o secret cru — apenas indica se há um configurado.
const serialize = (w: GroupWebhookSetting) => ({
  id: w.id,
  name: w.name,
  url: w.url,
  hasSecret: !!w.secret,
  events: Array.isArray(w.events) ? w.events : [],
  selectedGroups: Array.isArray(w.selectedGroups) ? w.selectedGroups : [],
  enabled: w.enabled,
  lastStatus: w.lastStatus,
  lastError: w.lastError,
  lastSentAt: w.lastSentAt,
  createdAt: w.createdAt,
  updatedAt: w.updatedAt
});

// Valida que todos os grupos pertencem à empresa autenticada (anti cross-tenant).
const validateGroupsOwnership = async (
  companyId: number,
  selectedGroups: unknown
): Promise<number[]> => {
  const ids = Array.from(
    new Set((Array.isArray(selectedGroups) ? selectedGroups : []).map(Number).filter(n => Number.isInteger(n) && n > 0))
  );
  if (ids.length === 0) return [];
  const count = await GroupDirectory.count({ where: { id: { [Op.in]: ids }, companyId } });
  if (count !== ids.length) {
    throw new AppError("ERR_GROUP_WEBHOOK_INVALID_GROUP", 400);
  }
  return ids;
};

const validatePayload = async (companyId: number, body: any) => {
  const url = String(body?.url || "").trim();
  if (!url || !isSafeWebhookUrl(url)) {
    throw new AppError("ERR_GROUP_WEBHOOK_INVALID_URL", 400);
  }
  if (!isValidGroupWebhookEvents(body?.events)) {
    throw new AppError("ERR_GROUP_WEBHOOK_INVALID_EVENTS", 400);
  }
  const events = normalizeGroupWebhookEvents(body.events);
  const selectedGroups = await validateGroupsOwnership(companyId, body?.selectedGroups);
  const name = String(body?.name || "").trim().slice(0, 120) || "Webhook de grupos";
  return { url, events, selectedGroups, name };
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const webhooks = await GroupWebhookSetting.findAll({
    where: { companyId },
    order: [["createdAt", "DESC"]]
  });
  return res.json({
    webhooks: webhooks.map(serialize),
    allowedEvents: ALLOWED_GROUP_WEBHOOK_EVENTS
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { url, events, selectedGroups, name } = await validatePayload(companyId, req.body);
  const secret = req.body?.secret ? String(req.body.secret).slice(0, 255) : null;
  const enabled = req.body?.enabled !== undefined ? !!req.body.enabled : true;

  const webhook = await GroupWebhookSetting.create({
    companyId,
    name,
    url,
    secret,
    events,
    selectedGroups,
    enabled,
    createdByUserId: Number(userId) || null
  } as any);

  invalidateGroupWebhookCache(companyId);
  return res.status(201).json(serialize(webhook));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const webhook = await GroupWebhookSetting.findOne({ where: { id: Number(id), companyId } });
  if (!webhook) throw new AppError("ERR_GROUP_WEBHOOK_NOT_FOUND", 404);

  const { url, events, selectedGroups, name } = await validatePayload(companyId, req.body);
  const updateData: any = { url, events, selectedGroups, name };

  if (req.body?.enabled !== undefined) updateData.enabled = !!req.body.enabled;
  // Mantém o secret existente quando o campo é omitido ou vem mascarado.
  if (req.body?.secret !== undefined) {
    const s = String(req.body.secret || "");
    if (s && !/^\*+$/.test(s)) updateData.secret = s.slice(0, 255);
    else if (s === "") updateData.secret = null;
  }

  await webhook.update(updateData);
  invalidateGroupWebhookCache(companyId);
  return res.json(serialize(webhook));
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const webhook = await GroupWebhookSetting.findOne({ where: { id: Number(id), companyId } });
  if (!webhook) throw new AppError("ERR_GROUP_WEBHOOK_NOT_FOUND", 404);
  await webhook.destroy();
  invalidateGroupWebhookCache(companyId);
  return res.json({ ok: true });
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const webhook = await GroupWebhookSetting.findOne({ where: { id: Number(id), companyId } });
  if (!webhook) throw new AppError("ERR_GROUP_WEBHOOK_NOT_FOUND", 404);
  if (!isSafeWebhookUrl(webhook.url)) throw new AppError("ERR_GROUP_WEBHOOK_INVALID_URL", 400);

  const payload = {
    event: "group.webhook.test",
    companyId,
    webhookId: webhook.id,
    group: { id: null, jid: null, name: "Grupo de teste" },
    message: {
      id: null,
      fromMe: false,
      body: "Teste de webhook de grupos do AtendZappy.",
      type: "chat",
      timestamp: new Date().toISOString()
    },
    contact: { id: null, name: "Contato de teste", number: null }
  };

  let host = "?";
  try {
    host = new URL(webhook.url).host;
  } catch {
    /* noop */
  }

  try {
    const response = await axios.post(webhook.url, payload, {
      headers: { "Content-Type": "application/json", "User-Agent": "AtendZappy-GroupWebhook" },
      timeout: 8000,
      maxRedirects: 2,
      maxContentLength: 1024 * 256,
      validateStatus: () => true
    });
    const ok = response.status >= 200 && response.status < 300;
    await webhook
      .update({ lastStatus: String(response.status), lastError: ok ? null : `HTTP ${response.status}`, lastSentAt: new Date() })
      .catch(() => undefined);
    logger.info(`[GROUP_WEBHOOK] test companyId=${companyId} webhookId=${webhook.id} statusCode=${response.status} host=${host}`);
    return res.json({ success: ok, statusCode: response.status });
  } catch (error: any) {
    await webhook
      .update({ lastStatus: "error", lastError: String(error?.message || error).slice(0, 500), lastSentAt: new Date() })
      .catch(() => undefined);
    logger.warn(`[GROUP_WEBHOOK] test failed companyId=${companyId} webhookId=${webhook.id} host=${host} error=${error?.message}`);
    return res.json({ success: false, error: "Falha ao enviar webhook de teste." });
  }
};
