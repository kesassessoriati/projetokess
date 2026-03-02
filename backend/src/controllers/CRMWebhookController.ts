import { Request, Response } from "express";
import SystemWebhook from "../models/SystemWebhook";
import EventBus from "../libs/EventBus";

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;

    const webhooks = await SystemWebhook.findAll({
        where: { companyId }
    });

    return res.status(200).json(webhooks);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { eventType, url, secret, isActive } = req.body;

    const webhook = await SystemWebhook.create({
        companyId,
        eventType,
        url,
        secret,
        isActive: isActive !== undefined ? isActive : true
    });

    return res.status(200).json(webhook);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { webhookId } = req.params;
    const { eventType, url, secret, isActive } = req.body;

    const webhook = await SystemWebhook.findOne({
        where: { id: webhookId, companyId }
    });

    if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
    }

    await webhook.update({
        eventType,
        url,
        secret,
        isActive
    });

    return res.status(200).json(webhook);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { webhookId } = req.params;

    const webhook = await SystemWebhook.findOne({
        where: { id: webhookId, companyId }
    });

    if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
    }

    await webhook.destroy();

    return res.status(200).json({ message: "Webhook deleted" });
};

export const testWebhook = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { eventType } = req.body;

    const testPayload = {
        test: true,
        message: "This is a test webhook payload sent from the AtendZappy Panel",
        userId: req.user.id,
        simulatedEvent: eventType || "OPPORTUNITY_MOVED",
        mockData: {
            opportunityId: 9999,
            pipelineId: 1,
            fromStageId: 1,
            toStageId: 2,
            value: 1500.50,
            contactName: "John Doe (Test)",
            phone: "5511999999999"
        }
    };

    // Publica o evento simulado no EventBus interno, que despertará o WebhookService
    await EventBus.publish(eventType || "OPPORTUNITY_MOVED", testPayload, companyId);

    return res.status(200).json({ 
        message: "Test webhook event published successfully", 
        eventType: eventType || "OPPORTUNITY_MOVED",
        simulatedPayload: testPayload
    });
};
