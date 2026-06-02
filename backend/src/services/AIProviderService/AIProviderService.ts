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
export type AIProviderName = "openai" | "gemini" | "openrouter" | "groq";

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
  model: string;
  usageMode: AIUsageMode;
  apiKey: string;
  shouldConsumeCredits: boolean;
  creditInfo: CreditInfo;
  plan: Plan | null;
  company: Company;
}

const AI_KEY_SETTING_MAP: Record<AIProviderName, string> = {
  openai: "openaiApiKey",
  gemini: "geminiApiKey",
  openrouter: "openrouterApiKey",
  groq: "groqApiKey"
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
  if (provider === "gemini" || provider === "openrouter" || provider === "groq") return provider;
  return "openai";
};

export const getProviderDisplayName = (provider?: string | null): string => {
  if (provider === "gemini") return "Google Gemini";
  if (provider === "openrouter") return "OpenRouter";
  if (provider === "groq") return "Groq";
  return "OpenAI";
};

const getEnvKeyForProvider = (provider: AIProviderName): string | undefined => {
  if (provider === "gemini") return process.env.GEMINI_API_KEY;
  if (provider === "openrouter") return process.env.OPENROUTER_API_KEY;
  if (provider === "groq") return process.env.GROQ_API_KEY;
  return process.env.OPENAI_API_KEY;
};

// Carrega a configuração padrão definida pelo SuperAdmin para os agentes de atendimento interno.
// Esses valores não são acessíveis pelo usuário final — são 100% server-side.
const getAttendanceAiConfig = async (): Promise<{
  primaryProvider: AIProviderName;
  primaryModel: string;
  fallbackProvider: AIProviderName | null;
  fallbackModel: string;
  strategy: string;
}> => {
  const primary = await getProviderSetting(SYSTEM_COMPANY_ID, "attendanceAiPrimaryProvider");
  const primaryModel = (await getProviderSetting(SYSTEM_COMPANY_ID, "attendanceAiPrimaryModel")) || "";
  const fallbackRaw = await getProviderSetting(SYSTEM_COMPANY_ID, "attendanceAiFallbackProvider");
  const fallbackModel = (await getProviderSetting(SYSTEM_COMPANY_ID, "attendanceAiFallbackModel")) || "";
  const strategy = (await getProviderSetting(SYSTEM_COMPANY_ID, "attendanceAiStrategy")) || "primary_only";
  return {
    primaryProvider: normalizeProvider(primary),
    primaryModel,
    fallbackProvider: fallbackRaw ? normalizeProvider(fallbackRaw) : null,
    fallbackModel,
    strategy,
  };
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

const SYSTEM_COMPANY_ID = 1;

export const getCompanyAiSettings = async (companyId: number) => {
  const company = await loadCompanyWithPlan(companyId);

  // Cascade: if the company has no own aiProvider setting, fall back to the system (companyId=1) setting
  const ownProviderSetting = await getProviderSetting(companyId, "aiProvider");
  const systemProviderSetting = companyId !== SYSTEM_COMPANY_ID
    ? await getProviderSetting(SYSTEM_COMPANY_ID, "aiProvider")
    : null;
  const preferredProviderSetting = ownProviderSetting || systemProviderSetting;

  const ownOpenAiKey = await getProviderSetting(companyId, AI_KEY_SETTING_MAP.openai);
  const ownGeminiKey = await getProviderSetting(companyId, AI_KEY_SETTING_MAP.gemini);
  const ownOpenRouterKey = await getProviderSetting(companyId, AI_KEY_SETTING_MAP.openrouter);
  const ownGroqKey = await getProviderSetting(companyId, AI_KEY_SETTING_MAP.groq);
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
      gemini: ownGeminiKey,
      openrouter: ownOpenRouterKey,
      groq: ownGroqKey
    },
    maskedKeys: {
      openai: getMaskedSecret(ownOpenAiKey),
      gemini: getMaskedSecret(ownGeminiKey),
      openrouter: getMaskedSecret(ownOpenRouterKey),
      groq: getMaskedSecret(ownGroqKey)
    },
    creditInfo,
    planInfo: getPlanAiSnapshot(company.plan)
  };
};

export const assertAiFeatureAccess = async (
  companyId: number,
  feature: "general" | "agent" | "external_agent" = "general"
) => {
  const company = await loadCompanyWithPlan(companyId);
  const planInfo = getPlanAiSnapshot(company.plan);

  if (!planInfo.aiEnabled) {
    throw new AppError("Seu plano não possui acesso ao módulo de IA.", 403);
  }

  if (feature === "agent" && !planInfo.aiAgentEnabled) {
    throw new AppError("Seu plano não possui acesso a agentes de IA internos.", 403);
  }

  if (feature === "external_agent") {
    if (!planInfo.aiAgentEnabled) {
      throw new AppError("Seu plano não possui acesso ao módulo de agentes de IA.", 403);
    }
    const aiExternalAgentEnabled = typeof company.plan?.aiExternalAgentEnabled === "boolean"
      ? company.plan.aiExternalAgentEnabled
      : true;
    if (!aiExternalAgentEnabled) {
      throw new AppError("Seu plano não possui acesso a agentes externos N8N.", 403);
    }
  }

  return { company, plan: company.plan || null, planInfo };
};

