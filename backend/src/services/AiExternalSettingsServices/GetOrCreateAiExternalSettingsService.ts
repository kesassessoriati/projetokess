import { Op } from "sequelize";
import Company from "../../models/Company";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import UserSchedule from "../../models/UserSchedule";
import CompanyApiKey from "../../models/CompanyApiKey";
import Setting from "../../models/Setting";
import generateApiToken from "../../utils/generateApiToken";
import logger from "../../utils/logger";
import {
  CustomStage,
  buildEmptyCustomStages,
  parseCustomStagesSetting,
  CUSTOM_STAGES_SETTING_KEY
} from "./customStages";

export interface AiExternalSettings {
  ai_name: string;
  system_token: string;
  default_user: { id: number; name: string } | null;
  default_queue: { id: number; name: string } | null;
  default_pipeline: { id: number; name: string } | null;
  default_stage: { id: number; name: string } | null;
  default_calendar: { id: number; name: string } | null;
  appointment_stage: { pipeline_id: number; stage_id: number; stage_name: string } | null;
  custom_stages: CustomStage[];
}

// 5-minute in-memory cache keyed by companyId
const cache = new Map<number, { data: AiExternalSettings; expiresAt: number }>();

export const invalidateSettingsCache = (companyId: number) => cache.delete(companyId);

const slugify = (name: string) =>
  name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");

const randomColor = () =>
  "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");

