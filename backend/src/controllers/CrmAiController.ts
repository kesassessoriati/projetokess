// @ts-nocheck
import { Request, Response } from "express";
import Setting from "../models/Setting";
import CrmLead from "../models/CrmLead";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import {
  finalizeAIUsage,
  getCompanyAiSettings,
  resolveAIProviderConfig
} from "../services/AIProviderService/AIProviderService";

const getSettingCascade = async (
  companyId: number,
  key: string,
  envFallback?: string
): Promise<string | null> => {
  const own = await Setting.findOne({ where: { companyId, key } }).catch(() => null);
  if (own?.value) return own.value;
  if (companyId !== 1) {
    const global = await Setting.findOne({ where: { companyId: 1, key } }).catch(() => null);
    if (global?.value) return global.value;
  }
  return envFallback || null;
};

const getCrmAiSystemPrompt = async (companyId: number): Promise<string> => {
  const custom = await getSettingCascade(companyId, "crmAiSystemPrompt");
  if (custom && custom.trim()) return custom.trim();
  return `Você é o Assistente CRM IA, um especialista em vendas e gestão de pipeline.
Responda de forma objetiva, prática e em português brasileiro.
Use os dados do CRM abaixo para contextualizar suas respostas.
Ofereça insights acionáveis e dicas de vendas baseadas nos dados disponíveis.
Seja direto e evite respostas genéricas.`;
};

const buildCrmContext = async (companyId: number): Promise<string> => {
  try {
    const pipelines = await Pipeline.findAll({
      where: { companyId },
      include: [{ model: PipelineStage, as: "stages" }]
    }).catch(() => []);

    const leads = await CrmLead.findAll({
      where: { companyId },
      attributes: ["id", "name", "status", "value", "stageId", "createdAt", "updatedAt"],
      limit: 200
    }).catch(() => []);

    const totalLeads = leads.length;
    const openLeads = leads.filter((l: any) => l.status === "open").length;
    const wonLeads = leads.filter((l: any) => l.status === "won").length;
    const lostLeads = leads.filter((l: any) => l.status === "lost").length;
    const totalValue = leads.reduce((sum: number, l: any) => sum + (Number(l.value) || 0), 0);
    const wonValue = leads
      .filter((l: any) => l.status === "won")
      .reduce((sum: number, l: any) => sum + (Number(l.value) || 0), 0);

    const now = Date.now();
    const slaDelayed = leads.filter((l: any) => {
      if (l.status !== "open") return false;
      const lastUpdate = new Date(l.updatedAt).getTime();
      return now - lastUpdate > 3 * 24 * 60 * 60 * 1000;
    }).length;

    const pipelineNames = pipelines.map((p: any) => p.name).join(", ");

    return `
Contexto do CRM:
- Pipelines ativos: ${pipelines.length} (${pipelineNames || "nenhum"})
- Total de leads: ${totalLeads}
- Leads abertos: ${openLeads}
- Leads ganhos: ${wonLeads}
- Leads perdidos: ${lostLeads}
- Valor total em pipeline: R$ ${totalValue.toFixed(2)}
- Valor convertido (ganhos): R$ ${wonValue.toFixed(2)}
- Leads com SLA atrasado (sem atualização há +3 dias): ${slaDelayed}
- Taxa de conversão: ${totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0}%
`;
  } catch {
    return "Contexto do CRM indisponível no momento.";
  }
};

export const credits = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  try {
    const info = await getCompanyAiSettings(companyId);
    return res.status(200).json({
      ...info.creditInfo,
      usageMode: info.usageMode,
      preferredProvider: info.preferredProvider,
      planInfo: info.planInfo
    });
  } catch {
    return res.status(500).json({ error: "Erro ao consultar créditos" });
  }
};

export const chat = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { message } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Mensagem inválida" });
  }

  const companyAiSettings = await getCompanyAiSettings(companyId);
  const crmContext = await buildCrmContext(companyId);
  const basePrompt = await getCrmAiSystemPrompt(companyId);
  const systemPrompt = `${basePrompt}\n\n${crmContext}`;

  let reply = "";
  let resolvedConfig: Awaited<ReturnType<typeof resolveAIProviderConfig>> | null = null;

  try {
    resolvedConfig = await resolveAIProviderConfig({
      companyId,
      provider: companyAiSettings.preferredProvider,
      requestType: "crm_assistant"
    });

    if (resolvedConfig.provider === "gemini") {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(resolvedConfig.apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(`${systemPrompt}\n\nUsuÃ¡rio: ${message}`);
      reply = result.response.text();
    } else {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: resolvedConfig.apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 600
      });
      reply = completion.choices[0]?.message?.content || "Sem resposta";
    }

    const newCreditInfo = await finalizeAIUsage({
      companyId,
      provider: resolvedConfig.provider,
      usageMode: resolvedConfig.usageMode,
      requestType: "crm_assistant",
      model: resolvedConfig.provider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini",
      status: "success",
      metadata: { messageLength: message.length }
    });

    return res.status(200).json({ reply, creditInfo: newCreditInfo });
  } catch (err: any) {
    const apiStatus = err?.status || err?.response?.status || err?.code || err?.statusCode;
    const apiMessage = err?.message || err?.error?.message || "";

    if (resolvedConfig) {
      await finalizeAIUsage({
        companyId,
        provider: resolvedConfig.provider,
        usageMode: resolvedConfig.usageMode,
        requestType: "crm_assistant",
        model: resolvedConfig.provider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini",
        status: "error",
        errorCode: apiStatus ? String(apiStatus) : "provider_error",
        metadata: { messageLength: message.length, apiMessage }
      }).catch(() => undefined);
    }

    if (err.statusCode === 402 || apiMessage === "NO_CREDITS") {
      return res.status(402).json({
        error: "NO_CREDITS",
        message: "Créditos de IA insuficientes. Contate o administrador.",
        creditInfo: companyAiSettings.creditInfo
      });
    }

    if (apiStatus === 429 || apiMessage.includes("429") || apiMessage.includes("quota") || apiMessage.includes("exceeded")) {
      return res.status(429).json({
        error: "QUOTA_EXCEEDED",
        message: `Cota esgotada ou limite de taxa atingido na API (${companyAiSettings.preferredProvider === "gemini" ? "Google Gemini" : "OpenAI"}). Verifique seu saldo/plano na plataforma da IA.`
      });
    }

    if (apiStatus === 401 || apiMessage.includes("401") || apiMessage.includes("Incorrect API key") || apiMessage.includes("invalid_api_key")) {
      return res.status(401).json({
        error: "INVALID_KEY",
        message: "Chave de API inválida. Revise a configuração de IA da empresa."
      });
    }

    if (apiMessage.includes("configurada") || apiMessage.includes("configurada.")) {
      return res.status(503).json({
        error: "NO_API_KEY",
        message: "Nenhuma chave de IA disponível para este provedor."
      });
    }

    console.error(`[CrmAI] Provider: ${companyAiSettings.preferredProvider} | Error:`, apiMessage, "status:", apiStatus, err);
    return res.status(500).json({ error: "Erro ao processar mensagem: " + (apiMessage || "erro desconhecido") });
  }
};
