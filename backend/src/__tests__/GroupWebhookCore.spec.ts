import {
  mapMessageEventToGroupEvent,
  isValidGroupWebhookEvents,
  normalizeGroupWebhookEvents,
  buildGroupWebhookPayload,
  filterGroupWebhookTargets,
  ALLOWED_GROUP_WEBHOOK_EVENTS,
  GROUP_EVENT_RECEIVED,
  GROUP_EVENT_SENT
} from "../services/GroupWebhookServices/groupWebhookCore";

describe("groupWebhookCore — webhook de mensagens de grupo", () => {
  describe("mapMessageEventToGroupEvent", () => {
    it("mapeia MESSAGE_RECEIVED/SENT para eventos públicos", () => {
      expect(mapMessageEventToGroupEvent("MESSAGE_RECEIVED")).toBe(GROUP_EVENT_RECEIVED);
      expect(mapMessageEventToGroupEvent("MESSAGE_SENT")).toBe(GROUP_EVENT_SENT);
    });
    it("retorna null para eventos não suportados", () => {
      expect(mapMessageEventToGroupEvent("TICKET_CREATED")).toBeNull();
      expect(mapMessageEventToGroupEvent("")).toBeNull();
    });
  });

  describe("validação/normalização de eventos", () => {
    it("aceita subconjunto válido e rejeita inválidos/vazios", () => {
      expect(isValidGroupWebhookEvents([GROUP_EVENT_RECEIVED])).toBe(true);
      expect(isValidGroupWebhookEvents(ALLOWED_GROUP_WEBHOOK_EVENTS)).toBe(true);
      expect(isValidGroupWebhookEvents([])).toBe(false);
      expect(isValidGroupWebhookEvents(["group.message.deleted"])).toBe(false);
      expect(isValidGroupWebhookEvents("x" as any)).toBe(false);
    });
    it("normaliza removendo inválidos/duplicados em ordem canônica", () => {
      expect(
        normalizeGroupWebhookEvents([GROUP_EVENT_SENT, "lixo", GROUP_EVENT_SENT, GROUP_EVENT_RECEIVED])
      ).toEqual([GROUP_EVENT_RECEIVED, GROUP_EVENT_SENT]);
    });
  });

  describe("buildGroupWebhookPayload", () => {
    it("monta payload mínimo e NÃO vaza secret/tokens/campos extras", () => {
      const payload = buildGroupWebhookPayload(
        GROUP_EVENT_RECEIVED,
        123,
        7,
        { id: 5, jid: "55@g.us", name: "Grupo X" },
        { id: "MSGID", fromMe: false, body: "oi", type: "chat", timestamp: "2026-06-27T12:00:00.000Z" },
        { id: 9, name: "Fulano", number: "5511999", secret: "NUNCA", token: "NUNCA" } as any
      );
      expect(payload).toEqual({
        event: GROUP_EVENT_RECEIVED,
        companyId: 123,
        webhookId: 7,
        group: { id: 5, jid: "55@g.us", name: "Grupo X" },
        message: { id: "MSGID", fromMe: false, body: "oi", type: "chat", timestamp: "2026-06-27T12:00:00.000Z" },
        contact: { id: 9, name: "Fulano", number: "5511999" }
      });
      const flat = JSON.stringify(payload);
      expect(flat).not.toContain("NUNCA");
      expect(flat).not.toContain("token");
    });

    it("tolera message/contact ausentes", () => {
      const payload = buildGroupWebhookPayload(GROUP_EVENT_SENT, 1, 2, { id: 1, jid: null, name: null }, null, null);
      expect(payload.message).toEqual({ id: null, fromMe: false, body: null, type: null, timestamp: null });
      expect(payload.contact).toEqual({ id: null, name: null, number: null });
    });
  });

  describe("filterGroupWebhookTargets", () => {
    const settings = [
      { id: 1, enabled: true, events: [GROUP_EVENT_RECEIVED], selectedGroups: [5, 6] },
      { id: 2, enabled: true, events: [GROUP_EVENT_SENT], selectedGroups: [5] },
      { id: 3, enabled: false, events: [GROUP_EVENT_RECEIVED], selectedGroups: [5] },
      { id: 4, enabled: true, events: [GROUP_EVENT_RECEIVED], selectedGroups: [99] }
    ];
    it("seleciona apenas habilitados, com o evento e com o grupo escolhido", () => {
      const got = filterGroupWebhookTargets(settings, 5, GROUP_EVENT_RECEIVED).map(s => s.id);
      expect(got).toEqual([1]); // 2=evento errado, 3=desabilitado, 4=outro grupo
    });
    it("não seleciona nada quando o grupo não foi escolhido", () => {
      expect(filterGroupWebhookTargets(settings, 7, GROUP_EVENT_RECEIVED)).toHaveLength(0);
    });
  });
});
