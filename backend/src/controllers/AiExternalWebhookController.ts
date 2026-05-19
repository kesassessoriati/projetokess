import { Request, Response } from "express";
import * as AiExternalWebhookService from "../services/AiExternalAgentServices/AiExternalWebhookService";

const getScope = (req: Request) => ({
  companyId: Number(req.user.companyId),
  userId: Number(req.user.id)
});

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = getScope(req);
  const webhooks = await AiExternalWebhookService.listWebhooks(companyId);
  return res.json({ webhooks });
};

export const create = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, userId } = getScope(req);
  const { name, url, eventType, isActive } = req.body;

  const webhook = await AiExternalWebhookService.createWebhook(companyId, userId, {
    name,
    url,
    eventType,
    isActive
  });

  return res.status(201).json(webhook);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = getScope(req);
  const { id } = req.params;
  const { name, url, eventType, isActive } = req.body;

  const webhook = await AiExternalWebhookService.updateWebhook(Number(id), companyId, {
    name,
    url,
    eventType,
    isActive
  });

  return res.json(webhook);
};

export const toggle = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = getScope(req);
  const { id } = req.params;

  const webhook = await AiExternalWebhookService.toggleWebhook(Number(id), companyId);
  return res.json(webhook);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = getScope(req);
  const { id } = req.params;

  await AiExternalWebhookService.deleteWebhook(Number(id), companyId);
  return res.status(200).json({ message: "Webhook removido com sucesso." });
};
