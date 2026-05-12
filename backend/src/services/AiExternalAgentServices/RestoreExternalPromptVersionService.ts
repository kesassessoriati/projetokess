import AppError from "../../errors/AppError";
import AiExternalPromptVersion from "../../models/AiExternalPromptVersion";
import CreateExternalPromptVersionService from "./CreateExternalPromptVersionService";

interface Request {
  companyId: number;
  userId?: number;
  versionId: number;
}

const RestoreExternalPromptVersionService = async ({
  companyId,
  userId,
  versionId
}: Request) => {
  const version = await AiExternalPromptVersion.findOne({
    where: { id: versionId, companyId }
  });

  if (!version) {
    throw new AppError("Versao de prompt nao encontrada.", 404);
  }

  return CreateExternalPromptVersionService({
    companyId,
    userId,
    content: version.content,
    changeNote: `Restaurado da versao ${version.version}`,
    restoredFromVersionId: version.id
  });
};

export default RestoreExternalPromptVersionService;
