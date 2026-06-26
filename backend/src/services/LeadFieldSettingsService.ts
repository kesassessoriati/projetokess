import { Op, cast, col, fn, where } from "sequelize";

import {
  defaultLeadFieldsByKey,
  requiredLeadFieldKeys
} from "../constants/leadFieldSettings";
import CompanyLeadFieldSetting from "../models/CompanyLeadFieldSetting";
import CrmLead from "../models/CrmLead";
import CrmLeadCustomFieldValue from "../models/CrmLeadCustomFieldValue";
import LeadTag from "../models/LeadTag";

export interface LeadFieldPayload {
  id?: number | null;
  fieldKey: string;
  label?: string;
  fieldType?: string;
  visible?: boolean;
  isCustom?: boolean;
  active?: boolean;
  required?: boolean;
  sortOrder?: number;
}

export interface LeadFieldUsageInfo {
  key: string;
  fieldKey: string;
  label: string;
  usageCount: number;
  inUse: boolean;
  canDisable: boolean;
  required: boolean;
  isCustom: boolean;
}

const textLikeTypes = new Set(["text", "textarea", "email", "select"]);
const numericTypes = new Set(["number"]);

const isRequiredField = (field: LeadFieldPayload): boolean =>
  requiredLeadFieldKeys.has(field.fieldKey) || Boolean(field.required);

const resolveLabel = (field: LeadFieldPayload): string =>
  field.label || defaultLeadFieldsByKey.get(field.fieldKey)?.label || field.fieldKey;

const resolveFieldType = (field: LeadFieldPayload): string =>
  field.fieldType || defaultLeadFieldsByKey.get(field.fieldKey)?.fieldType || "text";

const nonBlankColumnWhere = (columnName: string) =>
  where(fn("length", fn("trim", cast(col(columnName), "text"))), {
    [Op.gt]: 0
  });

const countStandardFieldUsage = async (
  companyId: number,
  field: LeadFieldPayload
): Promise<number> => {
  if (field.fieldKey === "tags") {
    return LeadTag.count({
      include: [
        {
          model: CrmLead,
          attributes: [],
          where: { companyId }
        }
      ],
      distinct: true,
      col: "lead_id"
    });
  }

  const attribute = (CrmLead as any).rawAttributes?.[field.fieldKey];
  if (!attribute) {
    return 0;
  }

  const fieldType = resolveFieldType(field);
  const whereClause: any = { companyId };

  if (textLikeTypes.has(fieldType)) {
    const columnName = attribute.field || field.fieldKey;
    whereClause[Op.and] = [
      { [field.fieldKey]: { [Op.not]: null } },
      nonBlankColumnWhere(columnName)
    ];
  } else if (numericTypes.has(fieldType)) {
    whereClause[field.fieldKey] = {
      [Op.not]: null,
      [Op.ne]: 0
    };
  } else {
    whereClause[field.fieldKey] = { [Op.not]: null };
  }

  return CrmLead.count({ where: whereClause });
};

const countCustomFieldUsage = async (
  companyId: number,
  field: LeadFieldPayload
): Promise<number> => {
  let fieldId = field.id || null;

  if (!fieldId) {
    const savedField = await CompanyLeadFieldSetting.findOne({
      where: {
        companyId,
        fieldKey: field.fieldKey,
        isCustom: true
      }
    });
    fieldId = savedField?.id || null;
  }

  if (!fieldId) {
    return 0;
  }

  return CrmLeadCustomFieldValue.count({
    where: {
      companyId,
      fieldId,
      value: { [Op.not]: null },
      [Op.and]: [nonBlankColumnWhere("value")]
    }
  });
};

export const getLeadFieldUsage = async (
  companyId: number,
  fields: LeadFieldPayload[]
): Promise<LeadFieldUsageInfo[]> =>
  Promise.all(
    fields
      .filter(field => field?.fieldKey)
      .map(async field => {
        const required = isRequiredField(field);
        const isCustom = Boolean(field.isCustom);
        const usageCount = isCustom
          ? await countCustomFieldUsage(companyId, field)
          : await countStandardFieldUsage(companyId, field);

        return {
          key: field.fieldKey,
          fieldKey: field.fieldKey,
          label: resolveLabel(field),
          usageCount,
          inUse: usageCount > 0,
          canDisable: !required && usageCount === 0,
          required,
          isCustom
        };
      })
  );

export const getLeadFieldUsageMap = async (
  companyId: number,
  fields: LeadFieldPayload[]
): Promise<Map<string, LeadFieldUsageInfo>> => {
  const usage = await getLeadFieldUsage(companyId, fields);
  return new Map(usage.map(item => [item.fieldKey, item]));
};

export const getBlockedDisabledLeadFields = async (
  companyId: number,
  fields: LeadFieldPayload[]
): Promise<LeadFieldUsageInfo[]> => {
  const usageMap = await getLeadFieldUsageMap(companyId, fields);

  return fields
    .filter(field => field?.fieldKey && field.visible === false)
    .map(field => usageMap.get(field.fieldKey))
    .filter((usage): usage is LeadFieldUsageInfo => Boolean(usage && !usage.canDisable));
};
