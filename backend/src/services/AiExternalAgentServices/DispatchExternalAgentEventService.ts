import axios from "axios";
import AiExternalAgentConfig from "../../models/AiExternalAgentConfig";
import AiExternalAgentEvent from "../../models/AiExternalAgentEvent";
import AiExternalPromptVersion from "../../models/AiExternalPromptVersion";
import { findActiveWebhooksForEvent } from "./AiExternalWebhookService";
import logger from "../../utils/logger";
import { buildBusinessHoursPayload } from "../../utils/businessHoursUtils";

interface Request {
  eventType: string;
  companyId: number;
  config: AiExternalAgentConfig;
  promptVersion?: AiExternalPromptVersion | null;
  data: Record<string, any>;
  userId?: number;
}

const truncate = (value: unknown, maxLength = 8000): string | null => {
  if (value === undefined || value === null) return null;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const dispatchToUrl = async (
  targetUrl: string,
  payload: Record<string, any>,
  eventRecord: AiExternalAgentEvent
): Promise<void> => {
  try {
    const response = await axios.post(targetUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
      validateStatus: () => true
    });

    const success = response.status >= 200 && response.status < 300;
    await eventRecord.update({
      status: success ? "sent" : "failed",
      responseStatus: response.status,
      responseBody: truncate(response.data),
      attempt: 1,
      sentAt: new Date(),
      errorMessage: success ? null : `Respondeu com status ${response.status}.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[AiExternalAgent] Falha ao enviar para ${targetUrl}: ${message}`);
    await eventRecord.update({
      status: "failed",
      errorMessage: message,
      attempt: 1
    });
  }
};

const DispatchExternalAgentEventService = async ({
  eventType,
  companyId,
  config,
  promptVersion,
  data,
  userId
}: Request): Promise<AiExternalAgentEvent> => {
  const businessHours = (config.metadata as any)?.businessHours ?? null;
  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    companyId,
    agent: "external_n8n",
    data,
    business_hours: buildBusinessHoursPayload(businessHours),
  };

  // --- 1. Webhooks por evento cadastrados na tabela ai_external_webhooks ---
  const perEventWebhooks = await findActiveWebhooksForEvent(companyId, eventType);

  for (const webhook of perEventWebhooks) {
    const eventRecord = await AiExternalAgentEvent.create({
      companyId,
      configId: config.id,
      promptVersionId: promptVersion?.id,
      eventType,
      status: "pending",
      targetUrl: webhook.url,
      payload,
      attempt: 0,
      createdByUserId: userId
    } as any);

    // Fire-and-forget: não bloqueia o fluxo principal em caso de falha
    dispatchToUrl(webhook.url, payload, eventRecord).catch(err =>
      logger.warn(`[AiExternalAgent] Erro disparando webhook ${webhook.id}: ${err?.message}`)
    );
  }

  // --- 2. Webhook legado da config (n8nWebhookUrl) ---
  const legacyEvent = await AiExternalAgentEvent.create({
    companyId,
    configId: config.id,
    promptVersionId: promptVersion?.id,
    eventType,
    status: "pending",
    targetUrl: config.n8nWebhookUrl || null,
    payload,
    attempt: 0,
    createdByUserId: userId
  } as any);

  if (!config.webhookEnabled || !config.n8nWebhookUrl) {
    await legacyEvent.update({
      status: "skipped",
      errorMessage: !config.webhookEnabled
        ? "Webhook legado desativado."
        : "URL legada nao configurada."
    });
    return legacyEvent;
  }

  await dispatchToUrl(config.n8nWebhookUrl, payload, legacyEvent);

  return legacyEvent.reload();
};

export default DispatchExternalAgentEventService;
