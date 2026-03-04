import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import CreateCrmLeadService from "../../services/CrmLeadService/CreateCrmLeadService";
import ListCrmLeadsService from "../../services/CrmLeadService/ListCrmLeadsService";
import ShowCrmLeadService from "../../services/CrmLeadService/ShowCrmLeadService";
import UpdateCrmLeadService from "../../services/CrmLeadService/UpdateCrmLeadService";
import ConvertCrmLeadService from "../../services/CrmLeadService/ConvertCrmLeadService";
import triggerExternalWebhook from "../../services/ExternalWebhook/triggerExternalWebhook";

const ensureExternalAuth = (req: Request) => {
  if (!req.externalAuth) {
    throw new AppError("ERR_EXTERNAL_AUTH_REQUIRED", 401);
  }
  return req.externalAuth;
};

// GET /api/external/crm-leads
export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const {
    searchParam,
    status,
    ownerUserId,
    pageNumber,
    limit
  } = req.query as any;

  const result = await ListCrmLeadsService({
    companyId,
    searchParam,
    status,
    ownerUserId: ownerUserId ? Number(ownerUserId) : undefined,
    pageNumber: pageNumber ? Number(pageNumber) : 1,
    limit: limit ? Number(limit) : 20,
    profile: "admin",
    userId: 0
  });

  return res.json(result);
};

// GET /api/external/crm-leads/:id
export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const { id } = req.params;

  const lead = await ShowCrmLeadService({
    id: Number(id),
    companyId
  });

  return res.json(lead);
};

// POST /api/external/crm-leads
export const store = async (req: Request, res: Response): Promise<Response> => {
  const externalAuth = ensureExternalAuth(req);
  const data = req.body;

  if (!data.name) {
    throw new AppError("ERR_LEAD_NAME_REQUIRED", 400);
  }

  const lead = await CreateCrmLeadService({
    ...data,
    companyId: externalAuth.companyId
  });

  await triggerExternalWebhook({
    url: externalAuth.webhookUrl,
    secret: externalAuth.webhookSecret,
    event: "lead.created",
    data: { apiKeyId: externalAuth.apiKeyId, lead }
  });

  return res.status(201).json(lead);
};

// PUT /api/external/crm-leads/:id
export const update = async (req: Request, res: Response): Promise<Response> => {
  const externalAuth = ensureExternalAuth(req);
  const { id } = req.params;
  const data = req.body;

  const lead = await UpdateCrmLeadService({
    id: Number(id),
    companyId: externalAuth.companyId,
    ...data
  });

  await triggerExternalWebhook({
    url: externalAuth.webhookUrl,
    secret: externalAuth.webhookSecret,
    event: "lead.updated",
    data: { apiKeyId: externalAuth.apiKeyId, lead }
  });

  return res.json(lead);
};

// POST /api/external/crm-leads/:id/convert
export const convert = async (req: Request, res: Response): Promise<Response> => {
  const externalAuth = ensureExternalAuth(req);
  const { id } = req.params;
  const { contactId, phone, primaryTicketId } = req.body;

  const result = await ConvertCrmLeadService({
    leadId: Number(id),
    companyId: externalAuth.companyId,
    contactId: contactId ? Number(contactId) : undefined,
    phone,
    primaryTicketId: primaryTicketId ? Number(primaryTicketId) : undefined
  });

  await triggerExternalWebhook({
    url: externalAuth.webhookUrl,
    secret: externalAuth.webhookSecret,
    event: "lead.converted",
    data: { apiKeyId: externalAuth.apiKeyId, ...result }
  });

  return res.json(result);
};
