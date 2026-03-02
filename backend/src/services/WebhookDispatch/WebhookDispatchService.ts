import axios from "axios";
import { Op } from "sequelize";
import QueueIntegrations from "../../models/QueueIntegrations";
import { logger } from "../../utils/logger";

// ─── Tipos de eventos disponíveis ───────────────────────────────────────────

export type WebhookEventType =
  // Mensagens
  | "MESSAGE_RECEIVED"
  // Conversas / Tickets
  | "TICKET_CREATED"
  | "TICKET_ASSIGNED"
  | "TICKET_QUEUE_CHANGED"
  | "TICKET_RESOLVED"
  | "TICKET_CLOSED"
  // Contatos
  | "CONTACT_CREATED"
  // CRM – Leads
  | "LEAD_CREATED"
  | "LEAD_UPDATED"
  | "LEAD_STATUS_CHANGED"
  | "LEAD_CONVERTED"
  | "LEAD_LOST"
  // CRM – Oportunidades
  | "OPPORTUNITY_CREATED"
  | "OPPORTUNITY_MOVED"
  | "OPPORTUNITY_WON"
  | "OPPORTUNITY_LOST";

// ─── Labels para o frontend ──────────────────────────────────────────────────

export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
  MESSAGE_RECEIVED: "Nova mensagem recebida",
  TICKET_CREATED: "Nova conversa criada",
  TICKET_ASSIGNED: "Conversa atribuída a agente",
  TICKET_QUEUE_CHANGED: "Conversa transferida de fila",
  TICKET_RESOLVED: "Conversa resolvida",
  TICKET_CLOSED: "Conversa encerrada",
  CONTACT_CREATED: "Novo contato criado",
  LEAD_CREATED: "Lead criado",
  LEAD_UPDATED: "Lead atualizado",
  LEAD_STATUS_CHANGED: "Status do lead alterado",
  LEAD_CONVERTED: "Lead convertido em cliente",
  LEAD_LOST: "Lead marcado como perdido",
  OPPORTUNITY_CREATED: "Oportunidade criada",
  OPPORTUNITY_MOVED: "Oportunidade movida no pipeline",
  OPPORTUNITY_WON: "Oportunidade ganha",
  OPPORTUNITY_LOST: "Oportunidade perdida"
};

// ─── Grupos para o frontend ──────────────────────────────────────────────────

export const WEBHOOK_EVENT_GROUPS: Array<{
  group: string;
  events: WebhookEventType[];
}> = [
  {
    group: "Mensagens",
    events: ["MESSAGE_RECEIVED"]
  },
  {
    group: "Conversas",
    events: [
      "TICKET_CREATED",
      "TICKET_ASSIGNED",
      "TICKET_QUEUE_CHANGED",
      "TICKET_RESOLVED",
      "TICKET_CLOSED"
    ]
  },
  {
    group: "Contatos",
    events: ["CONTACT_CREATED"]
  },
  {
    group: "CRM – Leads",
    events: [
      "LEAD_CREATED",
      "LEAD_UPDATED",
      "LEAD_STATUS_CHANGED",
      "LEAD_CONVERTED",
      "LEAD_LOST"
    ]
  },
  {
    group: "CRM – Oportunidades",
    events: [
      "OPPORTUNITY_CREATED",
      "OPPORTUNITY_MOVED",
      "OPPORTUNITY_WON",
      "OPPORTUNITY_LOST"
    ]
  }
];

// ─── Dispatch ────────────────────────────────────────────────────────────────

/**
 * Dispara o evento para todas as integrações n8n/webhook da empresa
 * que tenham esse evento configurado em webhookEvents.
 *
 * Fire-and-forget: erros são logados mas não propagados para não
 * interromper o fluxo principal da aplicação.
 */
export const dispatch = async (
  eventType: WebhookEventType,
  companyId: number,
  data: Record<string, unknown>
): Promise<void> => {
  try {
    const integrations = await QueueIntegrations.findAll({
      where: {
        companyId,
        type: { [Op.in]: ["n8n", "webhook"] }
      }
    });

    const subscribed = integrations.filter(
      integration =>
        Array.isArray(integration.webhookEvents) &&
        integration.webhookEvents.includes(eventType) &&
        integration.urlN8N
    );

    if (subscribed.length === 0) return;

    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      companyId,
      data
    };

    for (const integration of subscribed) {
      axios
        .post(integration.urlN8N, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000
        })
        .catch(err => {
          logger.warn(
            `[WebhookDispatch] Falha ao enviar ${eventType} para ${integration.urlN8N}: ${err.message}`
          );
        });
    }
  } catch (err) {
    logger.error(`[WebhookDispatch] Erro ao buscar integrações: ${err}`);
  }
};

export default { dispatch };
