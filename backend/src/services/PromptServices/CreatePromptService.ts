import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Prompt from "../../models/Prompt";
import ShowPromptService from "./ShowPromptService";
import SavePromptToolSettingsService from "../PromptToolSettingService/SavePromptToolSettingsService";

interface PromptData {
    name: string;
    apiKey?: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    queueId?: number;
    maxMessages?: number;
    companyId: string | number;
    voice?: string;
    voiceKey?: string;
    voiceRegion?: string;
    provider?: string;
    model?: string;
    aiUsageMode?: string;
    templateKey?: string;
    description?: string;
    toolsEnabled?: string[];
    knowledgeBase?: any[];
    channelBinding?: any;
}

const CreatePromptService = async (promptData: PromptData): Promise<Prompt> => {
    const {
        name,
        apiKey,
        prompt,
        queueId,
        maxMessages,
        companyId,
        toolsEnabled,
        knowledgeBase,
        provider,
        model,
        aiUsageMode,
        templateKey,
        description,
        channelBinding: _channelBinding
    } = promptData;
    const normalizedProvider = provider || "openai";
    const normalizedModel = model || "gpt-4o-mini";
    const normalizedMaxMessages = maxMessages || 10;

    const promptSchema = Yup.object().shape({
        name: Yup.string().required("ERR_PROMPT_NAME_INVALID"),
        prompt: Yup.string().required("ERR_PROMPT_INTELLIGENCE_INVALID"),
        queueId: Yup.number().nullable(),
        maxMessages: Yup.number().required("ERR_PROMPT_MAX_MESSAGES_INVALID"),
        companyId: Yup.number().required("ERR_PROMPT_companyId_INVALID"),
        provider: Yup.string().oneOf(["openai", "gemini", "openrouter", "groq"]).required("ERR_PROMPT_PROVIDER_INVALID"),
        model: Yup.string().required("ERR_PROMPT_MODEL_INVALID"),
        aiUsageMode: Yup.string().oneOf(["company_default", "system", "own"]).required("ERR_PROMPT_USAGE_MODE_INVALID")
    });

    try {
        await promptSchema.validate({
            name,
            prompt,
            queueId: queueId || null,
            maxMessages: normalizedMaxMessages,
            companyId,
            provider: normalizedProvider,
            model: normalizedModel,
            aiUsageMode: aiUsageMode || "system"
        });
    } catch (err) {
        throw new AppError(`${JSON.stringify(err, undefined, 2)}`);
    }

    let promptTable = await Prompt.create({
        name,
        prompt,
        maxTokens: promptData.maxTokens,
        temperature: promptData.temperature,
        promptTokens: promptData.promptTokens,
        completionTokens: promptData.completionTokens,
        totalTokens: promptData.totalTokens,
        maxMessages: normalizedMaxMessages,
        companyId: Number(companyId),
        voice: promptData.voice,
        voiceKey: promptData.voiceKey,
        voiceRegion: promptData.voiceRegion,
        apiKey: apiKey || "",
        queueId: queueId || null,
        provider: normalizedProvider,
        model: normalizedModel,
        aiUsageMode: aiUsageMode || "system",
        templateKey,
        description,
        knowledgeBase: knowledgeBase || []
    });

    await SavePromptToolSettingsService({
        companyId: Number(companyId),
        promptId: promptTable.id,
        toolsEnabled
    });

    promptTable = await ShowPromptService({ promptId: promptTable.id, companyId });

    return promptTable;
};

export default CreatePromptService;
