import { Request, Response } from "express";
import CreateCrmLeadService from "../services/CrmLeadService/CreateCrmLeadService";
import ListCrmLeadsService from "../services/CrmLeadService/ListCrmLeadsService";
import ShowCrmLeadService from "../services/CrmLeadService/ShowCrmLeadService";
import UpdateCrmLeadService from "../services/CrmLeadService/UpdateCrmLeadService";
import DeleteCrmLeadService from "../services/CrmLeadService/DeleteCrmLeadService";
import ConvertCrmLeadService from "../services/CrmLeadService/ConvertCrmLeadService";
import ImportCrmLeadsService from "../services/CrmLeadService/ImportCrmLeadsService";
import ExportCrmLeadsService from "../services/CrmLeadService/ExportCrmLeadsService";
import AppError from "../errors/AppError";
import serializeCrmLead from "../services/CrmLeadService/helpers/serializeCrmLead";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile, id: userId } = req.user;
  const { searchParam, status, product, ownerUserId, pageNumber, limit } = req.query as any;

  const result = await ListCrmLeadsService({
    companyId,
    searchParam,
    status,
    product,
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
  const data = { ...req.body };
  delete data.sessionid;

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

  return res.status(201).json(serializeCrmLead(lead));
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { leadId } = req.params;

  const lead = await ShowCrmLeadService({
    id: Number(leadId),
    companyId
  });

  return res.json(serializeCrmLead(lead));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { leadId } = req.params;
  const data = { ...req.body };
  delete data.sessionid;

  const lead = await UpdateCrmLeadService({
    id: Number(leadId),
    companyId,
    ...data
  });

  return res.json(serializeCrmLead(lead));
};

export const exportLeads = async (req: Request, res: Response): Promise<void> => {
  const { companyId, profile, id: userId } = req.user;
  const { searchParam, status, product, ownerUserId } = req.query as any;

  const buffer = await ExportCrmLeadsService({
    companyId,
    searchParam,
    status,
    product,
    ownerUserId: ownerUserId ? Number(ownerUserId) : undefined,
    profile,
    userId: Number(userId)
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=leads.xlsx");

  res.end(buffer);
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

export const listAttachments = async (req: Request, res: Response): Promise<Response> => {
  const { leadId } = req.params;
  const { companyId } = req.user;

  const LeadAttachment = (await import("../models/LeadAttachment")).default;
  const attachments = await LeadAttachment.findAll({
    where: { leadId: Number(leadId), companyId },
    order: [["createdAt", "DESC"]]
  });

  return res.status(200).json(attachments);
};

export const uploadAttachments = async (req: Request, res: Response): Promise<Response> => {
  const { leadId } = req.params;
  const { companyId } = req.user;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new AppError("Nenhum arquivo enviado.", 400);
  }

  const LeadAttachment = (await import("../models/LeadAttachment")).default;
  const saved = await LeadAttachment.bulkCreate(
    files.map(f => ({
      leadId: Number(leadId),
      companyId,
      originalName: f.originalname,
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size
    }))
  );

  return res.status(201).json(saved);
};

export const deleteAttachment = async (req: Request, res: Response): Promise<Response> => {
  const { leadId, attachmentId } = req.params;
  const { companyId } = req.user;

  const LeadAttachment = (await import("../models/LeadAttachment")).default;
  const attachment = await LeadAttachment.findOne({
    where: { id: Number(attachmentId), leadId: Number(leadId), companyId }
  });

  if (!attachment) {
    throw new AppError("Anexo não encontrado.", 404);
  }

  // Remove o arquivo do disco
  try {
    const path = await import("path");
    const fs = await import("fs");
    const uploadConfig = (await import("../config/upload")).default;
    const filePath = path.default.resolve(
      uploadConfig.directory,
      `company${companyId}`,
      "leads",
      String(leadId),
      attachment.filename
    );
    if (fs.default.existsSync(filePath)) {
      fs.default.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("[deleteAttachment] Erro ao remover arquivo do disco:", err);
  }

  await attachment.destroy();

  return res.status(200).json({ message: "Anexo removido com sucesso." });
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
