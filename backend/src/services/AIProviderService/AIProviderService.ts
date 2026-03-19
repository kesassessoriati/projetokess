import Company from "../../models/Company";
import Plan from "../../models/Plan";
import Setting from "../../models/Setting";
import AIUsageLog from "../../models/AIUsageLog";
import Prompt from "../../models/Prompt";
import AppError from "../../errors/AppError";
import {
  getCreditInfo,
  consumeCredit,
  type CreditInfo
} from "../AiCreditService/AiCreditService";

export type AIUsageMode = "system" | "own";
export type PromptUsageMode = "company_default" | AIUsageMode;
export type AIProviderName = "openai" | "gemini";

type CompanyWithPlan = Company & { plan?: Plan };

interface ResolveConfigParams {
  companyId: number;
  provider?: string | null;
  promptId?: number | null;
  promptUsageMode?: PromptUsageMode | null;
  requestType?: string;
  model?: string | null;
}

interface LogUsageParams {
  companyId: number;
  provider: string;
  usageMode: AIUsageMode;
  requestType: string;
  promptId?: number | null;
  model?: string | null;
  status: "success" | "error";
  errorCode?: string | null;
  creditsConsumed?: number;
  metadata?: Record<string, any>;
}

export interface ResolvedAIConfig {
  provider: AIProviderName;
  usageMode: AIUsageMode;
  apiKey: string;
  shouldConsumeCredits: boolean;
  creditInfo: CreditInfo;
  plan: Plan | null;
  company: Company;
}

const AI_KEY_SETTING_MAP: Record<AIProviderName, string> = {
  openai: "openaiApiKey",
  gemini: "geminiApiKey"
};

const DEFAULT_SYSTEM_PROVIDER: AIProviderName = "openai";

const loadCompanyWithPlan = async (companyId: number): Promise<CompanyWithPlan> => {
  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan" }]
  });

  if (!company) {
    throw new AppError("Empresa não encontrada.", 404);
  }

  return company as CompanyWithPlan;
};

const getProviderSetting = async (
  companyId: number,
  key: string
): Promise<string | null> => {
  const setting = await Setting.findOne({
    where: { companyId, key }
  }).catch(() => null);

  return setting?.value?.trim() || null;
};

const normalizeProvider = (provider?: string | null): AIProviderName => {
  return provider === "gemini" ? "gemini" : "openai";
};

const resolveCompanyUsageMode = (company: Company): AIUsageMode => {
  return company.aiUsageMode === "own" ? "own" : "system";
};

const resolveUsageMode = (
  company: Company,
  promptUsageMode?: PromptUsageMode | null
): AIUsageMode => {
  if (promptUsageMode === "own" || promptUsageMode === "system") {
    return promptUsageMode;
  }

  return resolveCompanyUsageMode(company);
};

const resolvePlanAiEnabled = (plan?: Plan | null): boolean => {
  if (!plan) return false;
  if (typeof plan.aiEnabled === "boolean") {
    return Boolean(plan.aiEnabled);
  }
  return Boolean(plan.useOpenAi);
};

const resolvePlanAiAgentEnabled = (plan?: Plan | null): boolean => {
  if (!plan) return false;
  if (typeof plan.aiAgentEnabled === "boolean") {
    return Boolean(plan.aiAgentEnabled);
  }
  return Boolean(plan.useOpenAi);
};

