import { Request, Response } from "express";
import {
  cancelOfficialCampaign,
  createOfficialCampaign,
  createOfficialTemplate,
  deleteOfficialCampaign,
  deleteOfficialTemplate,
  getOfficialConnectionVerification,
  getOfficialDispatchOverview,
  listOfficialCampaigns,
  listOfficialConnections,
  listOfficialTemplates,
  pauseOfficialCampaign,
  previewOfficialCampaignPayload,
  resumeOfficialCampaign,
  showOfficialCampaign,
  startOfficialCampaign,
  syncOfficialTemplates,
  updateOfficialCampaign,
  updateOfficialTemplate
} from "../services/OfficialBroadcastService/OfficialBroadcastService";

export const listConnections = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const records = await listOfficialConnections(companyId);
  return res.json(records);
};

export const overview = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const whatsappId = req.query.whatsappId ? Number(req.query.whatsappId) : undefined;
  const data = await getOfficialDispatchOverview(companyId, whatsappId);
  return res.json(data);
};

export const verification = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const whatsappId = Number(req.params.whatsappId);
  const data = await getOfficialConnectionVerification(companyId, whatsappId);
  return res.json(data);
};

export const syncTemplates = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const whatsappId = Number(req.params.whatsappId);
  const records = await syncOfficialTemplates(companyId, whatsappId);
  return res.json(records);
};

export const indexTemplates = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const whatsappId = Number(req.params.whatsappId);
  const { searchParam, status } = req.query as { searchParam?: string; status?: string };
  const records = await listOfficialTemplates(companyId, whatsappId, searchParam, status);
  return res.json(records);
};

export const storeTemplate = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const whatsappId = Number(req.params.whatsappId);
  const record = await createOfficialTemplate(companyId, whatsappId, req.body);
  return res.status(201).json(record);
};

export const updateTemplate = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const whatsappId = Number(req.params.whatsappId);
  const templateId = Number(req.params.templateId);
  const record = await updateOfficialTemplate(companyId, whatsappId, templateId, req.body);
  return res.json(record);
};

export const removeTemplate = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const whatsappId = Number(req.params.whatsappId);
  const templateId = Number(req.params.templateId);
  const record = await deleteOfficialTemplate(companyId, whatsappId, templateId);
  return res.json(record);
};

export const previewPayload = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const preview = await previewOfficialCampaignPayload(companyId, req.body);
  return res.json(preview);
};

export const indexCampaigns = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const whatsappId = req.query.whatsappId ? Number(req.query.whatsappId) : undefined;
  const records = await listOfficialCampaigns(companyId, whatsappId);
  return res.json(records);
};

export const showCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const record = await showOfficialCampaign(companyId, id);
  return res.json(record);
};

export const storeCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const record = await createOfficialCampaign(companyId, req.body);
  return res.status(201).json(record);
};

export const updateCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const record = await updateOfficialCampaign(companyId, id, req.body);
  return res.json(record);
};

export const removeCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const record = await deleteOfficialCampaign(companyId, id);
  return res.json(record);
};

export const startCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const record = await startOfficialCampaign(companyId, id);
  return res.json(record);
};

export const pauseCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const record = await pauseOfficialCampaign(companyId, id);
  return res.json(record);
};

export const resumeCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const record = await resumeOfficialCampaign(companyId, id);
  return res.json(record);
};

export const cancelCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const record = await cancelOfficialCampaign(companyId, id);
  return res.json(record);
};
