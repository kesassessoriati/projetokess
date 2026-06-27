/**
 * Lógica pura (sem DB/rede) do Webhook de Grupos.
 *
 * Mantida separada do dispatcher para ser testável sem banco e sem carregar a
 * cadeia de models/Baileys. Mapeia os eventos internos de mensagem para os
 * eventos públicos do webhook de grupo, valida eventos e monta o payload mínimo
 * e seguro (sem tokens/secret/credenciais/dados de outra empresa).
 */

export const GROUP_EVENT_RECEIVED = "group.message.received";
export const GROUP_EVENT_SENT = "group.message.sent";

export const ALLOWED_GROUP_WEBHOOK_EVENTS: string[] = [
  GROUP_EVENT_RECEIVED,
  GROUP_EVENT_SENT
];

const INTERNAL_TO_GROUP_EVENT: Record<string, string> = {
  MESSAGE_RECEIVED: GROUP_EVENT_RECEIVED,
  MESSAGE_SENT: GROUP_EVENT_SENT
};

/** Converte o evento interno (MESSAGE_RECEIVED/SENT) no evento público; null se não suportado. */
export const mapMessageEventToGroupEvent = (eventType: string): string | null =>
  INTERNAL_TO_GROUP_EVENT[eventType] || null;

/** Valida que os eventos informados são um subconjunto não-vazio dos permitidos. */
export const isValidGroupWebhookEvents = (events: unknown): boolean =>
  Array.isArray(events) &&
  events.length > 0 &&
  events.every(e => ALLOWED_GROUP_WEBHOOK_EVENTS.includes(String(e)));

/** Normaliza a lista de eventos: remove inválidos/duplicados, preservando ordem canônica. */
export const normalizeGroupWebhookEvents = (events: unknown): string[] => {
  const set = new Set(
    (Array.isArray(events) ? events : [])
      .map(e => String(e))
      .filter(e => ALLOWED_GROUP_WEBHOOK_EVENTS.includes(e))
  );
  return ALLOWED_GROUP_WEBHOOK_EVENTS.filter(e => set.has(e));
};

export interface GroupWebhookGroupCtx {
  id: number;
  jid: string | null;
  name: string | null;
}

export interface GroupWebhookMessageCtx {
  id?: string | null;
  fromMe?: boolean;
  body?: string | null;
  type?: string | null;
  timestamp?: string | null;
}

export interface GroupWebhookContactCtx {
  id?: number | null;
  name?: string | null;
  number?: string | null;
}

/**
 * Monta o payload mínimo e seguro enviado ao endpoint.
 * NUNCA inclui: secret, tokens, credenciais de WhatsApp, headers internos ou
 * dados de outra empresa. Só os dados do próprio grupo/mensagem/contato.
 */
export const buildGroupWebhookPayload = (
  event: string,
  companyId: number,
  webhookId: number,
  group: GroupWebhookGroupCtx,
  message: GroupWebhookMessageCtx | undefined | null,
  contact: GroupWebhookContactCtx | undefined | null
) => {
  const m = message || {};
  const c = contact || {};
  return {
    event,
    companyId,
    webhookId,
    group: {
      id: group.id,
      jid: group.jid ?? null,
      name: group.name ?? null
    },
    message: {
      id: m.id ?? null,
      fromMe: !!m.fromMe,
      body: m.body ?? null,
      type: m.type ?? null,
      timestamp: m.timestamp ?? null
    },
    contact: {
      id: c.id ?? null,
      name: c.name ?? null,
      number: c.number ?? null
    }
  };
};

export interface GroupWebhookTargetLike {
  id: number;
  enabled?: boolean;
  events?: unknown;
  selectedGroups?: unknown;
}

/**
 * Dentre as configs ativas, retorna apenas as que (a) estão habilitadas,
 * (b) têm o evento mapeado e (c) selecionaram o grupo (por id de GroupDirectory).
 */
export const filterGroupWebhookTargets = <T extends GroupWebhookTargetLike>(
  settings: T[],
  groupId: number,
  mappedEvent: string
): T[] =>
  (settings || []).filter(s => {
    if (s.enabled === false) return false;
    const events = Array.isArray(s.events) ? s.events.map(String) : [];
    if (!events.includes(mappedEvent)) return false;
    const groups = Array.isArray(s.selectedGroups) ? s.selectedGroups.map(Number) : [];
    return groups.includes(Number(groupId));
  });
