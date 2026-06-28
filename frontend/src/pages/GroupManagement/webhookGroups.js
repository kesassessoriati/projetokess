// Helpers puros do webhook de grupos.
// Extraídos de GroupManagement/index.js para permitir testes unitários.
//
// Contrato: o backend identifica grupos por GroupDirectory.id (INTEIRO).
// Cada item da lista `groups` (vindo de /group-management/groups) tem:
//   - id:       JID string (ex.: "...@g.us")  <- NÃO usar como identificador
//   - groupId:  inteiro (GroupDirectory.id)    <- identificador correto
//   - subject:  nome do grupo

/**
 * Normaliza uma lista de ids selecionados para inteiros válidos,
 * descartando qualquer valor que vire NaN (ex.: JID "@g.us").
 * @param {Array<number|string>} value
 * @returns {number[]}
 */
export function normalizeSelectedGroups(value) {
  return (Array.isArray(value) ? value : [])
    .map(Number)
    .filter((n) => Number.isInteger(n));
}

/**
 * Resolve o rótulo exibido para um id numérico de grupo.
 * Nunca retorna "NaN": cai para "#<id>" quando o grupo não está no diretório.
 * @param {number|string} id  id numérico do grupo (GroupDirectory.id)
 * @param {Array<object>} groups  lista de grupos disponíveis
 * @returns {string}
 */
export function resolveGroupLabel(id, groups) {
  const numericId = Number(id);
  const found = (Array.isArray(groups) ? groups : []).find(
    (g) => Number(g.groupId) === numericId
  );

  if (found) {
    return String(found.subject || found.groupJid || found.groupId);
  }

  return Number.isInteger(numericId) ? `#${numericId}` : `#${id}`;
}

/**
 * Remove um grupo (por id numérico) de uma lista de selecionados.
 * @param {Array<number|string>} selectedGroups
 * @param {number|string} groupId
 * @returns {number[]}
 */
export function removeGroupFromSelection(selectedGroups, groupId) {
  const target = Number(groupId);
  return normalizeSelectedGroups(selectedGroups).filter((gid) => gid !== target);
}
