import User from "../../models/User";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import Servico from "../../models/Servico";

const ShowUserService = async (id: string | number, companyId: string | number): Promise<User> => {
  const user = await User.findOne(
    {
      where: {
        id,
        companyId
      },
      attributes: [
        "id",
        "name",
        "email",
        "profile",
        "profileImage",
        "super",
        "whatsappId",
        "online",
        "startWork",
        "endWork",
        "allTicket",
        "companyId",
        "tokenVersion",
        "defaultTheme",
        "allowGroup",
        "defaultMenu",
        "farewellMessage",
        "userClosePendingTicket",
        "showDashboard",
        "defaultTicketsManagerWidth",
        "allUserChat",
        "allHistoric",
        "allowRealTime",
        "allowConnections",
        "userType",
        "workDays",
        "lunchStart",
        "lunchEnd"
      ],
      include: [
        { model: Queue, as: "queues", attributes: ["id", "name", "color"] },
        { model: Servico, as: "services", attributes: ["id", "nome", "valorOriginal"] },
        {
          model: Company,
          as: "company",
          attributes: ["id", "name", "dueDate", "document", "status", "billing_cycle", "recurrence", "expiration_date"],
          include: [
            {
              model: Plan, as: "plan",
              attributes: ["id",
                "name",
                "amount",
                "useWhatsapp",
                "useFacebook",
                "useInstagram",
                "useCampaigns",
                "useSchedules",
                "useInternalChat",
                "useExternalApi",
                "useIntegrations",
                "useOpenAi",
                "useKanban",
                "notifica_mehub",
                "whatsapp_whatsmeow",
                "whatsapp_whaleys",
                "email",
                "gestor_financas",
                "gestor_financeiro_ia",
                "usePropostas",
                "useFollowUps"
              ]
            },
          ]
        },
      ]
    });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  return user;
};

export default ShowUserService;
