import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import CreateCrmLeadService from "../../services/CrmLeadService/CreateCrmLeadService";
import ListCrmLeadsService from "../../services/CrmLeadService/ListCrmLeadsService";
import ShowCrmLeadService from "../../services/CrmLeadService/ShowCrmLeadService";
import UpdateCrmLeadService from "../../services/CrmLeadService/UpdateCrmLeadService";
import ConvertCrmLeadService from "../../services/CrmLeadService/ConvertCrmLeadService";
import triggerExternalWebhook from "../../services/ExternalWebhook/triggerExternalWebhook";
import { markLeadForAiExternalFollowUp } from "../../services/AiExternalFollowUpServices/AiExternalFollowUpService";
import serializeCrmLead from "../../services/CrmLeadService/helpers/serializeCrmLead";
import CompanyLeadFieldSetting from "../../models/CompanyLeadFieldSetting";
import CrmLeadCustomFieldValue from "../../models/CrmLeadCustomFieldValue";

const ensureExternalAuth = (req: Request) => {
  if (!req.externalAuth) {
    throw new AppError("ERR_EXTERNAL_AUTH_REQUIRED", 401);
  }
  return req.externalAuth;
};

const appendCustomFieldValues = async (lead: any, companyId: number) => {
  const leadId = Number(lead?.id);
  if (!leadId) return lead;

  const values = await CrmLeadCustomFieldValue.findAll({
    where: { leadId, companyId },
    include: [
      {
        model: CompanyLeadFieldSetting,
        as: "field",
        attributes: ["id", "fieldKey", "label", "fieldType", "visible", "active", "isCustom"]
      }
    ]
  });

  return {
    ...lead,
    customFields: values.reduce((acc, item) => {
      const key = item.field?.fieldKey || String(item.fieldId);
      acc[key] = item.value || "";
      return acc;
    }, {} as Record<string, string>)
  };
};

const slugifyKey = (s: string) =>
  s.toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const syncCustomFieldValues = async ({
  leadId,
  companyId,
  customFields
}: {
  leadId: number;
  companyId: number;
  customFields?: Record<string, any>;
}) => {
  if (!customFields || typeof customFields !== "object") return;

  const fields = await CompanyLeadFieldSetting.findAll({
    where: { companyId, isCustom: true, active: true }
  });
  const fieldsByKey = new Map(fields.map(field => [field.fieldKey, field]));
  // Fallback: match by normalized label (handles timestamp-suffixed keys)
  const fieldsByLabel = new Map(fields.map(field => [slugifyKey(field.label), field]));

  await Promise.all(
    Object.entries(customFields).map(async ([fieldKey, rawValue]) => {
      const bare = fieldKey.replace(/^custom_/, "");
      const field =
        fieldsByKey.get(fieldKey) ||
        fieldsByKey.get(`custom_${bare}`) ||
        fieldsByLabel.get(bare) ||
        fieldsByLabel.get(fieldKey);
      if (!field) return;

      const value =
        rawValue === null || rawValue === undefined
          ? ""
          : field.fieldType === "boolean"
            ? String(Boolean(rawValue))
            : String(rawValue);

      const [customFieldValue, created] = await CrmLeadCustomFieldValue.findOrCreate({
        where: { companyId, leadId, fieldId: field.id },
        defaults: {
          companyId,
          leadId,
          fieldId: field.id,
          value
        }
      });

      if (!created && customFieldValue.value !== value) {
        customFieldValue.value = value;
        await customFieldValue.save();
      }
    })
  );
};

// GET /api/external/crm-leads/field-settings
export const fieldSettings = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);

  const fields = await CompanyLeadFieldSetting.findAll({
    where: { companyId, isCustom: true, active: true },
    attributes: ["id", "fieldKey", "label", "fieldType", "sortOrder"],
    order: [["sortOrder", "ASC"]]
  });

  return res.json(fields.map(f => ({
    fieldKey: f.fieldKey,
    label: f.label,
    fieldType: f.fieldType
  })));
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

  const leadsWithCustomFields = await Promise.all(
    result.leads.map(async (lead: any) => appendCustomFieldValues(lead, companyId))
  );

  return res.json({
    ...result,
    leads: leadsWithCustomFields
  });
};

