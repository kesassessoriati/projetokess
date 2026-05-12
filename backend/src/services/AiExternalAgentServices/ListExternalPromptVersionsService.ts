import AiExternalPromptVersion from "../../models/AiExternalPromptVersion";
import User from "../../models/User";
import GetOrCreateExternalAgentConfigService from "./GetOrCreateExternalAgentConfigService";

interface Request {
  companyId: number;
  userId?: number;
}

const ListExternalPromptVersionsService = async ({
  companyId,
  userId
}: Request): Promise<AiExternalPromptVersion[]> => {
  const config = await GetOrCreateExternalAgentConfigService({ companyId, userId });

  return AiExternalPromptVersion.findAll({
    where: { companyId, configId: config.id },
    include: [
      {
        model: User,
        as: "createdByUser",
        attributes: ["id", "name", "email"]
      }
    ],
    order: [["version", "DESC"]]
  });
};

export default ListExternalPromptVersionsService;
