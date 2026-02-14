import { Request, Response } from "express";
import CreateCrmLeadService from "../services/CrmLeadService/CreateCrmLeadService";
import ListCrmLeadsService from "../services/CrmLeadService/ListCrmLeadsService";
import ShowCrmLeadService from "../services/CrmLeadService/ShowCrmLeadService";
import UpdateCrmLeadService from "../services/CrmLeadService/UpdateCrmLeadService";
import DeleteCrmLeadService from "../services/CrmLeadService/DeleteCrmLeadService";
import ConvertCrmLeadService from "../services/CrmLeadService/ConvertCrmLeadService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, status, ownerUserId, pageNumber, limit } = req.query as any;

  const result = await ListCrmLeadsService({
    companyId,
    searchParam,
    status,
    ownerUserId: ownerUserId ? Number(ownerUserId) : undefined,
    pageNumber: pageNumber ? Number(pageNumber) : undefined,
    limit: limit ? Number(limit) : undefined
  });

  return res.json(result);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body;

  // Capturar UTMs da requisição (query params)
  const utmSource = req.query.utm_source as string;
  const utmMedium = req.query.utm_medium as string;
  const utmCampaign = req.query.utm_campaign as string;
  const utmTerm = req.query.utm_term as string;
  const utmContent = req.query.utm_content as string;

  // **CORREÇÃO: Não sobreescrever campos do frontend**
  let source = data.source;
  let campaign = data.campaign;
  let medium = data.medium;

  // **Apenas usa UTM se não tiver dados do frontend**
  if (!source && !campaign && (utmSource || utmMedium || utmCampaign)) {
    const utmParams = [];
    if (utmSource) utmParams.push(`source: ${utmSource}`);
    if (utmMedium) utmParams.push(`medium: ${utmMedium}`);
    if (utmCampaign) utmParams.push(`campaign: ${utmCampaign}`);
    if (utmTerm) utmParams.push(`term: ${utmTerm}`);
    if (utmContent) utmParams.push(`content: ${utmContent}`);
    
    source = `UTM: ${utmParams.join(' | ')}`;
    campaign = utmCampaign || campaign;
    medium = utmMedium || medium;
  }

  const lead = await CreateCrmLeadService({
    ...data,
    source,
    campaign,
    medium,
    companyId
  });

  return res.status(201).json(lead);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { leadId } = req.params;

  const lead = await ShowCrmLeadService({
    id: Number(leadId),
    companyId
  });

  return res.json(lead);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { leadId } = req.params;
  const data = req.body;

  const lead = await UpdateCrmLeadService({
    id: Number(leadId),
    companyId,
    ...data
  });

  return res.json(lead);
};

export const convert = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { leadId } = req.params;
  const { contactId, phone, primaryTicketId } = req.body;

  const { lead, client } = await ConvertCrmLeadService({
    leadId: Number(leadId),
    companyId,
    contactId,
    phone,
    primaryTicketId
  });

  return res.json({ lead, client });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { leadId } = req.params;

  await DeleteCrmLeadService({
    id: Number(leadId),
    companyId
  });

  return res.status(204).send();
};
