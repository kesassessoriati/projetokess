import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Prompt from "../../models/Prompt";
import ShowPromptService from "./ShowPromptService";
import SavePromptToolSettingsService from "../PromptToolSettingService/SavePromptToolSettingsService";

interface PromptData {
    id?: number;
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

interface Request {
    promptData: PromptData;
    promptId: string | number;
    companyId: string | number;
}

const UpdatePromptService = async ({
    promptId,
    promptData,
    companyId
}: Request): Promise<Prompt | undefined> => {
    const promptTable = await ShowPromptService({ promptId: promptId, companyId });

    const promptSchema = Yup.object().shape({
        name: Yup.string().required("ERR_PROMPT_NAME_INVALID"),
        prompt: Yup.string().required("ERR_PROMPT_PROMPT_INVALID"),
        queueId: Yup.number().nullable(),
        maxMessages: Yup.number().required("ERR_PROMPT_MAX_MESSAGES_INVALID"),
        provider: Yup.string().oneOf(["openai", "gemini", "openrouter", "groq"]).required("ERR_PROMPT_PROVIDER_INVALID"),
        model: Yup.string().required("ERR_PROMPT_MODEL_INVALID"),
        aiUsageMode: Yup.string().oneOf(["company_default", "system", "own"]).required("ERR_PROMPT_USAGE_MODE_INVALID")
    });

    const {
        name,
        apiKey,
        prompt,
        maxTokens,
        temperature,
        promptTokens,
        completionTokens,
        totalTokens,
        queueId,
        maxMessages,
        voice,
        voiceKey,
        voiceRegion,
        provider,
        model,
        aiUsageMode,
        templateKey,
        description,
        toolsEnabled,
        knowledgeBase
    } = promptData;
    const normalizedProvider = provider || promptTable.provider || "openai";
    const normalizedModel = model || promptTable.model || "gpt-4o-mini";
    const normalizedMaxMessages = maxMessages || promptTable.maxMessages || 10;

    try {
        await promptSchema.validate({
            name,
            prompt,
            maxTokens,
            temperature,
            promptTokens,
            completionTokens,
            totalTokens,
            queueId: queueId || null,
            maxMessages: normalizedMaxMessages,
            provider: normalizedProvider,
            model: normalizedModel,
            aiUsageMode: aiUsageMode || promptTable.aiUsageMode || "system"
        });
    } catch (err) {
        throw new AppError(`${JSON.stringify(err, undefined, 2)}`);
    }

    await promptTable.update({
        name,
        apiKey: apiKey || promptTable.apiKey || "",
        prompt,
        maxTokens,
        temperature,
        promptTokens,
        completionTokens,
        totalTokens,
        queueId: queueId || null,
        maxMessages: normalizedMaxMessages,
        voice,
        voiceKey,
        voiceRegion,
        provider: normalizedProvider,
        model: normalizedModel,
        aiUsageMode: aiUsageMode || promptTable.aiUsageMode || "system",
        templateKey,
        description,
        knowledgeBase: knowledgeBase || []
    });

    await SavePromptToolSettingsService({
        companyId: Number(companyId),
        promptId: Number(promptId),
        toolsEnabled
    });

    return ShowPromptService({ promptId, companyId });
};

export default UpdatePromptService;