export const resolveAIProviderConfig = async ({
  companyId,
  provider,
  promptId = null,
  promptUsageMode = "company_default",
  requestType = "agent",
  model = null
}: ResolveConfigParams): Promise<ResolvedAIConfig> => {
  const featureToCheck = requestType === "crm_assistant"
    ? "general"
    : requestType === "external_agent"
      ? "external_agent"
      : "agent";

  const { company, planInfo } = await assertAiFeatureAccess(companyId, featureToCheck);

  const usageMode = resolveUsageMode(company, promptUsageMode);
  const creditInfo = await getCreditInfo(companyId);

  if (usageMode === "system" && planInfo.aiDailyCredits > 0 && !creditInfo.hasCredits) {
    throw new AppError("NO_CREDITS", 402);
  }

  // When using system credits for internal attendance agents:
  // ALWAYS use the SuperAdmin-configured attendance provider/model.
  // The frontend-provided provider/model is IGNORED to prevent client-side manipulation.
  if (usageMode === "system" && requestType === "agent") {
    const attendanceConfig = await getAttendanceAiConfig();
    const resolvedProvider = attendanceConfig.primaryProvider;
    const systemKey =
      (await getProviderSetting(SYSTEM_COMPANY_ID, AI_KEY_SETTING_MAP[resolvedProvider])) ||
      getEnvKeyForProvider(resolvedProvider);

    if (!systemKey) {
      throw new AppError(
        `Nenhuma chave de sistema ${getProviderDisplayName(resolvedProvider)} configurada para agentes de atendimento.`,
        503
      );
    }

    return {
      provider: resolvedProvider,
      model: attendanceConfig.primaryModel,
      usageMode,
      apiKey: systemKey,
      shouldConsumeCredits: true,
      creditInfo,
      plan: company.plan || null,
      company
    };
  }

  // Cascade provider for non-agent or own-key scenarios:
  // frontend provider → company setting → system (companyId=1) setting → company column → global default
  const companyProviderSetting = await getProviderSetting(companyId, "aiProvider");
  const systemProviderSetting = companyId !== SYSTEM_COMPANY_ID
    ? await getProviderSetting(SYSTEM_COMPANY_ID, "aiProvider")
    : null;
  const selectedProvider = normalizeProvider(
    provider || companyProviderSetting || systemProviderSetting || company.aiPreferredProvider
  );

  if (usageMode === "own") {
    const ownKey = await getProviderSetting(companyId, AI_KEY_SETTING_MAP[selectedProvider]);
    if (!ownKey) {
      throw new AppError(
        `Nenhuma chave ${getProviderDisplayName(selectedProvider)} foi configurada para esta empresa.`,
        503
      );
    }

    return {
      provider: selectedProvider,
      model: model || "",
      usageMode,
      apiKey: ownKey,
      shouldConsumeCredits: false,
      creditInfo,
      plan: company.plan || null,
      company
    };
  }

  const systemKey =
    (await getProviderSetting(SYSTEM_COMPANY_ID, AI_KEY_SETTING_MAP[selectedProvider])) ||
    getEnvKeyForProvider(selectedProvider);

  if (systemKey) {
    return {
      provider: selectedProvider,
      model: model || "",
      usageMode,
      apiKey: systemKey,
      shouldConsumeCredits: true,
      creditInfo,
      plan: company.plan || null,
      company
    };
  }

  // Fallback: if company saved their own key but aiUsageMode was never switched to "own",
  // use the company key transparently so the assistant works regardless of mode configuration.
  if (companyId !== SYSTEM_COMPANY_ID) {
    const ownKeyFallback = await getProviderSetting(companyId, AI_KEY_SETTING_MAP[selectedProvider]);
    if (ownKeyFallback) {
      return {
        provider: selectedProvider,
        model: model || "",
        usageMode: "own",
        apiKey: ownKeyFallback,
        shouldConsumeCredits: false,
        creditInfo,
        plan: company.plan || null,
        company
      };
    }
  }

  throw new AppError(
    `Nenhuma chave de sistema ${getProviderDisplayName(selectedProvider)} foi configurada.`,
    503
  );
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
  // Note: when usageMode === "system", resolveAIProviderConfig ignores prompt.provider/model
  // and uses the SuperAdmin attendance config instead. This is enforced server-side.
  const resolved = await resolveAIProviderConfig({
    companyId,
    provider: prompt.provider,
    promptUsageMode: (prompt.aiUsageMode as PromptUsageMode) || "company_default",
    promptId: prompt.id,
    requestType: "agent",
    model: prompt.model
  });

  return {
    // For system mode: resolved.provider = attendanceAiPrimaryProvider (SuperAdmin-controlled)
    // For own mode: resolved.provider = prompt.provider (company-configured)
    provider: resolved.provider,
    model: resolved.model,
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
