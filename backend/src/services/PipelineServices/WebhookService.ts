import axios from "axios";
import crypto from "crypto";
import SystemWebhook from "../../models/SystemWebhook";
import WebhookDeliveryLog from "../../models/WebhookDeliveryLog";
import EventBus, { EventData } from "../../libs/EventBus";

class WebhookService {
    public static init() {
        // Registrar interesse em todos os eventos do Pipeline/Lead Engine
        const events = [
            "OPPORTUNITY_MOVED", 
            "OPPORTUNITY_CREATED", 
            "SLA_EXPIRED",
            "LEAD_CREATED",
            "LEAD_UPDATED",
            "LEAD_STATUS_CHANGED",
            "MEETING_SCHEDULED"
        ];

        events.forEach(eventType => {
            EventBus.subscribe(eventType, this.handleEvent.bind(this));
        });

        console.log("[WebhookService] Initialized and listening to CRM events.");
    }

    private static async handleEvent(event: EventData) {
        const { type, payload, companyId, id: eventId } = event;

        // Buscar webhooks ativos para este evento e empresa
        // Também buscamos webhooks globais (companyId IS NULL)
        const webhooks = await SystemWebhook.findAll({
            where: {
                eventType: type,
                isActive: true,
                companyId: [companyId, null]
            }
        });

        for (const webhook of webhooks) {
            await this.deliver(webhook, eventDataToPayload(event));
        }
    }

    private static async deliver(webhook: SystemWebhook, payload: any, attempt = 1) {
        const startTime = Date.now();
        const eventId = payload.eventId;

        // Idempotência check: Verificar se já foi entregue com sucesso para este webhook/evento
        const alreadyDelivered = await WebhookDeliveryLog.findOne({
            where: { webhookId: webhook.id, eventId, status: "SUCCESS" }
        });

        if (alreadyDelivered) return;

        try {
            const body = JSON.stringify(payload);
            const headers: any = {
                "Content-Type": "application/json",
                "X-CRM-Event": payload.type,
                "X-CRM-Event-Id": eventId,
                "X-CRM-Attempt": attempt.toString()
            };

            // Assinatura HMAC se houver secret
            if (webhook.secret) {
                const signature = crypto
                    .createHmac("sha256", webhook.secret)
                    .update(body)
                    .digest("hex");
                headers["X-CRM-Signature"] = signature;
            }

            const response = await axios.post(webhook.url, body, {
                headers,
                timeout: 10000 // 10 segundos timeout
            });

            // Registrar Sucesso
            await WebhookDeliveryLog.create({
                webhookId: webhook.id,
                eventId,
                status: "SUCCESS",
                responseCode: response.status,
                responseBody: JSON.stringify(response.data).substring(0, 1000),
                attempt,
                executionTime: Date.now() - startTime
            });

        } catch (err: any) {
            console.error(`[WebhookService] Delivery failed for Webhook ${webhook.id}, Attempt ${attempt}:`, err.message);

            // Registrar Falha
            await WebhookDeliveryLog.create({
                webhookId: webhook.id,
                eventId,
                status: "FAILED",
                responseCode: err.response?.status,
                responseBody: err.response?.data ? JSON.stringify(err.response.data).substring(0, 1000) : err.message,
                attempt,
                executionTime: Date.now() - startTime
            });

            // Lógica de Retry
            const maxRetries = webhook.retryPolicy?.maxRetries || 3;
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 2000; // Exponential backoff (2s, 4s, 8s...)
                setTimeout(() => {
                    this.deliver(webhook, payload, attempt + 1);
                }, delay);
            }
        }
    }
}

// Helper para formatar o payload final que vai para o mundo externo
function eventDataToPayload(event: EventData) {
    return {
        eventId: event.id,
        type: event.type,
        companyId: event.companyId,
        timestamp: event.createdAt,
        data: event.payload
    };
}

export default WebhookService;
