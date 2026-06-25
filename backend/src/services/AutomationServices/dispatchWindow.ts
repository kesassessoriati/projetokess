/**
 * Regras de janela de disparo comercial por tipo de ação de automação.
 *
 * Ações "customer-facing" (que entregam algo diretamente ao contato) respeitam
 * a janela comercial: fora do horário configurado elas são adiadas para a
 * próxima abertura da janela. Ações internas de CRM (mover etapa/kanban, tags,
 * update de lead, etc.) NÃO devem esperar horário comercial — usam sempre o
 * momento atual como âncora, somando apenas o delay configurado.
 *
 * Motivação: ver auditoria 2026-06-25 — `add_tag` (instantânea) era aplicada na
 * hora, mas `move_lead` (agendada) era empurrada para a próxima janela 08–18h
 * quando o lead entrava na etapa fora do horário, fazendo o card "não andar".
 */

// Mantém compatibilidade com os actionType reais existentes no banco/código.
// Hoje a única ação agendada customer-facing é "send_message"; os demais nomes
// são aliases/ações futuras de envio ao contato, já previstos para não exigir
// nova alteração quando forem implementados.
export const CUSTOMER_FACING_ACTIONS = new Set<string>([
  "send_message",
  "send_whatsapp_message",
  "send_template",
  "send_audio",
  "send_media"
]);

/**
 * true  → ação entrega algo ao contato e deve respeitar a janela comercial.
 * false → ação interna de CRM; agenda sempre a partir de agora (ignora janela).
 */
export const shouldRespectDispatchWindow = (actionType: string): boolean =>
  CUSTOMER_FACING_ACTIONS.has(actionType);

export interface ScheduleAnchorResult {
  /** Horário-base do agendamento; o chamador soma o delay em cima deste valor. */
  anchor: Date;
  /** A ação respeita a janela comercial (customer-facing)? */
  respectsWindow: boolean;
  /** A ação foi adiada para a próxima janela por estar fora do horário? */
  deferredByWindow: boolean;
}

/**
 * Decide o horário-âncora do agendamento de uma ação.
 *
 *  - Ação interna                         → anchor = now (ignora janela).
 *  - Customer-facing dentro da janela     → anchor = now.
 *  - Customer-facing fora da janela       → anchor = nextDispatchDate.
 *
 * O delay configurado (delayMinutes) é somado pelo chamador, em cima do anchor
 * retornado. Esta função é pura (sem efeitos colaterais) para ser testável sem
 * banco de dados.
 */
export const computeScheduleAnchor = (
  actionType: string,
  withinDispatchWindow: boolean,
  now: Date,
  nextDispatchDate: Date
): ScheduleAnchorResult => {
  const respectsWindow = shouldRespectDispatchWindow(actionType);
  const deferredByWindow = respectsWindow && !withinDispatchWindow;
  return {
    anchor: deferredByWindow ? nextDispatchDate : now,
    respectsWindow,
    deferredByWindow
  };
};
