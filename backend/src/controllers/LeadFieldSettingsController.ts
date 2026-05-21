import { Request, Response } from "express";
import AppError from "../errors/AppError";
import CompanyLeadFieldSetting from "../models/CompanyLeadFieldSetting";

export const defaultLeadFields = [
  { fieldKey: "status", label: "Status", fieldType: "select", group: "Dados basicos", sortOrder: 10 },
  { fieldKey: "pipelineId", label: "Funil de Vendas", fieldType: "select", group: "Dados basicos", sortOrder: 20 },
  { fieldKey: "stageId", label: "Estagio Funil", fieldType: "select", group: "Dados basicos", sortOrder: 30 },
  { fieldKey: "name", label: "Nome", fieldType: "text", group: "Dados basicos", sortOrder: 40, required: true },
  { fieldKey: "companyName", label: "Empresa", fieldType: "text", group: "Dados basicos", sortOrder: 50 },
  { fieldKey: "document", label: "CPF / CNPJ", fieldType: "text", group: "Dados basicos", sortOrder: 60 },
  { fieldKey: "email", label: "E-mail", fieldType: "email", group: "Dados basicos", sortOrder: 70 },
  { fieldKey: "phone", label: "Telefone", fieldType: "text", group: "Dados basicos", sortOrder: 80 },
  { fieldKey: "decisionMakerPhone", label: "Telefone decisor", fieldType: "text", group: "Dados basicos", sortOrder: 90 },
  { fieldKey: "address", label: "Endereco", fieldType: "text", group: "Dados basicos", sortOrder: 100 },
  { fieldKey: "product", label: "Produto", fieldType: "text", group: "Produto", sortOrder: 110 },
  { fieldKey: "position", label: "Cargo", fieldType: "text", group: "Informacoes comerciais", sortOrder: 120 },
  { fieldKey: "decisionMakerName", label: "Nome decisor", fieldType: "text", group: "Informacoes comerciais", sortOrder: 130 },
  { fieldKey: "birthDate", label: "Data de nascimento", fieldType: "date", group: "Informacoes comerciais", sortOrder: 140 },
  { fieldKey: "clientSince", label: "Cliente desde", fieldType: "date", group: "Informacoes comerciais", sortOrder: 150 },
  { fieldKey: "acquisitionDate", label: "Data de aquisicao", fieldType: "date", group: "Informacoes comerciais", sortOrder: 160 },
  { fieldKey: "expirationDate", label: "Data de vencimento", fieldType: "date", group: "Informacoes comerciais", sortOrder: 170 },
  { fieldKey: "paymentType", label: "Tipo de pagamento", fieldType: "text", group: "Informacoes comerciais", sortOrder: 180 },
  { fieldKey: "purchaseType", label: "Tipo de compra", fieldType: "select", group: "Informacoes comerciais", sortOrder: 190 },
  { fieldKey: "purchaseValue", label: "Valor da venda/oportunidade", fieldType: "number", group: "Informacoes comerciais", sortOrder: 200 },
  { fieldKey: "gmn", label: "GMN", fieldType: "text", group: "Presenca digital", sortOrder: 210 },
  { fieldKey: "website", label: "Site", fieldType: "text", group: "Presenca digital", sortOrder: 220 },
  { fieldKey: "instagram", label: "Instagram", fieldType: "text", group: "Presenca digital", sortOrder: 230 },
  { fieldKey: "linkedin", label: "LinkedIn", fieldType: "text", group: "Presenca digital", sortOrder: 240 },
  { fieldKey: "source", label: "Origem", fieldType: "text", group: "CRM", sortOrder: 250 },
  { fieldKey: "campaign", label: "Campanha/Tag", fieldType: "text", group: "CRM", sortOrder: 260 },
  { fieldKey: "temperature", label: "Temperatura", fieldType: "select", group: "CRM", sortOrder: 270 },
  { fieldKey: "score", label: "Score", fieldType: "number", group: "CRM", sortOrder: 280 },
  { fieldKey: "ownerUserId", label: "Atribuir a", fieldType: "select", group: "CRM", sortOrder: 290 },
  { fieldKey: "tags", label: "Tags", fieldType: "tags", group: "CRM", sortOrder: 300 },
  { fieldKey: "notes", label: "Observacoes", fieldType: "textarea", group: "CRM", sortOrder: 310 },
  { fieldKey: "sessionid", label: "Acesso ID", fieldType: "text", group: "CRM", sortOrder: 320 }
];

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
  required: Boolean(field.required)
});

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
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
      visible: override ? override.visible : true,
      isCustom: false,
      active: override ? override.active : true,
      sortOrder: override?.sortOrder ?? field.sortOrder
    });
  });

  const customFields = saved
    .filter(field => field.isCustom && field.active)
    .map(field => serializeField({ ...field.toJSON(), group: "Campos personalizados" }));

  return res.json({
    fields: [...standardFields, ...customFields].sort((a, b) => a.sortOrder - b.sortOrder)
  });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const fields = Array.isArray(req.body?.fields) ? req.body.fields : [];
  const standardFieldKeys = new Set(defaultLeadFields.map(field => field.fieldKey));

  await Promise.all(
    fields
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

  await field.destroy();

  return res.status(200).json({ message: "Campo personalizado excluido." });
};
