import {
  finalizeAIUsage,
  getCompanyAiSettings,
  resolveAIProviderConfig
} from "../AIProviderService/AIProviderService";
import { getCreditInfo } from "../AiCreditService/AiCreditService";
import AppError from "../../errors/AppError";
import logger from "../../utils/logger";

export interface VariationResult {
  message: string | null;
  reason: "ok" | "no_credits" | "error";
}

const CAMPAIGN_AI_SYSTEM_PROMPT = `Você é um assistente especializado em marketing conversacional para WhatsApp.

Sua tarefa é criar variações de uma mensagem comercial fornecida pelo usuário.

Regras obrigatórias:
- Preserve o contexto e a intenção da mensagem original
- Não invente preços, promoções ou promessas que não estejam na mensagem base
- Não use linguagem agressiva, spam ou enganosa
- Preserve EXATAMENTE todas as variáveis dinâmicas presentes na mensagem, como {{ms}}, {{firstName}}, {{name}}, {{number}}, {{email}}, {{date}}, {{hour}} — nunca as remova ou altere
- Mantenha as mensagens curtas, adequadas para WhatsApp (máximo 300 caracteres cada)
- Varie estrutura, palavras, tom e chamada para ação
- Retorne SOMENTE um array JSON com as variações, sem nenhum texto adicional
- Formato exato: ["mensagem1", "mensagem2", "mensagem3", "mensagem4", "mensagem5"]`;

export const generateCampaignVariations = async (
  baseMessage: string,
  quantity: number,
  companyId: number
): Promise<string[]> => {
  const safeQuantity = Math.min(Math.max(1, quantity), 5);

  const creditInfo = await getCreditInfo(companyId);
  if (!creditInfo.hasCredits) {
    throw new AppError("NO_CREDITS", 402);
  }

  const companyAiSettings = await getCompanyAiSettings(companyId);
  let resolvedConfig: Awaited<ReturnType<typeof resolveAIProviderConfig>> | null = null;
  let variations: string[] = [];

  try {
    resolvedConfig = await resolveAIProviderConfig({
      companyId,
      provider: companyAiSettings.preferredProvider,
      requestType: "crm_assistant"
    });

    const userPrompt = `Crie ${safeQuantity} variações diferentes da mensagem abaixo para uma campanha de WhatsApp. Retorne SOMENTE o array JSON.\n\nMensagem base:\n"${baseMessage}"`;

    if (resolvedConfig.provider === "gemini") {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(resolvedConfig.apiKey);
      const model = genAI.getGenerativeModel({ model: resolvedConfig.model || "gemini-2.0-flash" });
      const result = await model.generateContent(
        `${CAMPAIGN_AI_SYSTEM_PROMPT}\n\n${userPrompt}`
      );
      const text = result.response.text().trim();
      variations = parseVariationsResponse(text, safeQuantity);
    } else {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: resolvedConfig.apiKey,
        baseURL:
          resolvedConfig.provider === "openrouter"
            ? "https://openrouter.ai/api/v1"
            : undefined,
        defaultHeaders:
          resolvedConfig.provider === "openrouter"
            ? {
                "HTTP-Referer": process.env.FRONTEND_URL || "https://atendzappy.com",
                "X-Title": "AtendZappy Campaign"
              }
            : undefined
      });

      const completion = await openai.chat.completions.create({
        model:
          resolvedConfig.provider === "openrouter"
            ? "deepseek/deepseek-chat-v3.1:free"
            : resolvedConfig.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: CAMPAIGN_AI_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.85,
        max_tokens: 800
      });

      const text = (completion.choices[0]?.message?.content || "").trim();
      variations = parseVariationsResponse(text, safeQuantity);
    }

    await finalizeAIUsage({
      companyId,
      provider: resolvedConfig.provider,
      usageMode: resolvedConfig.usageMode,
      requestType: "crm_assistant",
      status: "success"
    });

    return variations;
  } catch (err: any) {
    if (resolvedConfig) {
      await finalizeAIUsage({
        companyId,
        provider: resolvedConfig.provider,
        usageMode: resolvedConfig.usageMode,
        requestType: "crm_assistant",
        status: "error",
        errorCode: err?.message || "unknown"
      }).catch(() => undefined);
    }

    if (err instanceof AppError) throw err;
    logger.error(`[CampaignAI] generateVariations error: ${err.message}`);
    throw new AppError("Falha ao gerar variações com IA. Tente novamente.", 500);
  }
};

const parseVariationsResponse = (text: string, quantity: number): string[] => {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .slice(0, quantity)
          .map((v: any) => String(v || "").trim())
          .filter(Boolean);
      }
    }
  } catch {
    // fall through to line-based parse
  }

  return text
    .split("\n")
    .map(line => line.replace(/^[\d\.\-\*\s"]+/, "").replace(/[",]$/, "").trim())
    .filter(Boolean)
    .slice(0, quantity);
};

export const generateSingleVariation = async (
  message: string,
  companyId: number
): Promise<VariationResult> => {
  const creditInfo = await getCreditInfo(companyId);
  if (!creditInfo.hasCredits) {
    return { message: null, reason: "no_credits" };
  }

  const companyAiSettings = await getCompanyAiSettings(companyId);
  let resolvedConfig: Awaited<ReturnType<typeof resolveAIProviderConfig>> | null = null;

  try {
    resolvedConfig = await resolveAIProviderConfig({
      companyId,
      provider: companyAiSettings.preferredProvider,
      requestType: "crm_assistant"
    });

    const prompt = `Você recebe uma mensagem de WhatsApp que pode conter variáveis dinâmicas (ex: {{ms}}, {{firstName}}, {{name}}, {{number}}, {{email}}, {{date}}, {{hour}}). Crie UMA variação preservando EXATAMENTE todas as variáveis {{...}} encontradas. Varie a estrutura, o tom e as palavras. Retorne SOMENTE a mensagem variada, sem explicações.\n\nMensagem: "${message}"`;

    let variation = "";

    if (resolvedConfig.provider === "gemini") {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(resolvedConfig.apiKey);
      const model = genAI.getGenerativeModel({ model: resolvedConfig.model || "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      variation = result.response.text().trim();
    } else {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: resolvedConfig.apiKey,
        baseURL:
          resolvedConfig.provider === "openrouter"
            ? "https://openrouter.ai/api/v1"
            : undefined
      });

      const completion = await openai.chat.completions.create({
        model: resolvedConfig.model || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente de copywriting para WhatsApp. Preserve EXATAMENTE todas as variáveis {{...}} da mensagem original. Responda APENAS com a mensagem variada, sem explicações."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 300
      });

      variation = (completion.choices[0]?.message?.content || "").trim();
    }

    await finalizeAIUsage({
      companyId,
      provider: resolvedConfig.provider,
      usageMode: resolvedConfig.usageMode,
      requestType: "crm_assistant",
      status: "success"
    });

    return { message: variation || null, reason: "ok" };
  } catch (err: any) {
    if (resolvedConfig) {
      await finalizeAIUsage({
        companyId,
        provider: resolvedConfig.provider,
        usageMode: resolvedConfig.usageMode,
        requestType: "crm_assistant",
        status: "error",
        errorCode: err?.message || "unknown"
      }).catch(() => undefined);
    }
    logger.warn(`[CampaignAI] generateSingleVariation error: ${err.message}`);
    return { message: null, reason: "error" };
  }
};
