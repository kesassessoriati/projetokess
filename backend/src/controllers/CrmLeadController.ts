import { Request, Response } from "express";
import CreateCrmLeadService from "../services/CrmLeadService/CreateCrmLeadService";
import ListCrmLeadsService from "../services/CrmLeadService/ListCrmLeadsService";
import ShowCrmLeadService from "../services/CrmLeadService/ShowCrmLeadService";
import UpdateCrmLeadService from "../services/CrmLeadService/UpdateCrmLeadService";
import DeleteCrmLeadService from "../services/CrmLeadService/DeleteCrmLeadService";
import ConvertCrmLeadService from "../services/CrmLeadService/ConvertCrmLeadService";
import ImportCrmLeadsService from "../services/CrmLeadService/ImportCrmLeadsService";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile, id: userId } = req.user;
  const { searchParam, status, ownerUserId, pageNumber, limit } = req.query as any;

  const result = await ListCrmLeadsService({
    companyId,
    searchParam,
    status,
    ownerUserId: ownerUserId ? Number(ownerUserId) : undefined,
    pageNumber: pageNumber ? Number(pageNumber) : undefined,
    limit: limit ? Number(limit) : undefined,
    profile,
    userId: Number(userId)
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
  const leadIdNumber = Number(leadId); // Added this line to define leadIdNumber

  await DeleteCrmLeadService({ id: leadIdNumber, companyId }); // Changed 'leadId' to 'id' to match service expectation

  return res.status(200).json({ message: "Lead removido com sucesso." });
};

export const listMessages = async (req: Request, res: Response): Promise<Response> => {
  const { leadId } = req.params;
  const { companyId } = req.user;

  // Simple query, directly in controller for expediency
  const LeadMessage = (await import("../models/LeadMessage")).default;
  const messages = await LeadMessage.findAll({
    where: { leadId },
    order: [["createdAt", "ASC"]]
  });

  return res.status(200).json(messages);
};

export const createMessage = async (req: Request, res: Response): Promise<Response> => {
  const { leadId } = req.params;
  const { companyId } = req.user;
  const { message, senderType } = req.body;

  const LeadMessage = (await import("../models/LeadMessage")).default;
  const msg = await LeadMessage.create({
    leadId: Number(leadId),
    senderType: senderType || 'agent',
    message
  });

  return res.status(201).json(msg);
};

export const importLeads = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const file = req.file;

  if (!file) {
    throw new AppError("O arquivo é obrigatório");
  }

  const { ownerUserId, pipelineId, stageId, source, autoTag, mapping, selectedRows } = req.body;

  let parsedMapping;
  if (mapping) {
    try {
      parsedMapping = JSON.parse(mapping);
    } catch (err) {
      throw new AppError("Mapeamento inválido");
    }
  }

  let parsedSelectedRows;
  if (selectedRows && selectedRows !== "undefined") {
    try {
      parsedSelectedRows = JSON.parse(selectedRows);
    } catch (err) { }
  }

  const result = await ImportCrmLeadsService({
    companyId,
    filePath: file.path,
    ownerUserId: ownerUserId ? Number(ownerUserId) : undefined,
    pipelineId: pipelineId ? Number(pipelineId) : undefined,
    stageId: stageId ? Number(stageId) : undefined,
    source,
    autoTag,
    mapping: parsedMapping,
    selectedRows: parsedSelectedRows,
  });

  return res.status(200).json(result);
};
