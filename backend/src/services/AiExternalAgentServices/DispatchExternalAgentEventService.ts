import axios from "axios";
import AiExternalAgentConfig from "../../models/AiExternalAgentConfig";
import AiExternalAgentEvent from "../../models/AiExternalAgentEvent";
import AiExternalPromptVersion from "../../models/AiExternalPromptVersion";
import logger from "../../utils/logger";

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

const DispatchExternalAgentEventService = async ({
  eventType,
  companyId,
  config,
  promptVersion,
  data,
  userId
}: Request): Promise<AiExternalAgentEvent> => {
  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    companyId,
    agent: "external_n8n",
    data
  };

  const event = await AiExternalAgentEvent.create({
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
    await event.update({
      status: "skipped",
      errorMessage: !config.webhookEnabled
        ? "Webhook do agente externo desativado."
        : "Webhook N8N nao configurado."
    });
    return event;
  }

  try {
    const response = await axios.post(config.n8nWebhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
      validateStatus: () => true
    });

    await event.update({
      status: response.status >= 200 && response.status < 300 ? "sent" : "failed",
      responseStatus: response.status,
      responseBody: truncate(response.data),
      attempt: 1,
      sentAt: new Date(),
      errorMessage:
        response.status >= 200 && response.status < 300
          ? null
          : `N8N respondeu com status ${response.status}.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[AiExternalAgent] Falha ao enviar ${eventType}: ${message}`);
    await event.update({
      status: "failed",
      errorMessage: message,
      attempt: 1
    });
  }

  return event.reload();
};

export default DispatchExternalAgentEventService;
