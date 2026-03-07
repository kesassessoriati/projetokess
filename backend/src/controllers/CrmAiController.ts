// @ts-nocheck
import { Request, Response } from "express";
import { getCreditInfo, consumeCredit } from "../services/AiCreditService/AiCreditService";
import Setting from "../models/Setting";
import CrmLead from "../models/CrmLead";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import { Op } from "sequelize";

// Cascade: own company key → superadmin (company 1) key → env var
const getSettingCascade = async (companyId: number, key: string, envFallback?: string): Promise<string | null> => {
  const own = await Setting.findOne({ where: { companyId, key } }).catch(() => null);
  if (own?.value) return own.value;
  if (companyId !== 1) {
    const global = await Setting.findOne({ where: { companyId: 1, key } }).catch(() => null);
    if (global?.value) return global.value;
  }
  return envFallback || null;
};

const getOpenAiKey = async (companyId: number): Promise<string | null> =>
  getSettingCascade(companyId, "openaiApiKey", process.env.OPENAI_API_KEY);

const getGeminiKey = async (companyId: number): Promise<string | null> =>
  getSettingCascade(companyId, "geminiApiKey", process.env.GEMINI_API_KEY);

const getPreferredProvider = async (companyId: number): Promise<string> =>
  (await getSettingCascade(companyId, "aiProvider")) || "openai";

const buildCrmContext = async (companyId: number): Promise<string> => {
  try {
    const pipelines = await Pipeline.findAll({
      where: { companyId },
      include: [{ model: PipelineStage, as: "stages" }],
    }).catch(() => []);

    const leads = await CrmLead.findAll({
      where: { companyId },
      attributes: ["id", "name", "status", "value", "stageId", "createdAt", "updatedAt"],
      limit: 200,
    }).catch(() => []);

    const totalLeads = leads.length;
    const openLeads = leads.filter((l: any) => l.status === "open").length;
    const wonLeads = leads.filter((l: any) => l.status === "won").length;
    const lostLeads = leads.filter((l: any) => l.status === "lost").length;
    const totalValue = leads.reduce((sum: number, l: any) => sum + (Number(l.value) || 0), 0);
    const wonValue = leads.filter((l: any) => l.status === "won").reduce((sum: number, l: any) => sum + (Number(l.value) || 0), 0);

    // SLA check: leads open for more than 3 days without update
    const now = Date.now();
    const slaDelayed = leads.filter((l: any) => {
      if (l.status !== "open") return false;
      const lastUpdate = new Date(l.updatedAt).getTime();
      return (now - lastUpdate) > 3 * 24 * 60 * 60 * 1000;
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
    const info = await getCreditInfo(companyId);
    return res.status(200).json(info);
  } catch (err) {
    return res.status(500).json({ error: "Erro ao consultar créditos" });
  }
};

export const chat = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { message } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Mensagem inválida" });
  }

  // Check credits
  const creditInfo = await getCreditInfo(companyId);
  if (creditInfo.allowed > 0 && !creditInfo.hasCredits) {
    return res.status(402).json({
      error: "NO_CREDITS",
      message: "Créditos de IA insuficientes. Contate o administrador.",
      creditInfo,
    });
  }

  const crmContext = await buildCrmContext(companyId);
  const provider = await getPreferredProvider(companyId);

  const systemPrompt = `Você é o Assistente CRM IA, um especialista em vendas e gestão de pipeline integrado ao sistema AtendZappy.
Responda de forma objetiva, prática e em português brasileiro.
Use os dados do CRM abaixo para contextualizar suas respostas.
Ofereça insights acionáveis e dicas de vendas baseadas nos dados disponíveis.
Seja direto e evite respostas genéricas.

${crmContext}`;

  let reply = "";

  try {
    if (provider === "gemini") {
      const geminiKey = await getGeminiKey(companyId);
      if (!geminiKey) throw new Error("Chave Gemini não configurada");

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(`${systemPrompt}\n\nUsuário: ${message}`);
      reply = result.response.text();
    } else {
      const openAiKey = await getOpenAiKey(companyId);
      if (!openAiKey) throw new Error("Chave OpenAI não configurada");

      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: openAiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 600,
      });
      reply = completion.choices[0]?.message?.content || "Sem resposta";
    }

    // Consume credit only on successful response
    await consumeCredit(companyId).catch(() => { });
    const newCreditInfo = await getCreditInfo(companyId);

    return res.status(200).json({ reply, creditInfo: newCreditInfo });
  } catch (err: any) {
    if (err.message === "NO_CREDITS") {
      return res.status(402).json({ error: "NO_CREDITS", message: "Créditos insuficientes" });
    }

    // OpenAI / Gemini API errors have .status property
    const apiStatus = err?.status || err?.response?.status || err?.code;
    const apiMessage = err?.message || err?.error?.message || "";

    console.error("[CrmAI] Error:", apiMessage, "status:", apiStatus);

    if (apiStatus === 429 || apiMessage.includes("429") || apiMessage.includes("quota") || apiMessage.includes("exceeded")) {
      return res.status(429).json({
        error: "QUOTA_EXCEEDED",
        message: "Cota da API de IA esgotada. Verifique o plano e cobrança da sua chave de API no painel da OpenAI/Gemini.",
      });
    }

    if (apiStatus === 401 || apiMessage.includes("401") || apiMessage.includes("Incorrect API key") || apiMessage.includes("invalid_api_key")) {
      return res.status(401).json({
        error: "INVALID_KEY",
        message: "Chave de API inválida. Verifique as configurações em Whitelabel.",
      });
    }

    if (apiMessage.includes("não configurada") || apiMessage.includes("not configured")) {
      return res.status(503).json({
        error: "NO_API_KEY",
        message: "Nenhuma chave de API de IA configurada. Acesse Configurações → Whitelabel para configurar.",
      });
    }

    return res.status(500).json({ error: "Erro ao processar mensagem: " + (apiMessage || "erro desconhecido") });
  }
};
