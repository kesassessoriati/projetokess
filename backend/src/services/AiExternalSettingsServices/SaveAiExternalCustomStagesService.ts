import Setting from "../../models/Setting";
import PipelineStage from "../../models/PipelineStage";
import AppError from "../../errors/AppError";
import logger from "../../utils/logger";
import GetOrCreateAiExternalSettingsService, {
  invalidateSettingsCache,
  AiExternalSettings
} from "./GetOrCreateAiExternalSettingsService";
import {
  CustomStage,
  normalizeCustomStages,
  CUSTOM_STAGES_SETTING_KEY
} from "./customStages";

interface Request {
  companyId: number;
  customStages: unknown;
}

/**
 * Persiste as etapas personalizadas da IA externa.
 *
 * - Normaliza para exatamente 5 slots fixos.
 * - Valida ownership: cada stage_id preenchido precisa pertencer à companyId.
 * - O nome gravado vem SEMPRE da etapa real (não confia no nome do client).
 * - Salva em Setting (key=aiExternalCustomStages) por companyId.
 * - Invalida o cache do GetOrCreate e retorna as settings atualizadas.
 */
const SaveAiExternalCustomStagesService = async ({
  companyId,
  customStages
}: Request): Promise<AiExternalSettings> => {
  const normalized = normalizeCustomStages(customStages);

  const resolved: CustomStage[] = [];
  for (const slot of normalized) {
    if (slot.stage_id === null) {
      resolved.push({ key: slot.key, label: slot.label, name: null, stage_id: null });
      continue;
    }

    // Validação multiempresa: stage precisa pertencer à empresa autenticada.
    const stage = await PipelineStage.findOne({
      where: { id: slot.stage_id, companyId },
      attributes: ["id", "name"]
    });

    if (!stage) {
      throw new AppError("ERR_INVALID_CUSTOM_STAGE", 400);
    }

    resolved.push({
      key: slot.key,
      label: slot.label,
      name: stage.name,
      stage_id: stage.id
    });
  }

  const value = JSON.stringify(resolved);

  const existing = await Setting.findOne({
    where: { companyId, key: CUSTOM_STAGES_SETTING_KEY }
  });

  if (existing) {
    await existing.update({ value });
  } else {
    await Setting.create({ companyId, key: CUSTOM_STAGES_SETTING_KEY, value } as any);
  }

  invalidateSettingsCache(companyId);
  logger.info(`[AiExternalSettings] custom_stages atualizado companyId=${companyId}`);

  return GetOrCreateAiExternalSettingsService(companyId, true);
};

export default SaveAiExternalCustomStagesService;
