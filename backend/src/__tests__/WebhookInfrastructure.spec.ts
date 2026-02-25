import axios from "axios";
import Company from "../models/Company";
import Pipeline from "../models/Pipeline";
import Opportunity from "../models/Opportunity";
import SystemWebhook from "../models/SystemWebhook";
import WebhookDeliveryLog from "../models/WebhookDeliveryLog";
import WebhookService from "../services/PipelineServices/WebhookService";
import EventBus from "../libs/EventBus";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Webhook Infrastructure Integration Tests", () => {
    let company: Company;

    beforeAll(async () => {
        WebhookService.init();
        company = await Company.create({ name: "Webhook Test Corp" } as any);
    });

    it("should deliver webhook when event is published", async () => {
        const webhookUrl = "https://external-service.com/webhook";
        const secret = "super-secret-key";

        // 1. Criar Webhook no sistema
        const webhook = await SystemWebhook.create({
            companyId: company.id,
            eventType: "OPPORTUNITY_CREATED",
            url: webhookUrl,
            secret,
            isActive: true
        } as any);

        // Mock da resposta do axios
        mockedAxios.post.mockResolvedValue({ status: 200, data: { ok: true } });

        // 2. Publicar evento (simulando criação de oportunidade)
        const eventId = await EventBus.publish("OPPORTUNITY_CREATED", {
            opportunityId: 123,
            title: "Big Deal"
        }, company.id);

        // 3. Aguardar processamento assíncrono
        await new Promise(resolve => setTimeout(resolve, 500));

        // 4. Verificar se o axios foi chamado corretamente
        expect(mockedAxios.post).toHaveBeenCalledWith(
            webhookUrl,
            expect.stringContaining('"opportunityId":123'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    "X-CRM-Signature": expect.any(String),
                    "X-CRM-Event-Id": eventId
                })
            })
        );

        // 5. Verificar Log de entrega
        const log = await WebhookDeliveryLog.findOne({
            where: { webhookId: webhook.id, eventId, status: "SUCCESS" }
        });
        expect(log).toBeDefined();
        expect(log?.responseCode).toBe(200);
    });

    it("should retry on failure", async () => {
        const webhookUrl = "https://failing-service.com/webhook";

        const webhook = await SystemWebhook.create({
            companyId: company.id,
            eventType: "SLA_EXPIRED",
            url: webhookUrl,
            isActive: true,
            retryPolicy: { maxRetries: 2 }
        } as any);

        // Mock falha
        mockedAxios.post.mockRejectedValue({
            message: "Service Unavailable",
            response: { status: 503 }
        });

        await EventBus.publish("SLA_EXPIRED", { oppId: 456 }, company.id);

        // Aguardar tentativas (backoff inicial de 2s)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verificar logs de múltiplas tentativas
        const logs = await WebhookDeliveryLog.findAll({
            where: { webhookId: webhook.id }
        });

        expect(logs.length).toBeGreaterThan(1);
        expect(logs[0].status).toBe("FAILED");
        expect(logs[0].attempt).toBe(1);
    });
});
