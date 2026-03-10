import { Request, Response } from "express";
import * as ButtonCampaignService from "../services/ButtonCampaignService/ButtonCampaignService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await ButtonCampaignService.listButtonCampaigns(companyId, { page, limit });
  return res.json(result);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);

  const campaign = await ButtonCampaignService.showButtonCampaign(id, companyId);
  return res.json(campaign);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    name,
    whatsappId,
    messageType,
    message,
    footer,
    buttons,
    listSections,
    listButtonText,
    targetNumbers,
    intervalSeconds,
    scheduledAt
  } = req.body;

  const campaign = await ButtonCampaignService.createButtonCampaign({
    companyId,
    whatsappId: Number(whatsappId),
    name,
    messageType,
    message,
    footer,
    buttons,
    listSections,
    listButtonText,
    targetNumbers,
    intervalSeconds: Number(intervalSeconds) || 3,
    scheduledAt
  });

  return res.status(201).json(campaign);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);

  const campaign = await ButtonCampaignService.updateButtonCampaign(id, companyId, req.body);
  return res.json(campaign);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);

  await ButtonCampaignService.deleteButtonCampaign(id, companyId);
  return res.json({ message: "Campanha removida" });
};

export const start = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);

  await ButtonCampaignService.executeButtonCampaign(id, companyId);
  return res.json({ message: "Campanha iniciada" });
};

export const cancel = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);

  await ButtonCampaignService.updateButtonCampaign(id, companyId, { status: "CANCELLED" });
  return res.json({ message: "Campanha cancelada" });
};