// GET /api/external/crm-leads/:id
export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const { id } = req.params;

  const lead = await ShowCrmLeadService({
    id: Number(id),
    companyId
  });

  const serializedLead = await appendCustomFieldValues(serializeCrmLead(lead), companyId);

  return res.json(serializedLead);
};

// POST /api/external/crm-leads
export const store = async (req: Request, res: Response): Promise<Response> => {
  const externalAuth = ensureExternalAuth(req);
  const data = { ...req.body };
  const customFields = data.customFields;
  delete data.customFields;

  if (!data.name) {
    throw new AppError("ERR_LEAD_NAME_REQUIRED", 400);
  }

  const lead = await CreateCrmLeadService({
    ...data,
    companyId: externalAuth.companyId
  });

  await syncCustomFieldValues({
    leadId: lead.id,
    companyId: externalAuth.companyId,
    customFields
  });

  const serializedLead = await appendCustomFieldValues(serializeCrmLead(lead), externalAuth.companyId);

  await triggerExternalWebhook({
    url: externalAuth.webhookUrl,
    secret: externalAuth.webhookSecret,
    event: "lead.created",
    data: { apiKeyId: externalAuth.apiKeyId, lead: serializedLead }
  });

  return res.status(201).json(serializedLead);
};

// PUT /api/external/crm-leads/:id
export const update = async (req: Request, res: Response): Promise<Response> => {
  const externalAuth = ensureExternalAuth(req);
  const { id } = req.params;
  const data = { ...req.body };
  const customFields = data.customFields;
  delete data.customFields;

  const lead = await UpdateCrmLeadService({
    id: Number(id),
    companyId: externalAuth.companyId,
    ...data
  });

  await syncCustomFieldValues({
    leadId: Number(id),
    companyId: externalAuth.companyId,
    customFields
  });

  const serializedLead = await appendCustomFieldValues(serializeCrmLead(lead), externalAuth.companyId);

  await triggerExternalWebhook({
    url: externalAuth.webhookUrl,
    secret: externalAuth.webhookSecret,
    event: "lead.updated",
    data: { apiKeyId: externalAuth.apiKeyId, lead: serializedLead }
  });

  return res.json(serializedLead);
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

// POST /api/external/crm-leads/:id/follow-up
export const markFollowUp = async (req: Request, res: Response): Promise<Response> => {
  const externalAuth = ensureExternalAuth(req);
  const { id } = req.params;

  const result = await markLeadForAiExternalFollowUp({
    companyId: externalAuth.companyId,
    leadId: Number(id),
    accessId: req.body.accessId,
    phone: req.body.phone
  });

  await triggerExternalWebhook({
    url: externalAuth.webhookUrl,
    secret: externalAuth.webhookSecret,
    event: "lead.follow_up_marked",
    data: { apiKeyId: externalAuth.apiKeyId, ...result }
  });

  return res.json(result);
};

// POST /api/external/crm-leads/follow-up/mark
export const markFollowUpByLookup = async (req: Request, res: Response): Promise<Response> => {
  const externalAuth = ensureExternalAuth(req);

  const result = await markLeadForAiExternalFollowUp({
    companyId: externalAuth.companyId,
    leadId: req.body.leadId ? Number(req.body.leadId) : undefined,
    accessId: req.body.accessId,
    phone: req.body.phone
  });

  await triggerExternalWebhook({
    url: externalAuth.webhookUrl,
    secret: externalAuth.webhookSecret,
    event: "lead.follow_up_marked",
    data: { apiKeyId: externalAuth.apiKeyId, ...result }
  });

  return res.json(result);
};
