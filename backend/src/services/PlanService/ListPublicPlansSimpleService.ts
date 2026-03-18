import Plan from "../../models/Plan";

interface PublicPlan {
  id: number;
  name: string;
  amount: string;
  users: number;
  connections: number;
  queues: number;
  useWhatsapp: boolean;
  useFacebook: boolean;
  useInstagram: boolean;
  useCampaigns: boolean;
  useSchedules: boolean;
  useInternalChat: boolean;
  useExternalApi: boolean;
  useKanban: boolean;
  useOpenAi: boolean;
  aiEnabled: boolean;
  aiDailyCredits: number;
  aiAgentEnabled: boolean;
  useIntegrations: boolean;
  notifica_mehub: boolean;
  whatsapp_whatsmeow: boolean;
  whatsapp_whaleys: boolean;
  email: boolean;
  gestor_financas: boolean;
  gestor_financeiro_ia: boolean;
  trial: boolean;
  trialDays: number;
  recurrence: string;
}

const ListPublicPlansSimpleService = async (): Promise<PublicPlan[]> => {
  const plans = await Plan.findAll({
    where: { isPublic: true },
    attributes: [
      "id", "name", "amount", "users", "connections", "queues",
      "useWhatsapp", "useFacebook", "useInstagram", "useCampaigns", 
      "useSchedules", "useInternalChat", "useExternalApi", "useKanban",
      "useOpenAi", "useIntegrations", "aiEnabled", "aiDailyCredits", "aiAgentEnabled", "notifica_mehub", "whatsapp_whatsmeow",
      "whatsapp_whaleys", "email", "gestor_financas", "gestor_financeiro_ia",
      "trial", "trialDays", "recurrence"
    ],
    order: [["name", "ASC"]]
  });

  return plans.map(plan => plan.get({ plain: true })) as PublicPlan[];
};

export default ListPublicPlansSimpleService;
