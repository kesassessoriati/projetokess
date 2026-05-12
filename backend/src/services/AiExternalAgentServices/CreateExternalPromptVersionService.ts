import * as Yup from "yup";
import { Transaction } from "sequelize";
import AppError from "../../errors/AppError";
import sequelize from "../../database";
import AiExternalPromptVersion from "../../models/AiExternalPromptVersion";
import GetOrCreateExternalAgentConfigService from "./GetOrCreateExternalAgentConfigService";
import DispatchExternalAgentEventService from "./DispatchExternalAgentEventService";

interface Request {
  companyId: number;
  userId?: number;
  content: string;
  changeNote?: string | null;
  restoredFromVersionId?: number | null;
}

const schema = Yup.object().shape({
  content: Yup.string().trim().required("ERR_AI_EXTERNAL_PROMPT_REQUIRED"),
  changeNote: Yup.string().nullable(),
  restoredFromVersionId: Yup.number().nullable()
});

const CreateExternalPromptVersionService = async ({
  companyId,
  userId,
  content,
  changeNote,
  restoredFromVersionId
}: Request): Promise<{
  version: AiExternalPromptVersion;
  event: any;
}> => {
  try {
    await schema.validate({ content, changeNote, restoredFromVersionId }, { abortEarly: false });
  } catch (error) {
    throw new AppError(`${JSON.stringify(error, undefined, 2)}`, 400);
  }

  const config = await GetOrCreateExternalAgentConfigService({ companyId, userId });

  const version = await sequelize.transaction(async (transaction: Transaction) => {
    const lastVersion = await AiExternalPromptVersion.max("version", {
      where: { companyId, configId: config.id },
      transaction
    });

    await AiExternalPromptVersion.update(
      { isActive: false },
      {
        where: { companyId, configId: config.id, isActive: true },
        transaction
      }
    );

    const created = await AiExternalPromptVersion.create(
      {
        companyId,
        configId: config.id,
        version: Number(lastVersion || 0) + 1,
        content,
        changeNote,
        restoredFromVersionId,
        isActive: true,
        createdByUserId: userId
      } as any,
      { transaction }
    );

    await config.update(
      {
        systemPrompt: content,
        activePromptVersionId: created.id,
        updatedByUserId: userId
      },
      { transaction }
    );

    return created;
  });

  const event = await DispatchExternalAgentEventService({
    eventType: "external_agent.prompt.updated",
    companyId,
    config: await config.reload(),
    promptVersion: version,
    userId,
    data: {
      configId: config.id,
      promptVersionId: version.id,
      version: version.version,
      content: version.content,
      restoredFromVersionId: version.restoredFromVersionId || null
    }
  });

  return { version: await version.reload(), event };
};

export default CreateExternalPromptVersionService;
