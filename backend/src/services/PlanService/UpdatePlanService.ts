import AppError from "../../errors/AppError";
import Plan from "../../models/Plan";
import ShowPlanService from "./ShowPlanService";

interface PlanData {
  name: string;
  id?: number | string;
  users?: number;
  connections?: number;
  queues?: number;
  amount?: string;
  useWhatsapp?: boolean;
  useFacebook?: boolean;
  useInstagram?: boolean;
  useCampaigns?: boolean;
  useSchedules?: boolean;
  useInternalChat?: boolean;
  useExternalApi?: boolean;
  useKanban?: boolean;
  useOpenAi?: boolean;
  useIntegrations?: boolean;
  aiCredits?: number;
  aiEnabled?: boolean;
  aiDailyCredits?: number;
  aiAgentEnabled?: boolean;
  notifica_mehub?: boolean;
  whatsapp_whatsmeow?: boolean;
  whatsapp_whaleys?: boolean;
  email?: boolean;
  gestor_financas?: boolean;
  gestor_financeiro_ia?: boolean;
  isPublic?: boolean;
  usePropostas?: boolean;
  useFollowUps?: boolean;
}

const UpdatePlanService = async (planData: PlanData): Promise<Plan> => {
  const { id } = planData;
  const normalizedPlanData = {
    ...planData,
    aiCredits:
      typeof planData.aiDailyCredits === "number"
        ? planData.aiDailyCredits
        : planData.aiCredits,
    aiDailyCredits:
      typeof planData.aiDailyCredits === "number"
        ? planData.aiDailyCredits
        : planData.aiCredits,
    aiEnabled:
      typeof planData.aiEnabled === "boolean"
        ? planData.aiEnabled
        : planData.useOpenAi,
    aiAgentEnabled:
      typeof planData.aiAgentEnabled === "boolean"
        ? planData.aiAgentEnabled
        : planData.useOpenAi
  };

  let plan = await Plan.findByPk(id);

  if (!plan) {
    throw new AppError("ERR_NO_PLAN_FOUND", 404);
  }

  await plan.update(normalizedPlanData);

  return plan;
};

export default UpdatePlanService;
