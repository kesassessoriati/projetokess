// Fase 0 — Redação de segredos em logs do FlowBuilder.
//
// Serializa objetos para log mascarando valores de chaves sensíveis
// (apiKey/token/secret/authorization/password/…), evitando vazamento de
// credenciais nos logs de produção do executor de fluxos.

export const SECRET_KEY_RE =
  /(api[_-]?key|api[_-]?token|token|secret|authorization|password|passwd|bearer)/i;

export const REDACTED = "***REDACTED***";

export const safeStringify = (obj: unknown): string => {
  try {
    return JSON.stringify(
      obj,
      (key, value) =>
        SECRET_KEY_RE.test(key) && typeof value === "string" ? REDACTED : value,
      2
    );
  } catch {
    return "[unserializable]";
  }
};

export default safeStringify;
