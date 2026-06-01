import AppError from "../../errors/AppError";
import Prompt from "../../models/Prompt";
import PromptToolSetting from "../../models/PromptToolSetting";
import ShowPromptService from "./ShowPromptService";
import SavePromptToolSettingsService from "../PromptToolSettingService/SavePromptToolSettingsService";

interface DuplicatePromptRequest {
  promptId: string | number;
  companyId: string | number;
}

const DuplicatePromptService = async ({
  promptId,
  companyId
}: DuplicatePromptRequest): Promise<Prompt> => {
  const source = await Prompt.findOne({
    where: { id: promptId, companyId }
  });

  if (!source) {
    throw new AppError("ERR_NO_PROMPT_FOUND", 404);
  }

  const clone = await Prompt.create({
    name: `Cópia de ${source.name}`.slice(0, 255),
    prompt: source.prompt,
    apiKey: source.apiKey || "",
    maxMessages: source.maxMessages,
    maxTokens: source.maxTokens,
    temperature: source.temperature,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    voice: source.voice,
    voiceKey: source.voiceKey,
    voiceRegion: source.voiceRegion,
    provider: source.provider,
    model: source.model,
    aiUsageMode: source.aiUsageMode,
    templateKey: source.templateKey,
    description: source.description,
    queueId: source.queueId,
    companyId: Number(companyId),
    knowledgeBase: source.knowledgeBase || []
  });

  const tools = await PromptToolSetting.findAll({
    where: {
      companyId,
      promptId: source.id,
      enabled: true
    }
  });

  await SavePromptToolSettingsService({
    companyId: Number(companyId),
    promptId: clone.id,
    toolsEnabled: tools.map(tool => tool.toolName)
  });

  return ShowPromptService({ promptId: clone.id, companyId });
};

export default DuplicatePromptService;
