import axios from "axios";
import { Op } from "sequelize";
import QueueIntegrations from "../../models/QueueIntegrations";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import CheckAiBlockService from "../TicketServices/CheckAiBlockService";
import GetOrCreateAiExternalSettingsService from "../AiExternalSettingsServices/GetOrCreateAiExternalSettingsService";
import { checkCompanyAiBlock } from "../AiActionsServices/CompanyAiBlockService";
import { dispatchGlobalAiWebhook } from "./GlobalAiWebhookService";

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

// ─── Supressão de MESSAGE_RECEIVED ───────────────────────────────────────────
// O status do ticket (pending/open/group), userId e queueId NUNCA bloqueiam o
// disparo. Só bloqueiam mecanismos explícitos:
//   - ticket.webhookDisabled        → "Desligar IA" na conversa
//   - ticket.webhookPausedUntil > agora → "Pausar IA" / pausa automática por
//     intervenção de agente (MessageController)
//   - bloqueio de IA por contato    → Ações da IA / automação de etapa do funil
// A decisão vale para integrações locais E para o webhook global de IA, em
// todos os canais (Baileys e Official).
// MESSAGE_SENT nunca é suprimido pelo estado do ticket/contato: o N8N precisa
// desse evento para detectar intervenção humana (CRM ou celular).
interface SuppressionResult {
  blocked: boolean;
  reason?: string;
  until?: Date | null;
}

const checkMessageReceivedSuppression = async (
  companyId: number,
  data: Record<string, unknown>
): Promise<SuppressionResult> => {
  const ticketId = Number((data as any)?.ticket?.id);

  if (ticketId) {
    const ticket = await Ticket.findOne({
      where: { id: ticketId, companyId },
      attributes: ["id", "webhookPausedUntil", "webhookDisabled"]
    });

    if (ticket?.webhookDisabled) {
      return { blocked: true, reason: "webhook_disabled" };
    }

    if (
      ticket?.webhookPausedUntil &&
      new Date(ticket.webhookPausedUntil) > new Date()
    ) {
      return {
        blocked: true,
        reason: "webhook_paused_until",
        until: ticket.webhookPausedUntil
      };
    }
  }

  const contactId = Number((data as any)?.ticket?.contactId);
  if (contactId) {
    const aiBlock = await CheckAiBlockService(contactId, companyId);
    if (aiBlock.blocked) {
      return {
        blocked: true,
        reason: `ai_${aiBlock.reason}`,
        until: aiBlock.blockedUntil
      };
    }
  }

  return { blocked: false };
};

// Resolve integrações locais para eventos de mensagem.
// NÃO verifica bloqueio por empresa/ticket/contato aqui — isso é
// responsabilidade de dispatch().
const resolveMessageIntegrations = async (
  eventType: WebhookEventType,
  companyId: number,
  data: Record<string, unknown>
): Promise<QueueIntegrations[]> => {
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
      type: { [Op.in]: ["n8n", "webhook"] },
      active: true
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
    const isMessageEvent = MESSAGE_EVENTS.has(eventType);

    // ── Bloqueio por empresa (Pausar/Desligar IA Geral) ──────────────────────
    // Aplica somente a eventos de mensagem e bloqueia local E global.
    // Não afeta outros eventos (TICKET_CREATED, LEAD_UPDATED etc.).
    if (isMessageEvent) {
      const companyBlock = await checkCompanyAiBlock(companyId);
      if (companyBlock.blocked) {
        logger.info(
          `[WebhookDispatch] ${eventType} bloqueado por empresa companyId=${companyId} reason=${companyBlock.reason}`
        );
        return;
      }
    }

    // ── Supressão por ticket/contato (somente MESSAGE_RECEIVED) ──────────────
    // Status do ticket, fila e atendente NÃO bloqueiam. Bloqueia local E global.
    if (eventType === "MESSAGE_RECEIVED") {
      const t = ((data as any)?.ticket ?? {}) as Record<string, unknown>;
      const suppression = await checkMessageReceivedSuppression(companyId, data);
      if (suppression.blocked) {
        logger.info(
          `[WebhookDispatch] MESSAGE_RECEIVED bloqueado companyId=${companyId} ` +
            `ticketId=${t.id} contactId=${t.contactId} reason=${suppression.reason}` +
            (suppression.until
              ? ` until=${new Date(suppression.until).toISOString()}`
              : "")
        );
        return;
      }
      logger.info(
        `[WebhookDispatch] MESSAGE_RECEIVED elegível companyId=${companyId} ` +
          `ticketId=${t.id} contactId=${t.contactId} ticketStatus=${t.status} ` +
          `queueId=${t.queueId} userId=${t.userId}`
      );
    }

    // ── Resolver integrações locais ──────────────────────────────────────────
    const subscribed = isMessageEvent
      ? await resolveMessageIntegrations(eventType, companyId, data)
      : (
          await QueueIntegrations.findAll({
            where: {
              companyId,
              type: { [Op.in]: ["n8n", "webhook"] },
              active: true
            }
          })
        ).filter(
          integration =>
            Array.isArray(integration.webhookEvents) &&
            integration.webhookEvents.includes(eventType) &&
            integration.urlN8N
        );

    // ── Enriquecer payload ────────────────────────────────────────────────────
    let ai_external_settings: Record<string, unknown> | undefined;
    if (isMessageEvent) {
      try {
        ai_external_settings = await GetOrCreateAiExternalSettingsService(companyId) as any;
      } catch (settingsErr: any) {
        logger.warn(`[WebhookDispatch] Falha ao carregar ai_external_settings companyId=${companyId}: ${settingsErr.message}`);
      }
    }

    const payload: Record<string, unknown> = {
      event: eventType,
      timestamp: new Date().toISOString(),
      companyId,
      data,
      ...(ai_external_settings ? { ai_external_settings } : {})
    };

    // ── Dispatch local (somente se houver integrações configuradas) ───────────
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

    // ── Dispatch global (sempre para eventos de mensagem, independente do local) ─
    // Regra: empresa ativa → global recebe mesmo sem webhook local configurado.
    //        empresa pausada/desligada → bloqueado acima, nunca chega aqui.
    if (isMessageEvent) {
      dispatchGlobalAiWebhook(eventType, companyId, payload).catch(err => {
        logger.warn(`[WebhookDispatch] Erro no dispatch global companyId=${companyId}: ${err?.message}`);
      });
    }
  } catch (err) {
    logger.error(`[WebhookDispatch] Erro ao buscar integrações: ${err}`);
  }
};

export default { dispatch };
