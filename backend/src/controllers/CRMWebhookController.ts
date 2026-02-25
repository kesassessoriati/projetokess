import { Request, Response } from "express";
import SystemWebhook from "../models/SystemWebhook";

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
