import AppError from "../../errors/AppError";
import AiExternalWebhook from "../../models/AiExternalWebhook";
import GetOrCreateExternalAgentConfigService from "./GetOrCreateExternalAgentConfigService";

interface WebhookInput {
  name: string;
  url: string;
  eventType: string;
  isActive?: boolean;
}

export const listWebhooks = async (companyId: number): Promise<AiExternalWebhook[]> => {
  return AiExternalWebhook.findAll({
    where: { companyId },
    order: [["eventType", "ASC"], ["createdAt", "ASC"]]
  });
};

export const createWebhook = async (
  companyId: number,
  userId: number,
  input: WebhookInput
): Promise<AiExternalWebhook> => {
  const { name, url, eventType, isActive = true } = input;

  if (!name?.trim()) throw new AppError("Nome do webhook e obrigatorio.");
  if (!url?.trim()) throw new AppError("URL do webhook e obrigatoria.");
  if (!eventType?.trim()) throw new AppError("Tipo de evento e obrigatorio.");

  const config = await GetOrCreateExternalAgentConfigService({ companyId, userId });

  const webhook = await AiExternalWebhook.create({
    companyId,
    configId: config.id,
    name: name.trim(),
    url: url.trim(),
    eventType: eventType.trim(),
    isActive
  } as any);

  return webhook;
};

export const updateWebhook = async (
  id: number,
  companyId: number,
  input: Partial<WebhookInput>
): Promise<AiExternalWebhook> => {
  const webhook = await AiExternalWebhook.findOne({ where: { id, companyId } });
  if (!webhook) throw new AppError("Webhook nao encontrado.", 404);

  const updates: Partial<WebhookInput> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.url !== undefined) updates.url = input.url.trim();
  if (input.eventType !== undefined) updates.eventType = input.eventType.trim();
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  await webhook.update(updates);
  return webhook.reload();
};

export const toggleWebhook = async (
  id: number,
  companyId: number
): Promise<AiExternalWebhook> => {
  const webhook = await AiExternalWebhook.findOne({ where: { id, companyId } });
  if (!webhook) throw new AppError("Webhook nao encontrado.", 404);

  await webhook.update({ isActive: !webhook.isActive });
  return webhook.reload();
};

export const deleteWebhook = async (
  id: number,
  companyId: number
): Promise<void> => {
  const webhook = await AiExternalWebhook.findOne({ where: { id, companyId } });
  if (!webhook) throw new AppError("Webhook nao encontrado.", 404);

  await webhook.destroy();
};

export const findActiveWebhooksForEvent = async (
  companyId: number,
  eventType: string
): Promise<AiExternalWebhook[]> => {
  return AiExternalWebhook.findAll({
    where: {
      companyId,
      isActive: true,
      eventType
    }
  });
};
