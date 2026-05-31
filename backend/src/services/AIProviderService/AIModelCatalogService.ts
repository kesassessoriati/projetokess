import axios from "axios";
import Setting from "../../models/Setting";
import AppError from "../../errors/AppError";
import { getMaskedSecret } from "./AIProviderService";

export type AIProviderName = "openai" | "gemini" | "openrouter";

export interface AIModelInfo {
  id: string;
  name: string;
  provider: AIProviderName;
  contextLength?: number | null;
  created?: number | null;
}

export interface GlobalAIProviderConfig {
  provider: AIProviderName;
  apiKey: string;
  maskedApiKey: string;
  hasApiKey: boolean;
  models: AIModelInfo[];
  lastSyncAt?: string | null;
}

const SYSTEM_COMPANY_ID = 1;

const PROVIDERS: AIProviderName[] = ["openai", "gemini", "openrouter"];

const KEY_MAP: Record<AIProviderName, string> = {
  openai: "openaiApiKey",
  gemini: "geminiApiKey",
  openrouter: "openrouterApiKey"
};

const MODELS_KEY_MAP: Record<AIProviderName, string> = {
  openai: "openaiModels",
  gemini: "geminiModels",
  openrouter: "openrouterModels"
};

const LAST_SYNC_KEY_MAP: Record<AIProviderName, string> = {
  openai: "openaiModelsLastSyncAt",
  gemini: "geminiModelsLastSyncAt",
  openrouter: "openrouterModelsLastSyncAt"
};

export const getSystemCompanyId = () => SYSTEM_COMPANY_ID;

const getSetting = async (key: string): Promise<string> => {
  const setting = await Setting.findOne({ where: { companyId: SYSTEM_COMPANY_ID, key } });
  return setting?.value || "";
};

export const upsertSystemSetting = async (key: string, value?: string | null) => {
  const normalizedValue = value || "";
  const setting = await Setting.findOne({ where: { companyId: SYSTEM_COMPANY_ID, key } });

  if (setting) {
    await setting.update({ value: normalizedValue });
    return setting;
  }

  return Setting.create({
    companyId: SYSTEM_COMPANY_ID,
    key,
    value: normalizedValue
  });
};

const parseModels = (value: string, provider: AIProviderName): AIModelInfo[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(model => ({
      id: String(model.id || model.name || ""),
      name: String(model.name || model.id || ""),
      provider,
      contextLength: model.contextLength ?? null,
      created: model.created ?? null
    })).filter(model => model.id);
  } catch {
    return [];
  }
};

export const getGlobalAISettings = async () => {
  const preferredProvider = ((await getSetting("aiProvider")) || "openai") as AIProviderName;
  const crmAiSystemPrompt = await getSetting("crmAiSystemPrompt");
  const crmAiDefaultModel = await getSetting("crmAiDefaultModel");

  const providers = await Promise.all(PROVIDERS.map(async provider => {
    const apiKey = await getSetting(KEY_MAP[provider]);
    const models = parseModels(await getSetting(MODELS_KEY_MAP[provider]), provider);
    const lastSyncAt = await getSetting(LAST_SYNC_KEY_MAP[provider]);

    return {
      provider,
      apiKey: "",
      maskedApiKey: getMaskedSecret(apiKey),
      hasApiKey: Boolean(apiKey.trim()),
      models,
      lastSyncAt: lastSyncAt || null
    } satisfies GlobalAIProviderConfig;
  }));

  return {
    preferredProvider: PROVIDERS.includes(preferredProvider) ? preferredProvider : "openai",
    crmAiSystemPrompt,
    crmAiDefaultModel: crmAiDefaultModel || "",
    providers
  };
};

const normalizeOpenAIModels = (models: any[]): AIModelInfo[] =>
  models
    .filter(model => typeof model?.id === "string")
    .map(model => ({
      id: model.id,
      name: model.id,
      provider: "openai" as AIProviderName,
      created: model.created ?? null
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

const normalizeOpenRouterModels = (models: any[]): AIModelInfo[] =>
  models
    .filter(model => typeof model?.id === "string")
    .map(model => ({
      id: model.id,
      name: model.name || model.id,
      provider: "openrouter" as AIProviderName,
      contextLength: model.context_length ?? model.contextLength ?? null
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

const normalizeGeminiModels = (models: any[]): AIModelInfo[] =>
  models
    .filter(model => typeof model?.name === "string")
    .map(model => {
      const id = model.name.replace(/^models\//, "");
      return {
        id,
        name: model.displayName || id,
        provider: "gemini" as AIProviderName
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

export const fetchProviderModels = async (
  provider: AIProviderName,
  apiKey: string
): Promise<AIModelInfo[]> => {
  if (!apiKey?.trim()) {
    throw new AppError("Informe uma API key antes de sincronizar modelos.", 400);
  }

  if (provider === "openai") {
    const { data } = await axios.get("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 20000
    });
    return normalizeOpenAIModels(data?.data || []);
  }

  if (provider === "openrouter") {
    const { data } = await axios.get("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 20000
    });
    return normalizeOpenRouterModels(data?.data || []);
  }

  const { data } = await axios.get("https://generativelanguage.googleapis.com/v1beta/models", {
    params: { key: apiKey },
    timeout: 20000
  });
  return normalizeGeminiModels(data?.models || []);
};

export const syncProviderModels = async (
  provider: AIProviderName,
  apiKey?: string | null
) => {
  const resolvedKey = apiKey?.trim() || await getSetting(KEY_MAP[provider]);
  const models = await fetchProviderModels(provider, resolvedKey);
  const now = new Date().toISOString();

  if (apiKey?.trim()) {
    await upsertSystemSetting(KEY_MAP[provider], apiKey.trim());
  }
  await upsertSystemSetting(MODELS_KEY_MAP[provider], JSON.stringify(models));
  await upsertSystemSetting(LAST_SYNC_KEY_MAP[provider], now);

  return { provider, models, lastSyncAt: now };
};

export const saveGlobalAISettings = async (payload: {
  preferredProvider?: AIProviderName;
  crmAiSystemPrompt?: string;
  crmAiDefaultModel?: string;
  keys?: Partial<Record<AIProviderName, string>>;
}) => {
  if (payload.preferredProvider && PROVIDERS.includes(payload.preferredProvider)) {
    await upsertSystemSetting("aiProvider", payload.preferredProvider);
  }

  if (typeof payload.crmAiSystemPrompt === "string") {
    await upsertSystemSetting("crmAiSystemPrompt", payload.crmAiSystemPrompt);
  }

  if (typeof payload.crmAiDefaultModel === "string") {
    await upsertSystemSetting("crmAiDefaultModel", payload.crmAiDefaultModel);
  }

  for (const provider of PROVIDERS) {
    const nextKey = payload.keys?.[provider];
    if (typeof nextKey === "string" && !nextKey.includes("****")) {
      await upsertSystemSetting(KEY_MAP[provider], nextKey.trim());
    }
  }

  return getGlobalAISettings();
};

export const getStoredProviderModels = async (provider: AIProviderName): Promise<AIModelInfo[]> => {
  return parseModels(await getSetting(MODELS_KEY_MAP[provider]), provider);
};
