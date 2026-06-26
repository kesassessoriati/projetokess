/**
 * Etapas personalizadas da IA externa (custom_stages).
 *
 * 5 slots fixos (stage_1..stage_5) enviados em `ai_external_settings.custom_stages`
 * nos webhooks de mensagem (MESSAGE_RECEIVED / MESSAGE_SENT), local e global.
 *
 * Este módulo é puro (sem acesso a banco) para ser reutilizado tanto na leitura
 * (GetOrCreateAiExternalSettingsService) quanto na escrita
 * (SaveAiExternalCustomStagesService) e testável sem DB.
 */

export interface CustomStage {
  key: string;
  label: string;
  name: string | null;
  stage_id: number | null;
}

export const CUSTOM_STAGES_SETTING_KEY = "aiExternalCustomStages";
export const CUSTOM_STAGE_SLOTS = 5;
export const MAX_CUSTOM_STAGE_NAME = 120;

/** Array com os 5 slots fixos vazios (name/stage_id nulos). */
export const buildEmptyCustomStages = (): CustomStage[] =>
  Array.from({ length: CUSTOM_STAGE_SLOTS }, (_, i) => ({
    key: `stage_${i + 1}`,
    label: `Etapa ${i + 1}`,
    name: null,
    stage_id: null
  }));

const toPositiveIntOrNull = (val: unknown): number | null => {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

const sanitizeName = (val: unknown): string | null => {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  return s.slice(0, MAX_CUSTOM_STAGE_NAME);
};

/**
 * Normaliza qualquer input em exatamente 5 slots fixos (stage_1..stage_5),
 * preservando a ordem por índice. Aceita array (usa índice) ou objeto keyed
 * por stage_N. Slots ausentes/vazios viram { name: null, stage_id: null }.
 *
 * Regra: se stage_id for inválido/ausente, o slot inteiro fica vazio
 * (name = null), evitando nome "órfão" sem id.
 */
export const normalizeCustomStages = (input: unknown): CustomStage[] => {
  const base = buildEmptyCustomStages();
  if (!input) return base;

  let items: any[];
  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === "object") {
    items = base.map(slot => (input as any)[slot.key]);
  } else {
    return base;
  }

  return base.map((slot, i) => {
    const raw = items[i];
    if (!raw || typeof raw !== "object") return slot;

    const stage_id = toPositiveIntOrNull((raw as any).stage_id);
    const name = stage_id === null ? null : sanitizeName((raw as any).name);
    return { key: slot.key, label: slot.label, name, stage_id };
  });
};

/**
 * Parse defensivo de `Setting.value` (string JSON) → 5 slots normalizados.
 * Se o valor estiver ausente/corrompido, retorna 5 slots vazios.
 */
export const parseCustomStagesSetting = (
  value: string | null | undefined
): CustomStage[] => {
  if (!value) return buildEmptyCustomStages();
  try {
    return normalizeCustomStages(JSON.parse(value));
  } catch {
    return buildEmptyCustomStages();
  }
};
