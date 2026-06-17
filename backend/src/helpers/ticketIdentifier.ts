/**
 * Helpers de validacao de identificador de ticket.
 *
 * Evita que rotas de ticket (/tickets/:id e /tickets/u/:uuid) passem valores
 * invalidos ("undefined", "null", vazio ou formato errado) direto ao Postgres,
 * o que causava erro 22P02 (invalid input syntax) -> 500.
 *
 * - ShowTicketService consulta por coluna inteira "id"  -> use parseTicketNumericId.
 * - ShowTicketUUIDService consulta por coluna "uuid"     -> use isValidTicketUuid.
 */

// UUID v1-v5 canonico.
export const TICKET_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Retorna o id numerico (>0) quando o valor representa um inteiro valido,
 * ou null caso contrario (undefined/null/vazio/"undefined"/"null"/nao-numerico).
 */
export const parseTicketNumericId = (value: unknown): number | null => {
  const sanitized = String(value ?? "").trim();
  if (!sanitized || sanitized === "undefined" || sanitized === "null") {
    return null;
  }
  if (!/^\d+$/.test(sanitized)) {
    return null;
  }
  const numeric = Number(sanitized);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
};

/** True quando o valor e um UUID canonico valido. */
export const isValidTicketUuid = (value: unknown): boolean => {
  const sanitized = String(value ?? "").trim();
  return TICKET_UUID_REGEX.test(sanitized);
};