export const getMaskedSecret = (value?: string | null): string => {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}********${value.slice(-4)}`;
};

export const getPlanAiSnapshot = (plan?: Plan | null) => ({
  aiEnabled: resolvePlanAiEnabled(plan),
  aiAgentEnabled: resolvePlanAiAgentEnabled(plan),
  aiDailyCredits:
    typeof plan?.aiDailyCredits === "number" ? plan.aiDailyCredits : (plan?.aiCredits || 0)
});

export const getCompanyAiSettings = async (companyId: number) => {
  const company = await loadCompanyWithPlan(companyId);
  const preferredProviderSetting = await getProviderSetting(companyId, "aiProvider");
  const ownOpenAiKey = await getProviderSetting(companyId, AI_KEY_SETTING_MAP.openai);
  const ownGeminiKey = await getProviderSetting(companyId, AI_KEY_SETTING_MAP.gemini);
  const creditInfo = await getCreditInfo(companyId);

  return {
    company,
    plan: company.plan || null,
    companyId,
    usageMode: resolveCompanyUsageMode(company),
    preferredProvider: normalizeProvider(
      preferredProviderSetting || company.aiPreferredProvider || DEFAULT_SYSTEM_PROVIDER
    ),
    ownKeys: {
      openai: ownOpenAiKey,
      gemini: ownGeminiKey
    },
    maskedKeys: {
      openai: getMaskedSecret(ownOpenAiKey),
      gemini: getMaskedSecret(ownGeminiKey)
    },
    creditInfo,
    planInfo: getPlanAiSnapshot(company.plan)
  };
};

export const assertAiFeatureAccess = async (
  companyId: number,
  feature: "general" | "agent" = "general"
) => {
  const company = await loadCompanyWithPlan(companyId);
  const planInfo = getPlanAiSnapshot(company.plan);

  if (!planInfo.aiEnabled) {
    throw new AppError("Seu plano não possui acesso ao módulo de IA.", 403);
  }

  if (feature === "agent" && !planInfo.aiAgentEnabled) {
    throw new AppError("Seu plano não possui acesso a agentes de IA.", 403);
  }

  return { company, plan: company.plan || null, planInfo };
};

export const resolveAIProviderConfig = async ({
  companyId,
  provider,
  promptId = null,
  promptUsageMode = "company_default",
  requestType = "agent"
}: ResolveConfigParams): Promise<ResolvedAIConfig> => {
  const { company, planInfo } = await assertAiFeatureAccess(
    companyId,
    requestType === "crm_assistant" ? "general" : "agent"
  );
  const selectedProvider = normalizeProvider(provider || company.aiPreferredProvider);
  const usageMode = resolveUsageMode(company, promptUsageMode);
  const creditInfo = await getCreditInfo(companyId);

  if (usageMode === "system" && planInfo.aiDailyCredits > 0 && !creditInfo.hasCredits) {
    throw new AppError("NO_CREDITS", 402);
  }

  if (usageMode === "own") {
    const ownKey = await getProviderSetting(companyId, AI_KEY_SETTING_MAP[selectedProvider]);
    if (!ownKey) {
      throw new AppError(
        `Nenhuma chave ${selectedProvider === "gemini" ? "Google Gemini" : "OpenAI"} foi configurada para esta empresa.`,
        503
      );
    }

    return {
      provider: selectedProvider,
      usageMode,
      apiKey: ownKey,
      shouldConsumeCredits: false,
      creditInfo,
      plan: company.plan || null,
      company
    };
  }

  const systemSettingCompanyId = 1;
  const systemKey =
    (await getProviderSetting(systemSettingCompanyId, AI_KEY_SETTING_MAP[selectedProvider])) ||
    (selectedProvider === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY);

  if (!systemKey) {
    throw new AppError(
      `Nenhuma chave de sistema ${selectedProvider === "gemini" ? "Google Gemini" : "OpenAI"} foi configurada.`,
      503
    );
  }

  return {
    provider: selectedProvider,
    usageMode,
    apiKey: systemKey,
    shouldConsumeCredits: true,
    creditInfo,
    plan: company.plan || null,
    company
  };
};

export const registerAIUsage = async ({
  companyId,
  provider,
  usageMode,
  requestType,
  promptId = null,
  model = null,
  status,
  errorCode = null,
  creditsConsumed = 0,
  metadata = {}
}: LogUsageParams): Promise<void> => {
  await AIUsageLog.create({
    companyId,
    promptId,
    provider,
    usageMode,
    requestType,
    model,
    status,
    errorCode,
    creditsConsumed,
    metadata
  }).catch(() => undefined);
};

export const finalizeAIUsage = async ({
  companyId,
  provider,
  usageMode,
  requestType,
  promptId = null,
  model = null,
  status,
  errorCode = null,
  metadata = {}
}: Omit<LogUsageParams, "creditsConsumed">) => {
  let creditsConsumed = 0;

  if (status === "success" && usageMode === "system") {
    await consumeCredit(companyId);
    creditsConsumed = 1;
  }

  await registerAIUsage({
    companyId,
    provider,
    usageMode,
    requestType,
    promptId,
    model,
    status,
    errorCode,
    creditsConsumed,
    metadata
  });

  return getCreditInfo(companyId);
};

export const buildPromptRuntimeConfig = async (prompt: Prompt, companyId: number) => {
  const resolved = await resolveAIProviderConfig({
    companyId,
    provider: prompt.provider,
    promptUsageMode: (prompt.aiUsageMode as PromptUsageMode) || "company_default",
    promptId: prompt.id,
    requestType: "agent",
    model: prompt.model
  });

  return {
    provider: prompt.provider || resolved.provider,
    apiKey: resolved.apiKey,
    usageMode: resolved.usageMode,
    shouldConsumeCredits: resolved.shouldConsumeCredits,
    creditInfo: resolved.creditInfo
  };
};

export const upsertCompanyAiSetting = async (
  companyId: number,
  key: string,
  value?: string | null
) => {
  const normalizedValue = value?.trim() || "";
  const setting = await Setting.findOne({ where: { companyId, key } });

  if (setting) {
    await setting.update({ value: normalizedValue });
    return setting;
  }

  return Setting.create({
    companyId,
    key,
    value: normalizedValue
  });
};

export const getPromptSafeResponse = (prompt: Prompt) => {
  const payload = prompt.toJSON() as Record<string, any>;
  payload.apiKey = "";
  payload.hasLegacyApiKey = Boolean(prompt.getDataValue("apiKey"));
  return payload;
};
