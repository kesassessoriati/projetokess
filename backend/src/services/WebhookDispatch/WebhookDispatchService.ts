import axios from "axios";
import { Op } from "sequelize";
import QueueIntegrations from "../../models/QueueIntegrations";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import CheckAiBlockService from "../TicketServices/CheckAiBlockService";

// ─── Tipos de eventos disponíveis ───────────────────────────────────────────

export type WebhookEventType =
  // Mensagens
  | "MESSAGE_RECEIVED"
  | "MESSAGE_SENT"
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
  MESSAGE_SENT: "Mensagem enviada",
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
    events: ["MESSAGE_RECEIVED", "MESSAGE_SENT"]
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

const MESSAGE_EVENTS = new Set<WebhookEventType>([
  "MESSAGE_RECEIVED",
  "MESSAGE_SENT"
]);

const resolveMessageIntegrations = async (
  eventType: WebhookEventType,
  companyId: number,
  data: Record<string, unknown>
): Promise<QueueIntegrations[]> => {
  const ticketId = Number((data as any)?.ticket?.id);

  if (ticketId) {
    const ticket = await Ticket.findOne({
      where: { id: ticketId, companyId },
      attributes: ["id", "webhookPausedUntil", "webhookDisabled"]
    });

    const isWebhookSuppressed =
      Boolean(ticket?.webhookDisabled) ||
      Boolean(
        ticket?.webhookPausedUntil &&
          new Date(ticket.webhookPausedUntil) > new Date()
      );

    if (isWebhookSuppressed) {
      return [];
    }

    // Verifica bloqueio de IA por contato (Ações da IA no Kanban)
    const contactId = Number((data as any)?.ticket?.contactId);
    if (contactId) {
      const aiBlock = await CheckAiBlockService(contactId, companyId);
      if (aiBlock.blocked) {
        logger.info(
          `[WebhookDispatch] MESSAGE_RECEIVED bloqueado por IA companyId=${companyId} ` +
          `ticketId=${ticketId} contactId=${contactId} reason=${aiBlock.reason}`
        );
        return [];
      }
    }
  }

  const whatsappId = Number(
    (data as any)?.whatsapp?.id ?? (data as any)?.ticket?.whatsappId
  );

  if (!whatsappId) {
    logger.warn(
      `[WebhookDispatch] Evento ${eventType} sem whatsappId; roteamento por canal ignorado.`
    );
    return [];
  }

  const whatsapp = await Whatsapp.findOne({
    where: { id: whatsappId, companyId },
    attributes: ["id", "messageIntegrationId"]
  });

  if (!whatsapp?.messageIntegrationId) {
    return [];
  }

  const integration = await QueueIntegrations.findOne({
    where: {
      id: whatsapp.messageIntegrationId,
      companyId,
      type: { [Op.in]: ["n8n", "webhook"] }
    }
  });

  if (
    !integration ||
    !integration.urlN8N ||
    !Array.isArray(integration.webhookEvents) ||
    !integration.webhookEvents.includes(eventType)
  ) {
    return [];
  }

  return [integration];
};

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
    const subscribed = MESSAGE_EVENTS.has(eventType)
      ? await resolveMessageIntegrations(eventType, companyId, data)
      : (
          await QueueIntegrations.findAll({
            where: {
              companyId,
              type: { [Op.in]: ["n8n", "webhook"] }
            }
          })
        ).filter(
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
