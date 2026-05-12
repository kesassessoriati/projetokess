import * as Yup from "yup";
import AppError from "../../errors/AppError";
import AiExternalAgentConfig from "../../models/AiExternalAgentConfig";
import GetOrCreateExternalAgentConfigService from "./GetOrCreateExternalAgentConfigService";

interface Request {
  companyId: number;
  userId?: number;
  name?: string;
  n8nWebhookUrl?: string | null;
  webhookEnabled?: boolean;
  metadata?: Record<string, any>;
}

const schema = Yup.object().shape({
  name: Yup.string().min(2).max(120).optional(),
  n8nWebhookUrl: Yup.string().url().nullable(),
  webhookEnabled: Yup.boolean().optional(),
  metadata: Yup.object().optional()
});

const UpdateExternalAgentConfigService = async ({
  companyId,
  userId,
  ...data
}: Request): Promise<AiExternalAgentConfig> => {
  try {
    await schema.validate(data, { abortEarly: false });
  } catch (error) {
    throw new AppError(`${JSON.stringify(error, undefined, 2)}`, 400);
  }

  const config = await GetOrCreateExternalAgentConfigService({ companyId, userId });

  await config.update({
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.n8nWebhookUrl !== undefined ? { n8nWebhookUrl: data.n8nWebhookUrl } : {}),
    ...(data.webhookEnabled !== undefined ? { webhookEnabled: data.webhookEnabled } : {}),
    ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    updatedByUserId: userId
  });

  return config.reload();
};

export default UpdateExternalAgentConfigService;
