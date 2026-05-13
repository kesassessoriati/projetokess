import AppError from "../../errors/AppError";
import AiExternalAgentConfig from "../../models/AiExternalAgentConfig";
import AiExternalPromptVersion from "../../models/AiExternalPromptVersion";

const DeleteExternalPromptVersionService = async ({
  companyId,
  versionId
}: {
  companyId: number;
  versionId: number;
}) => {
  const version = await AiExternalPromptVersion.findOne({
    where: { id: versionId, companyId }
  });

  if (!version) {
    throw new AppError("Versao do prompt nao encontrada.", 404);
  }

  const config = await AiExternalAgentConfig.findOne({
    where: { id: version.configId, companyId }
  });

  if (version.isActive || config?.activePromptVersionId === version.id) {
    throw new AppError("Nao e permitido excluir a versao ativa do prompt.", 400);
  }

  await version.destroy();
};

export default DeleteExternalPromptVersionService;
