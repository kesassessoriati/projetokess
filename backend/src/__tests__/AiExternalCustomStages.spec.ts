import {
  normalizeCustomStages,
  parseCustomStagesSetting,
  buildEmptyCustomStages,
  CUSTOM_STAGE_SLOTS,
  MAX_CUSTOM_STAGE_NAME
} from "../services/AiExternalSettingsServices/customStages";

/**
 * Cobre a normalização de custom_stages (Agente de IA → Informações).
 * Validação de ownership (stage_id por companyId) vive em
 * SaveAiExternalCustomStagesService e depende de DB — não coberta aqui.
 */
describe("customStages — normalização dos 5 slots", () => {
  it("Cenário 1: sem input → 5 slots vazios com key/label fixos", () => {
    const slots = parseCustomStagesSetting(undefined);
    expect(slots).toHaveLength(CUSTOM_STAGE_SLOTS);
    slots.forEach((s, i) => {
      expect(s.key).toBe(`stage_${i + 1}`);
      expect(s.label).toBe(`Etapa ${i + 1}`);
      expect(s.name).toBeNull();
      expect(s.stage_id).toBeNull();
    });
  });

  it("Cenário 2: JSON válido → 5 slots normalizados, ordem preservada", () => {
    const value = JSON.stringify([
      { key: "stage_1", label: "Etapa 1", name: "Orçamento", stage_id: 101 },
      { key: "stage_2", label: "Etapa 2", name: "Reunião", stage_id: 102 }
    ]);
    const slots = parseCustomStagesSetting(value);
    expect(slots).toHaveLength(5);
    expect(slots[0]).toEqual({ key: "stage_1", label: "Etapa 1", name: "Orçamento", stage_id: 101 });
    expect(slots[1]).toEqual({ key: "stage_2", label: "Etapa 2", name: "Reunião", stage_id: 102 });
    expect(slots[2]).toEqual({ key: "stage_3", label: "Etapa 3", name: null, stage_id: null });
  });

  it("Cenário 3: Setting corrompido → 5 slots vazios", () => {
    expect(parseCustomStagesSetting("{not valid json")).toEqual(buildEmptyCustomStages());
    expect(parseCustomStagesSetting("")).toEqual(buildEmptyCustomStages());
  });

  it("Cenário 6: stage_id vazio/zero/negativo → null (slot vazio)", () => {
    const slots = normalizeCustomStages([
      { stage_id: "", name: "X" },
      { stage_id: 0, name: "Y" },
      { stage_id: -5, name: "Z" },
      { stage_id: 1.5, name: "W" }
    ]);
    slots.forEach(s => {
      expect(s.stage_id).toBeNull();
      expect(s.name).toBeNull(); // sem stage_id válido, name é anulado
    });
  });

  it("ignora slots extras além de 5", () => {
    const input = Array.from({ length: 9 }, (_, i) => ({ stage_id: 100 + i, name: `S${i}` }));
    const slots = normalizeCustomStages(input);
    expect(slots).toHaveLength(5);
    expect(slots[4].stage_id).toBe(104);
  });

  it("aceita também a forma objeto keyed por stage_N", () => {
    const slots = normalizeCustomStages({
      stage_1: { name: "A", stage_id: 11 },
      stage_3: { name: "C", stage_id: 33 }
    });
    expect(slots[0].stage_id).toBe(11);
    expect(slots[1].stage_id).toBeNull();
    expect(slots[2].stage_id).toBe(33);
  });

  it("normaliza tipos: stage_id string numérica vira number; name é trimado e limitado", () => {
    const longName = "x".repeat(MAX_CUSTOM_STAGE_NAME + 50);
    const slots = normalizeCustomStages([{ stage_id: "207", name: `  ${longName}  ` }]);
    expect(slots[0].stage_id).toBe(207);
    expect(slots[0].name).toHaveLength(MAX_CUSTOM_STAGE_NAME);
  });
});
