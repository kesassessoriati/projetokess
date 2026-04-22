import Company from "../../models/Company";
import Plan from "../../models/Plan";

const ShowPlanCompanyService = async (id: string | number): Promise<Company> => {
    const companies = await Company.findOne({
        where: { id },
        attributes: ["id", "name", "email", "status", "dueDate", "createdAt", "phone", "document", "lastLogin"],
        order: [["name", "ASC"]],
        include: [
            {
                model: Plan, as: "plan",
                attributes: [
                    "id",
                    "name",
                    "users",
                    "connections",
                    "queues",
                    "amount",
                    "useWhatsapp",
                    "useFacebook",
                    "useInstagram",
                    "useCampaigns",
                    "useSchedules",
                    "useInternalChat",
                    "useExternalApi",
                    "useKanban",
                    "useOpenAi",
                    "useIntegrations",
                    "aiEnabled",
                    "aiDailyCredits",
                    "aiAgentEnabled",
                    "notifica_mehub",
                    "whatsapp_whatsmeow",
                    "whatsapp_whaleys",
                    "email",
                    "gestor_financas",
                    "gestor_financeiro_ia",
                    "usePropostas",
                    "recurrence",
                    "trial",
                    "trialDays"
                ]
            },
        ]
    });

    return companies;
};

export default ShowPlanCompanyService;