const GetOrCreateAiExternalSettingsService = async (
  companyId: number,
  forceRefresh = false
): Promise<AiExternalSettings> => {
  if (!forceRefresh) {
    const hit = cache.get(companyId);
    if (hit && hit.expiresAt > Date.now()) return hit.data;
  }

  // 1. Company name
  const company = await Company.findOne({
    where: { id: companyId },
    attributes: ["id", "name"]
  });
  if (!company) throw new Error(`Empresa ${companyId} não encontrada`);

  const ai_name = "IA_" + slugify(company.name);

  // 2. API token — get first active or create
  let apiKey = await CompanyApiKey.findOne({
    where: { companyId, active: true },
    order: [["createdAt", "ASC"]]
  });
  if (!apiKey) {
    apiKey = await CompanyApiKey.create({
      companyId,
      label: "IA Externa",
      token: generateApiToken(),
      active: true
    });
    logger.info(`[AiExternalSettings] Token criado automaticamente companyId=${companyId}`);
  }
  const system_token = apiKey.token;

  // 3. Admin user
  let adminUser = await User.findOne({
    where: { companyId, profile: "admin" },
    attributes: ["id", "name"],
    order: [["createdAt", "ASC"]]
  });
  if (!adminUser) {
    adminUser = await User.findOne({
      where: { companyId },
      attributes: ["id", "name"],
      order: [["createdAt", "ASC"]]
    });
  }
  const default_user = adminUser ? { id: adminUser.id, name: adminUser.name } : null;

  // 4. Queue "Comercial"
  let queue = await Queue.findOne({
    where: { name: "Comercial", companyId },
    attributes: ["id", "name"]
  });
  if (!queue) {
    try {
      queue = await Queue.create({
        name: "Comercial",
        color: randomColor(),
        companyId,
        ativarRoteador: false,
        tempoRoteador: 0
      } as any);
      logger.info(`[AiExternalSettings] Fila Comercial criada companyId=${companyId}`);
    } catch (e: any) {
      logger.warn(`[AiExternalSettings] Falha ao criar fila Comercial companyId=${companyId}: ${e.message}`);
      // Try fallback: first queue of the company
      queue = await Queue.findOne({ where: { companyId }, attributes: ["id", "name"], order: [["createdAt", "ASC"]] });
    }
  }
  const default_queue = queue ? { id: queue.id, name: queue.name } : null;

  // 5 & 6 & 8. Pipeline + stages Lead + Agendamento
  let pipeline = await Pipeline.findOne({
    where: { companyId, isActive: true },
    attributes: ["id", "name"],
    order: [["isDefault", "DESC"], ["createdAt", "ASC"]]
  });
  if (!pipeline) {
    try {
      pipeline = await Pipeline.create({
        companyId,
        name: "Funil de Vendas",
        isDefault: true,
        isActive: true
      } as any);
      logger.info(`[AiExternalSettings] Pipeline criado companyId=${companyId}`);
    } catch (e: any) {
      logger.warn(`[AiExternalSettings] Falha ao criar pipeline companyId=${companyId}: ${e.message}`);
    }
  }

  let default_stage: AiExternalSettings["default_stage"] = null;
  let appointment_stage: AiExternalSettings["appointment_stage"] = null;

  if (pipeline) {
    // Stage "Lead"
    let leadStage = await PipelineStage.findOne({
      where: { pipelineId: pipeline.id, companyId, name: { [Op.iLike]: "lead" } },
      attributes: ["id", "name"]
    });
    if (!leadStage) {
      try {
        leadStage = await PipelineStage.create({
          pipelineId: pipeline.id,
          companyId,
          name: "Lead",
          order: 0,
          color: "#3b82f6",
          probability: 10
        } as any);
        logger.info(`[AiExternalSettings] Etapa Lead criada pipeline=${pipeline.id}`);
      } catch (e: any) {
        logger.warn(`[AiExternalSettings] Falha ao criar etapa Lead: ${e.message}`);
      }
    }
    default_stage = leadStage ? { id: leadStage.id, name: leadStage.name } : null;

    // Stage "Agendamento"
    let appointmentStage = await PipelineStage.findOne({
      where: { pipelineId: pipeline.id, companyId, name: { [Op.iLike]: "agendamento" } },
      attributes: ["id", "name"]
    });
    if (!appointmentStage) {
      try {
        // Count existing stages to set order after them
        const stageCount = await PipelineStage.count({ where: { pipelineId: pipeline.id, companyId } });
        appointmentStage = await PipelineStage.create({
          pipelineId: pipeline.id,
          companyId,
          name: "Agendamento",
          order: stageCount,
          color: "#f59e0b",
          probability: 60
        } as any);
        logger.info(`[AiExternalSettings] Etapa Agendamento criada pipeline=${pipeline.id}`);
      } catch (e: any) {
        logger.warn(`[AiExternalSettings] Falha ao criar etapa Agendamento: ${e.message}`);
      }
    }
    appointment_stage = appointmentStage
      ? { pipeline_id: pipeline.id, stage_id: appointmentStage.id, stage_name: appointmentStage.name }
      : null;
  }

  // 7. UserSchedule (agenda padrão)
  const calendarName = `Agenda da empresa ${company.name}`;
  let schedule = await UserSchedule.findOne({
    where: { companyId, name: calendarName },
    attributes: ["id", "name"]
  });
  if (!schedule && default_user) {
    try {
      schedule = await UserSchedule.create({
        companyId,
        name: calendarName,
        userId: default_user.id,
        active: true
      } as any);
      logger.info(`[AiExternalSettings] Agenda criada companyId=${companyId}`);
    } catch (e: any) {
      logger.warn(`[AiExternalSettings] Falha ao criar agenda companyId=${companyId}: ${e.message}`);
      // Fallback: first existing schedule
      schedule = await UserSchedule.findOne({ where: { companyId }, attributes: ["id", "name"], order: [["createdAt", "ASC"]] });
    }
  } else if (!schedule) {
    schedule = await UserSchedule.findOne({ where: { companyId }, attributes: ["id", "name"], order: [["createdAt", "ASC"]] });
  }
  const default_calendar = schedule ? { id: schedule.id, name: schedule.name } : null;

  // 9. Etapas personalizadas (custom_stages) — leitura defensiva do Setting.
  // Sempre 5 slots; se ausente/corrompido, cai em 5 slots vazios.
  let custom_stages: CustomStage[];
  try {
    const customStagesSetting = await Setting.findOne({
      where: { companyId, key: CUSTOM_STAGES_SETTING_KEY },
      attributes: ["value"]
    });
    custom_stages = parseCustomStagesSetting(customStagesSetting?.value);
  } catch (e: any) {
    logger.warn(`[AiExternalSettings] Falha ao ler custom_stages companyId=${companyId}: ${e.message}`);
    custom_stages = buildEmptyCustomStages();
  }

  const result: AiExternalSettings = {
    ai_name,
    system_token,
    default_user,
    default_queue,
    default_pipeline: pipeline ? { id: pipeline.id, name: pipeline.name } : null,
    default_stage,
    default_calendar,
    appointment_stage,
    custom_stages
  };

  cache.set(companyId, { data: result, expiresAt: Date.now() + 5 * 60 * 1000 });
  return result;
};

export default GetOrCreateAiExternalSettingsService;
