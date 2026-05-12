import AiExternalAgentConfig from "../../models/AiExternalAgentConfig";

interface Request {
  companyId: number;
  userId?: number;
}

const GetOrCreateExternalAgentConfigService = async ({
  companyId,
  userId
}: Request): Promise<AiExternalAgentConfig> => {
  const [config] = await AiExternalAgentConfig.findOrCreate({
    where: { companyId },
    defaults: {
      companyId,
      name: "Agente Externo N8N",
      systemPrompt: "",
      webhookEnabled: true,
      metadata: {},
      createdByUserId: userId,
      updatedByUserId: userId
    } as any
  });

  return config;
};

export default GetOrCreateExternalAgentConfigService;
