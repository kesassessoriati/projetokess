import {
  filterGroupWebhookTargets,
  GROUP_EVENT_RECEIVED,
  GROUP_EVENT_SENT
} from "../services/GroupWebhookServices/groupWebhookCore";

/**
 * Bug A — Webhook de grupos exibia "NaN NaN NaN".
 *
 * Causa-raiz: o frontend usava `group.id` (JID string, ex.: "...@g.us") como
 * value do <Select>, e aplicava `.map(Number)` em selectedGroups, gerando NaN.
 * O backend identifica grupos por `GroupDirectory.id` (inteiro) e o matching em
 * filterGroupWebhookTargets faz `selectedGroups.map(Number)` + includes(Number(groupId)).
 *
 * Estes testes travam o contrato: selectedGroups DEVE conter IDs numéricos para
 * o webhook disparar; JIDs/NaN nunca devem casar.
 */
describe("Group webhook — selectedGroups deve ser numérico (GroupDirectory.id)", () => {
  const NUMERIC_GROUP_ID = 42;
  const OTHER_GROUP_ID = 7;
  const GROUP_JID = "120363000000000000@g.us";

  describe("filterGroupWebhookTargets com IDs numéricos válidos", () => {
    it("dispara o webhook quando selectedGroups contém o id numérico do grupo", () => {
      const settings = [
        {
          id: 1,
          enabled: true,
          events: [GROUP_EVENT_RECEIVED],
          selectedGroups: [NUMERIC_GROUP_ID, OTHER_GROUP_ID]
        }
      ];

      const matched = filterGroupWebhookTargets(
        settings,
        NUMERIC_GROUP_ID,
        GROUP_EVENT_RECEIVED
      ).map(s => s.id);

      expect(matched).toEqual([1]);
    });

    it("aceita ids numéricos como string (ex.: vindos do form) e ainda casa", () => {
      const settings = [
        {
          id: 1,
          enabled: true,
          events: [GROUP_EVENT_RECEIVED],
          selectedGroups: [String(NUMERIC_GROUP_ID)] as any
        }
      ];

      const matched = filterGroupWebhookTargets(
        settings,
        NUMERIC_GROUP_ID,
        GROUP_EVENT_RECEIVED
      ).map(s => s.id);

      expect(matched).toEqual([1]);
    });

    it("não dispara quando o grupo recebido não está na lista selecionada", () => {
      const settings = [
        {
          id: 1,
          enabled: true,
          events: [GROUP_EVENT_RECEIVED],
          selectedGroups: [OTHER_GROUP_ID]
        }
      ];

      const matched = filterGroupWebhookTargets(
        settings,
        NUMERIC_GROUP_ID,
        GROUP_EVENT_RECEIVED
      );

      expect(matched).toHaveLength(0);
    });
  });

  describe("regressão do bug NaN — JIDs não podem ser usados como id", () => {
    it("um webhook salvo com JID (string '@g.us') NUNCA dispara para o id numérico", () => {
      const brokenSettings = [
        {
          id: 1,
          enabled: true,
          events: [GROUP_EVENT_RECEIVED],
          selectedGroups: [GROUP_JID] as any
        }
      ];

      const matched = filterGroupWebhookTargets(
        brokenSettings,
        NUMERIC_GROUP_ID,
        GROUP_EVENT_RECEIVED
      );

      expect(matched).toHaveLength(0);
    });

    it("valores que viram NaN (.map(Number) de JID) são descartados no matching", () => {
      const nanSettings = [
        {
          id: 1,
          enabled: true,
          events: [GROUP_EVENT_RECEIVED],
          selectedGroups: [Number(GROUP_JID), Number("a@g.us"), Number("b@g.us")] as any
        }
      ];

      const matched = filterGroupWebhookTargets(
        nanSettings,
        NUMERIC_GROUP_ID,
        GROUP_EVENT_RECEIVED
      );

      expect(matched).toHaveLength(0);
    });

    it("NaN no grupo recebido também não deve casar com lista válida", () => {
      const settings = [
        {
          id: 1,
          enabled: true,
          events: [GROUP_EVENT_RECEIVED],
          selectedGroups: [NUMERIC_GROUP_ID]
        }
      ];

      const matched = filterGroupWebhookTargets(
        settings,
        Number(GROUP_JID) as any,
        GROUP_EVENT_RECEIVED
      );

      expect(matched).toHaveLength(0);
    });
  });

  describe("respeita enabled e evento além do grupo", () => {
    const settings = [
      { id: 1, enabled: true, events: [GROUP_EVENT_RECEIVED], selectedGroups: [NUMERIC_GROUP_ID] },
      { id: 2, enabled: true, events: [GROUP_EVENT_SENT], selectedGroups: [NUMERIC_GROUP_ID] },
      { id: 3, enabled: false, events: [GROUP_EVENT_RECEIVED], selectedGroups: [NUMERIC_GROUP_ID] }
    ];

    it("filtra por evento e por enabled mantendo o match numérico do grupo", () => {
      const matched = filterGroupWebhookTargets(
        settings,
        NUMERIC_GROUP_ID,
        GROUP_EVENT_RECEIVED
      ).map(s => s.id);

      expect(matched).toEqual([1]);
    });
  });
});
