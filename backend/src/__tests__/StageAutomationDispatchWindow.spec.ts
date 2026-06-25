import {
  shouldRespectDispatchWindow,
  computeScheduleAnchor,
  CUSTOMER_FACING_ACTIONS
} from "../services/AutomationServices/dispatchWindow";

/**
 * Cobre a Correção A da auditoria 2026-06-25: ações internas de CRM
 * (move_lead, add_tag, etc.) NÃO devem ser empurradas para a próxima janela
 * comercial; apenas ações customer-facing (send_message) respeitam a janela.
 *
 * O guard anti-job-atrasado (cenário 5) vive em ExecuteAutomationsJob e NÃO foi
 * alterado por esta correção — só mudamos o cálculo do horário-âncora aqui.
 */
describe("dispatchWindow — janela de disparo por tipo de ação", () => {
  // Âncoras de referência: now fora da janela comercial; nextDispatch = próxima abertura.
  const now = new Date("2026-06-25T22:00:00.000Z");
  const nextDispatch = new Date("2026-06-26T11:00:00.000Z");
  const FIVE_MIN_MS = 5 * 60 * 1000;

  describe("shouldRespectDispatchWindow", () => {
    it("send_message é customer-facing → respeita janela", () => {
      expect(shouldRespectDispatchWindow("send_message")).toBe(true);
    });

    it("ações internas de CRM NÃO respeitam janela", () => {
      ["move_lead", "move_kanban", "move_opportunity", "add_tag", "remove_tag", "update_lead"].forEach(
        actionType => expect(shouldRespectDispatchWindow(actionType)).toBe(false)
      );
    });

    it("o conjunto customer-facing inclui send_message e aliases de envio", () => {
      expect(CUSTOMER_FACING_ACTIONS.has("send_message")).toBe(true);
      expect(CUSTOMER_FACING_ACTIONS.has("move_lead")).toBe(false);
    });
  });

  describe("computeScheduleAnchor", () => {
    // Cenário 1: move_lead fora da janela, delay 5min → scheduledAt ≈ now + 5min
    it("Cenário 1: move_lead fora da janela ancora em NOW (não vai p/ amanhã)", () => {
      const r = computeScheduleAnchor("move_lead", false, now, nextDispatch);
      expect(r.anchor).toBe(now);
      expect(r.respectsWindow).toBe(false);
      expect(r.deferredByWindow).toBe(false);

      const scheduledAt = new Date(r.anchor.getTime() + FIVE_MIN_MS);
      expect(scheduledAt.getTime() - now.getTime()).toBe(FIVE_MIN_MS);
    });

    // Cenário 2: add_tag fora da janela → não é empurrada para amanhã
    it("Cenário 2: add_tag fora da janela ancora em NOW", () => {
      const r = computeScheduleAnchor("add_tag", false, now, nextDispatch);
      expect(r.anchor).toBe(now);
      expect(r.deferredByWindow).toBe(false);
    });

    // Cenário 3: send_message fora da janela, delay 5min → vai p/ próxima janela + delay
    it("Cenário 3: send_message fora da janela é adiada para a próxima janela", () => {
      const r = computeScheduleAnchor("send_message", false, now, nextDispatch);
      expect(r.anchor).toBe(nextDispatch);
      expect(r.respectsWindow).toBe(true);
      expect(r.deferredByWindow).toBe(true);

      const scheduledAt = new Date(r.anchor.getTime() + FIVE_MIN_MS);
      expect(scheduledAt.getTime()).toBe(nextDispatch.getTime() + FIVE_MIN_MS);
    });

    // Cenário 4: move_lead dentro da janela → comportamento inalterado (NOW)
    it("Cenário 4: move_lead dentro da janela ancora em NOW (inalterado)", () => {
      const r = computeScheduleAnchor("move_lead", true, now, nextDispatch);
      expect(r.anchor).toBe(now);
      expect(r.deferredByWindow).toBe(false);
    });

    it("send_message dentro da janela ancora em NOW", () => {
      const r = computeScheduleAnchor("send_message", true, now, nextDispatch);
      expect(r.anchor).toBe(now);
      expect(r.respectsWindow).toBe(true);
      expect(r.deferredByWindow).toBe(false);
    });
  });
});
