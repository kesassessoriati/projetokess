import { Request, Response } from "express";
import AppError from "../errors/AppError";
import {
  defaultLeadFields,
  requiredLeadFieldKeys
} from "../constants/leadFieldSettings";
import CompanyLeadFieldSetting from "../models/CompanyLeadFieldSetting";
import {
  LeadFieldPayload,
  getBlockedDisabledLeadFields,
  getLeadFieldUsage
} from "../services/LeadFieldSettingsService";

export { defaultLeadFields } from "../constants/leadFieldSettings";

const allowedCustomTypes = ["text", "textarea", "number", "date", "email", "boolean"];

const slugifyFieldKey = (label: string): string =>
  `custom_${label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50) || "campo"}`;

const serializeField = (field: any) => ({
  id: field.id || null,
  fieldKey: field.fieldKey,
  label: field.label,
  fieldType: field.fieldType,
  group: field.group || (field.isCustom ? "Campos personalizados" : "CRM"),
  visible: field.visible !== false,
  isCustom: Boolean(field.isCustom),
  active: field.active !== false,
  sortOrder: field.sortOrder || 0,
  required: requiredLeadFieldKeys.has(field.fieldKey) || Boolean(field.required)
});

const getSerializableFields = async (companyId: number) => {
  const saved = await CompanyLeadFieldSetting.findAll({
    where: { companyId },
    order: [["sortOrder", "ASC"], ["id", "ASC"]]
  });

  const savedByKey = new Map(saved.map(field => [field.fieldKey, field]));
  const standardFields = defaultLeadFields.map(field => {
    const override = savedByKey.get(field.fieldKey);
    return serializeField({
      ...field,
      id: override?.id,
      label: override?.label || field.label,
      fieldType: override?.fieldType || field.fieldType,
      visible: field.required ? true : override ? override.visible : true,
      isCustom: false,
      active: override ? override.active : true,
      sortOrder: override?.sortOrder ?? field.sortOrder,
      required: field.required
    });
  });

  const customFields = saved
    .filter(field => field.isCustom && field.active)
    .map(field => serializeField({ ...field.toJSON(), group: "Campos personalizados" }));

  return [...standardFields, ...customFields].sort((a, b) => a.sortOrder - b.sortOrder);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const fields = await getSerializableFields(companyId);

  return res.json({
    fields
  });
};

export const usage = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const fields = await getSerializableFields(companyId);
  const usageInfo = await getLeadFieldUsage(companyId, fields);

  return res.json({ fields: usageInfo });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const fields = Array.isArray(req.body?.fields) ? req.body.fields : [];
  const standardFieldKeys = new Set(defaultLeadFields.map(field => field.fieldKey));
  const normalizedFields: LeadFieldPayload[] = fields
    .filter(field => field?.fieldKey)
    .map(field => ({
      ...field,
      required: requiredLeadFieldKeys.has(field.fieldKey) || Boolean(field.required),
      visible: requiredLeadFieldKeys.has(field.fieldKey) ? true : field.visible !== false
    }));

  const blockedFields = await getBlockedDisabledLeadFields(companyId, normalizedFields);
  if (blockedFields.length > 0) {
    return res.status(400).json({
      error: "ERR_LEAD_FIELD_IN_USE",
      message: "Alguns campos nao podem ser desativados porque possuem dados preenchidos.",
      fields: blockedFields.map(field => ({
        key: field.fieldKey,
        label: field.label,
        usageCount: field.usageCount,
        required: field.required
      }))
    });
  }

  await Promise.all(
    normalizedFields
      .filter(field => field?.fieldKey)
      .map(field => {
        const isStandardField = standardFieldKeys.has(field.fieldKey);

        return CompanyLeadFieldSetting.upsert({
          companyId,
          fieldKey: field.fieldKey,
          label: field.label || field.fieldKey,
          fieldType: field.fieldType || "text",
          visible: field.visible !== false,
          isCustom: !isStandardField && Boolean(field.isCustom),
          active: field.active !== false,
          sortOrder: Number(field.sortOrder) || 0
        });
      })
  );

  return index(req, res);
};

export const createCustom = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const label = String(req.body?.label || "").trim();
  const fieldType = String(req.body?.fieldType || "text");

  if (!label) {
    throw new AppError("Nome do campo personalizado e obrigatorio.");
  }

  if (!allowedCustomTypes.includes(fieldType)) {
    throw new AppError("Tipo de campo personalizado invalido.");
  }

  let fieldKey = slugifyFieldKey(label);
  const existing = await CompanyLeadFieldSetting.findOne({ where: { companyId, fieldKey } });
  if (existing) {
    fieldKey = `${fieldKey}_${Date.now()}`;
  }

  const maxSortOrder = Math.max(...defaultLeadFields.map(field => field.sortOrder), 320);
  const field = await CompanyLeadFieldSetting.create({
    companyId,
    fieldKey,
    label,
    fieldType,
    visible: true,
    isCustom: true,
    active: true,
    sortOrder: Number(req.body?.sortOrder) || maxSortOrder + 10
  });

  return res.status(201).json(serializeField({ ...field.toJSON(), group: "Campos personalizados" }));
};

export const removeCustom = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const field = await CompanyLeadFieldSetting.findOne({
    where: {
      id,
      companyId,
      isCustom: true
    }
  });

  if (!field) {
    throw new AppError("Campo personalizado nao encontrado.", 404);
  }

  const [fieldUsage] = await getLeadFieldUsage(companyId, [serializeField(field.toJSON())]);
  if (fieldUsage?.usageCount > 0) {
    return res.status(400).json({
      error: "ERR_LEAD_FIELD_IN_USE",
      message: "Este campo personalizado possui dados preenchidos e nao pode ser excluido.",
      fields: [
        {
          key: fieldUsage.fieldKey,
          label: fieldUsage.label,
          usageCount: fieldUsage.usageCount
        }
      ]
    });
  }

  await field.destroy();

  return res.status(200).json({ message: "Campo personalizado excluido." });
};
