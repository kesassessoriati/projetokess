// @ts-nocheck
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import formatBody from "../../helpers/Mustache";
import {
  finalizeAIUsage,
  resolveAIProviderConfig
} from "../AIProviderService/AIProviderService";

const sanitizeText = (value?: string | null) => String(value || "").trim();

const buildFallbackMessage = ({
  campaign,
  stage,
  ticket,
  latestInboundMessage,
  triggerMessage
}) => {
  const baseMessage =
    sanitizeText(stage?.message) ||
    sanitizeText(stage?.mediaCaption) ||
    sanitizeText(campaign?.recoveryInstruction) ||
    "Oi, {{firstName}}. Passei para retomar nossa conversa e entender se faz sentido seguirmos daqui.";

  return formatBody(baseMessage, ticket, {
    lastMessage: sanitizeText(latestInboundMessage?.body),
    lastOutboundMessage: sanitizeText(triggerMessage?.body),
    funnelStage: sanitizeText(ticket?.crmLead?.stage?.name),
    pipelineName: sanitizeText(ticket?.crmLead?.pipeline?.name),
    leadName: sanitizeText(ticket?.crmLead?.name),
    contactNumber: sanitizeText(ticket?.contact?.number)
  });
};

const buildAiPrompt = ({
  campaign,
  stage,
  ticket,
  latestInboundMessage,
  triggerMessage,
  fallbackMessage
}) => {
  const contactName = sanitizeText(ticket?.contact?.name || ticket?.crmLead?.name);
  const companyName = sanitizeText(ticket?.company?.name);
  const stageName = sanitizeText(ticket?.crmLead?.stage?.name);
  const pipelineName = sanitizeText(ticket?.crmLead?.pipeline?.name);

  return [
    "Voce e um especialista em recuperacao de conversa no WhatsApp.",
    "Gere uma unica mensagem curta, humana, consultiva e pronta para envio.",
    "Mantenha tom cordial, profissional e natural.",
    "Nao use markdown, listas, aspas ou explicacoes extras.",
    "Nao invente informacoes que nao estejam no contexto.",
    "Se o contato parece frio, reengaje com leveza.",
    "Se houver contexto de compra ou proposta, puxe esse contexto.",
    `Empresa: ${companyName || "Nao informada"}`,
    `Contato: ${contactName || "Nao informado"}`,
    `Pipeline atual: ${pipelineName || "Nao informado"}`,
    `Etapa atual: ${stageName || "Nao informada"}`,
    `Instrucao da campanha: ${sanitizeText(campaign?.recoveryInstruction) || "Retomar a conversa sem parecer robo."}`,
    `Template base do estagio: ${sanitizeText(stage?.message) || fallbackMessage}`,
    `Ultima mensagem da empresa: ${sanitizeText(triggerMessage?.body) || "Nao informada"}`,
    `Ultima mensagem do contato: ${sanitizeText(latestInboundMessage?.body) || "Sem resposta do contato"}`,
    `Mensagem de fallback pronta: ${fallbackMessage}`
  ].join("\n");
};

const createAiMessage = async ({
  resolvedConfig,
  prompt
}) => {
  if (resolvedConfig.provider === "gemini") {
    const genAI = new GoogleGenerativeAI(resolvedConfig.apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    return result?.response?.text?.() || "";
  }

  const openai = new OpenAI({ apiKey: resolvedConfig.apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: "Responda com uma unica mensagem curta para WhatsApp, pronta para colar e enviar."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return completion?.choices?.[0]?.message?.content || "";
};

const buildSmartFollowUpMessageService = async ({
  companyId,
  campaign,
  stage,
  ticket,
  latestInboundMessage,
  triggerMessage
}) => {
  const fallbackMessage = buildFallbackMessage({
    campaign,
    stage,
    ticket,
    latestInboundMessage,
    triggerMessage
  });

  const shouldUseAi = Boolean(campaign?.aiEnabled || stage?.useAiRewrite);
  if (!shouldUseAi) {
    return fallbackMessage;
  }

  let resolvedConfig = null;
  try {
    resolvedConfig = await resolveAIProviderConfig({
      companyId,
      requestType: "crm_assistant"
    });

    const aiPrompt = buildAiPrompt({
      campaign,
      stage,
      ticket,
      latestInboundMessage,
      triggerMessage,
      fallbackMessage
    });

    const text = sanitizeText(
      await createAiMessage({
        resolvedConfig,
        prompt: aiPrompt
      })
    );

    await finalizeAIUsage({
      companyId,
      provider: resolvedConfig.provider,
      usageMode: resolvedConfig.usageMode,
      requestType: "followup_recovery_message",
      status: "success",
      metadata: {
        campaignId: campaign?.id || null,
        stageId: stage?.id || null
      }
    });

    return text || fallbackMessage;
  } catch (error) {
    if (resolvedConfig) {
      await finalizeAIUsage({
        companyId,
        provider: resolvedConfig.provider,
        usageMode: resolvedConfig.usageMode,
        requestType: "followup_recovery_message",
        status: "error",
        errorCode: error?.message || "AI_ERROR",
        metadata: {
          campaignId: campaign?.id || null,
          stageId: stage?.id || null
        }
      }).catch(() => undefined);
    }

    return fallbackMessage;
  }
};

export default buildSmartFollowUpMessageService;
