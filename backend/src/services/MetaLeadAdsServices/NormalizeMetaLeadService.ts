import { MetaLeadFieldData } from "./GetMetaLeadDataService";

export interface NormalizedMetaLead {
  name: string | null;
  phone: string | null;
  email: string | null;
  rawFields: Record<string, string>;
}

const NAME_KEYS = ["full_name", "name", "nome", "nome_completo", "first_name", "last_name", "fullname"];
const PHONE_KEYS = ["phone_number", "phone", "telefone", "celular", "mobile", "whatsapp", "fone"];
const EMAIL_KEYS = ["email", "e-mail", "email_address"];

const findFieldValue = (fieldData: MetaLeadFieldData[], keys: string[]): string | null => {
  for (const key of keys) {
    const found = fieldData.find(f => f.name?.toLowerCase() === key);
    if (found && found.values?.[0]) return found.values[0];
  }
  return null;
};

const normalizeBrazilianPhone = (raw: string | null): string | null => {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Já tem código do país (55) e tamanho correto
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Número local com DDD (10 ou 11 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Número com código de país mas sem o 55 (ex: +1...)
  if (digits.length > 11 && !digits.startsWith("55")) {
    return digits;
  }

  return digits.length >= 8 ? digits : null;
};

export const normalizeMetaLead = (fieldData: MetaLeadFieldData[]): NormalizedMetaLead => {
  const rawFields: Record<string, string> = {};
  for (const f of fieldData) {
    if (f.name && f.values?.[0] !== undefined) {
      rawFields[f.name] = f.values[0];
    }
  }

  const rawName = findFieldValue(fieldData, NAME_KEYS);
  const rawPhone = findFieldValue(fieldData, PHONE_KEYS);
  const rawEmail = findFieldValue(fieldData, EMAIL_KEYS);

  return {
    name: rawName?.trim() || null,
    phone: normalizeBrazilianPhone(rawPhone),
    email: rawEmail?.trim()?.toLowerCase() || null,
    rawFields
  };
};
