import axios from "axios";
import crypto from "crypto";
import GroupWebhookSetting from "../../models/GroupWebhookSetting";
import GroupDirectory from "../../models/GroupDirectory";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { isSafeWebhookUrl } from "../../helpers/isSafeWebhookUrl";
import logger from "../../utils/logger";
import {
  mapMessageEventToGroupEvent,
  buildGroupWebhookPayload,
  filterGroupWebhookTargets
} from "./groupWebhookCore";

// Cache barato (60s) de "esta empresa tem algum webhook de grupo ativo?".
// Garante early-exit sem custo para a esmagadora maioria das mensagens
// (empresas que não usam o recurso pagam ~zero por mensagem).
const activeCompanyCache = new Map<number, { has: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000;

export const invalidateGroupWebhookCache = (companyId: number): void => {
  activeCompanyCache.delete(companyId);
};

const companyHasActiveWebhook = async (companyId: number): Promise<boolean> => {
  const hit = activeCompanyCache.get(companyId);
  if (hit && hit.expiresAt > Date.now()) return hit.has;
  const count = await GroupWebhookSetting.count({ where: { companyId, enabled: true } });
  const has = count > 0;
  activeCompanyCache.set(companyId, { has, expiresAt: Date.now() + CACHE_TTL_MS });
  return has;
};

const safeHost = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return "?";
  }
};

const sendOne = async (
  webhook: GroupWebhookSetting,
  payload: Record<string, unknown>,
  event: string,
  companyId: number,
  groupId: number
): Promise<void> => {
  const start = Date.now();
  const host = safeHost(webhook.url);
  try {
    if (!isSafeWebhookUrl(webhook.url)) {
      logger.warn(
        `[GROUP_WEBHOOK] dispatch failed companyId=${companyId} groupId=${groupId} event=${event} webhookId=${webhook.id} reason=unsafe_url host=${host}`
      );
      return;
    }

    logger.info(
      `[GROUP_WEBHOOK] dispatch started companyId=${companyId} groupId=${groupId} event=${event} webhookId=${webhook.id} host=${host}`
    );

    const bodyStr = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "AtendZappy-GroupWebhook"
    };
    // O secret NUNCA vai no corpo; só assina o payload via header HMAC.
    if (webhook.secret) {
      headers["X-Group-Webhook-Signature"] =
        "sha256=" + crypto.createHmac("sha256", webhook.secret).update(bodyStr).digest("hex");
    }

    const response = await axios.post(webhook.url, payload, {
      headers,
      timeout: 8000,
      maxRedirects: 2,
      maxContentLength: 1024 * 256,
      validateStatus: () => true
    });

    const durationMs = Date.now() - start;
    const ok = response.status >= 200 && response.status < 300;

    await webhook
      .update({
        lastStatus: String(response.status),
        lastError: ok ? null : `HTTP ${response.status}`,
        lastSentAt: new Date()
      })
      .catch(() => undefined);

    if (ok) {
      logger.info(
        `[GROUP_WEBHOOK] dispatch success companyId=${companyId} groupId=${groupId} event=${event} webhookId=${webhook.id} statusCode=${response.status} durationMs=${durationMs}`
      );
    } else {
      logger.warn(
        `[GROUP_WEBHOOK] dispatch failed companyId=${companyId} groupId=${groupId} event=${event} webhookId=${webhook.id} statusCode=${response.status} durationMs=${durationMs}`
      );
    }
  } catch (error: any) {
    const durationMs = Date.now() - start;
    await webhook
      .update({
        lastStatus: "error",
        lastError: String(error?.message || error).slice(0, 500),
        lastSentAt: new Date()
      })
      .catch(() => undefined);
    logger.warn(
      `[GROUP_WEBHOOK] dispatch failed companyId=${companyId} groupId=${groupId} event=${event} webhookId=${webhook.id} durationMs=${durationMs} error=${error?.message}`
    );
  }
};

/**
 * Ponto único chamado pelo WebhookDispatchService para eventos de mensagem.
 * Fire-and-forget: NUNCA lança e NUNCA bloqueia o fluxo principal de mensagens.
 * Multi-tenant: tudo filtrado por companyId; o grupo é resolvido pelo
 * remoteJid do contato do ticket (g.us) cruzado com GroupDirectory da empresa.
 */
export const maybeDispatchGroupMessage = async (
  eventType: string,
  companyId: number,
  data: Record<string, unknown>
): Promise<void> => {
  try {
    const mappedEvent = mapMessageEventToGroupEvent(eventType);
    if (!mappedEvent || !companyId) return;

    // Early-exit barato: empresa sem webhook de grupo ativo → nada a fazer.
    if (!(await companyHasActiveWebhook(companyId))) return;

    const ticketId = Number((data as any)?.ticket?.id);
    if (!ticketId) return;

    const ticket = await Ticket.findOne({
      where: { id: ticketId, companyId },
      attributes: ["id", "isGroup", "contactId"]
    });
    if (!ticket || !ticket.isGroup) return; // só mensagens de grupo

    const contact = await Contact.findOne({
      where: { id: ticket.contactId, companyId },
      attributes: ["id", "name", "number", "remoteJid"]
    });
    const groupJid = contact?.remoteJid;
    if (!groupJid) return;

    const group = await GroupDirectory.findOne({
      where: { companyId, groupJid },
      attributes: ["id", "groupJid", "subject"]
    });
    if (!group) {
      logger.info(
        `[GROUP_WEBHOOK] skipped group not in directory companyId=${companyId} event=${mappedEvent}`
      );
      return;
    }

    const settings = await GroupWebhookSetting.findAll({
      where: { companyId, enabled: true }
    });
    const targets = filterGroupWebhookTargets(settings, group.id, mappedEvent);
    if (targets.length === 0) {
      logger.info(
        `[GROUP_WEBHOOK] skipped group not selected companyId=${companyId} groupId=${group.id} event=${mappedEvent}`
      );
      return;
    }

    const messageData = (data as any)?.message;
    const contactData = (data as any)?.contact || {
      id: contact?.id,
      name: contact?.name,
      number: contact?.number
    };

    for (const webhook of targets) {
      const payload = buildGroupWebhookPayload(
        mappedEvent,
        companyId,
        webhook.id,
        { id: group.id, jid: group.groupJid, name: group.subject },
        messageData,
        contactData
      );
      // Não await: cada envio é independente e fire-and-forget.
      void sendOne(webhook, payload, mappedEvent, companyId, group.id);
    }
  } catch (error: any) {
    // Nunca propaga: não pode travar o fluxo de mensagens.
    logger.warn(`[GROUP_WEBHOOK] dispatch error companyId=${companyId}: ${error?.message}`);
  }
};

export default { maybeDispatchGroupMessage, invalidateGroupWebhookCache };
