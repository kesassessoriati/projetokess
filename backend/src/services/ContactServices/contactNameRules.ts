import { isGenericContactName } from "./ContactIdentityResolverService";

/**
 * Fase D — Regras de precedência do nome do contato.
 *
 * Precedência comercial (da mais forte para a mais fraca):
 *   1. Nome manual/comercial definido no CRM (Contact.isManualName=true)
 *   2. Nome do Lead (propagado por PropagateLeadNameService)
 *   3. Nome do Cliente/Empresa
 *   4. Nome salvo do Contato
 *   5. pushName do WhatsApp — APENAS fallback para nome vazio/genérico.
 *
 * Este helper decide se um nome vindo do WhatsApp (pushName/subject de grupo)
 * pode ser aplicado ao contato:
 *   - isManualName=true       → NUNCA sobrescreve (inclusive grupos).
 *   - contato individual      → só sobrescreve nome vazio/genérico (número,
 *                               placeholder etc.); nome comercial vindo do
 *                               Lead não é genérico e fica protegido.
 *   - grupo (isGroup=true)    → subject pode atualizar, exceto nome manual.
 */

interface ContactNameSnapshot {
  name?: string | null;
  number?: string | null;
  lid?: string | null;
  isManualName?: boolean | null;
}

export const canApplyIncomingWhatsAppName = (
  contact: ContactNameSnapshot,
  incomingName?: string | null,
  options: { isGroup?: boolean } = {}
): boolean => {
  const incoming = String(incomingName || "").trim();
  if (!incoming) return false;
  if (incoming === contact.name) return false;
  if (contact.isManualName) return false;

  if (options.isGroup) return true;

  return isGenericContactName(
    contact.name || "",
    contact.number || "",
    contact.lid || undefined
  );
};

export default canApplyIncomingWhatsAppName;
