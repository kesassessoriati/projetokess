import {
  resolveAIProviderConfig,
  finalizeAIUsage
} from "../AIProviderService/AIProviderService";

const WARMUP_STYLE_GUIDE = `Você é especialista em gerar conversas WhatsApp naturais para aquecimento de contas.
Gere uma sequência de mensagens simulando um diálogo progressivo e natural entre duas pessoas que se conhecem.
Características obrigatórias:
- Mensagens curtas (1 a 3 frases cada)
- A conversa deve ter progressão: cumprimento → assunto casual → tópico específico → encerramento natural
- Tom amigável e informal em pt-BR
- Perguntas genuínas e respostas engajadas (não mensagens isoladas)
- Assuntos cotidianos variados: trabalho, projetos pessoais, rotina, alimentação, tecnologia, saúde, planos
- SEM emojis, SEM formatação especial, SEM linguagem robótica ou genérica
Retorne SOMENTE um array JSON de strings, sem explicações, numeração ou formatação extra.`;

type BuildScriptInput = {
  companyId: number;
  mode: "manual" | "standard" | "random" | "ai" | "hybrid";
  connectionIds: number[];
  starterWhatsappId?: number;
  turns: number;
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  manualSteps?: any[];
  aiConfig?: {
    tema?: string;
    tom?: string;
    contexto?: string;
    idioma?: string;
    quantidadeMensagens?: number;
    objetivo?: string;
    estiloConversa?: string;
  };
};

const DEFAULT_MESSAGES = [
  "Oi! Tudo bem por ai?",
  "Tudo certo, e com voce?",
  "Voce viu as novidades de hoje?",
  "Vi sim! Gostei bastante.",
  "Como esta o movimento por ai?",
  "Esta bom, e por ai tambem.",
  "Bora manter essa conversa ativa.",
  "Combinado, seguimos aquecendo."
];

const RANDOM_MESSAGES = [
  "Bom dia, como voce esta?",
  "Tudo tranquilo por aqui.",
  "Me conta uma novidade de hoje.",
  "Estou testando uma rotina nova.",
  "Legal, isso ajuda bastante.",
  "Vamos manter o ritmo da conversa.",
  "Perfeito, seguimos em frente.",
  "Fechado, ate a proxima mensagem."
];

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomBetween = (min: number, max: number): number => {
  const safeMin = Math.max(1, Number(min) || 1);
  const safeMax = Math.max(safeMin, Number(max) || safeMin);
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
};

const sanitizeSteps = (steps: any[]): any[] => {
  if (!Array.isArray(steps)) return [];
  return steps
    .map(step => {
      if (step?.type === "wait") {
        return {
          type: "wait",
          seconds: Math.max(1, Number(step.seconds) || 5)
        };
      }
      if (step?.type === "send") {
        return {
          type: "send",
          fromWhatsappId: Number(step.fromWhatsappId),
          toWhatsappId: Number(step.toWhatsappId),
          message: String(step.message || "").trim()
        };
      }
      return null;
    })
    .filter(Boolean)
    .filter(step => step.type === "wait" || (step.fromWhatsappId && step.toWhatsappId && step.message));
};

const buildConversationSteps = (
  messages: string[],
  connectionIds: number[],
  starterWhatsappId: number | undefined,
  turns: number,
  minIntervalSeconds: number,
  maxIntervalSeconds: number
): any[] => {
  if (!connectionIds?.length || connectionIds.length < 2) {
    return [];
  }

  const starter = starterWhatsappId && connectionIds.includes(starterWhatsappId)
    ? starterWhatsappId
    : connectionIds[0];

  const ordered = [starter, ...connectionIds.filter(id => id !== starter)];
  const effectiveTurns = Math.max(1, Number(turns) || 1);
  const steps: any[] = [];
  let msgCursor = 0;

  for (let turn = 0; turn < effectiveTurns; turn += 1) {
    for (let i = 0; i < ordered.length - 1; i += 1) {
      const fromWhatsappId = ordered[i];
      const toWhatsappId = ordered[i + 1];
      const message = messages[msgCursor % messages.length] || pickRandom(DEFAULT_MESSAGES);
      msgCursor += 1;

      steps.push({
        type: "send",
        fromWhatsappId,
        toWhatsappId,
        message
      });

      steps.push({
        type: "wait",
        seconds: randomBetween(minIntervalSeconds, maxIntervalSeconds)
      });
    }

    const reverse = [...ordered].reverse();
    for (let i = 0; i < reverse.length - 1; i += 1) {
      const fromWhatsappId = reverse[i];
      const toWhatsappId = reverse[i + 1];
      const message = messages[msgCursor % messages.length] || pickRandom(DEFAULT_MESSAGES);
      msgCursor += 1;

      steps.push({
        type: "send",
        fromWhatsappId,
        toWhatsappId,
        message
      });

      steps.push({
        type: "wait",
        seconds: randomBetween(minIntervalSeconds, maxIntervalSeconds)
      });
    }
  }

  return steps;
};

const generateAiMessages = async (input: BuildScriptInput): Promise<string[]> => {
  const { companyId, aiConfig } = input;
  const quantidadeMensagens = Math.max(8, Number(aiConfig?.quantidadeMensagens) || 20);

  // Resolve API key and check credits via shared AI infrastructure.
  // Throws AppError (402/503/403) if credits exhausted, key missing, or plan disabled.
  const resolved = await resolveAIProviderConfig({
    companyId,
    requestType: "warmup_script"
  });

  const userPrompt = [
    `Tema: ${aiConfig?.tema || "conversa cotidiana entre dois conhecidos"}`,
    `Tom: ${aiConfig?.tom || "amigável e informal"}`,
    `Contexto: ${aiConfig?.contexto || "duas pessoas conversando pelo WhatsApp"}`,
    `Idioma: ${aiConfig?.idioma || "pt-BR"}`,
    `Objetivo: ${aiConfig?.objetivo || "manter conversa natural e progressiva"}`,
    `Estilo: ${aiConfig?.estiloConversa || "diálogo fluido com múltiplos turnos"}`,
    `Quantidade: ${quantidadeMensagens} mensagens`
  ].join("\n");

  let raw = "[]";
  let apiStatus: "success" | "error" = "success";
  let errorCode: string | null = null;

  try {
    if (resolved.provider === "gemini") {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(resolved.apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(`${WARMUP_STYLE_GUIDE}\n\n${userPrompt}`);
      raw = result.response.text();
    } else {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: resolved.apiKey });
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.85,
        max_tokens: 1400,
        messages: [
          { role: "system", content: WARMUP_STYLE_GUIDE },
          { role: "user", content: userPrompt }
        ]
      });
      raw = resp.choices?.[0]?.message?.content || "[]";
    }
  } catch (err: any) {
    apiStatus = "error";
    errorCode = err?.message || "AI_ERROR";
  }

  await finalizeAIUsage({
    companyId,
    provider: resolved.provider,
    usageMode: resolved.usageMode,
    requestType: "warmup_script",
    model: resolved.provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini",
    status: apiStatus,
    errorCode
  });

  if (apiStatus === "error") {
    return [...DEFAULT_MESSAGES, ...RANDOM_MESSAGES].slice(0, quantidadeMensagens);
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map(item => String(item).trim()).filter(Boolean);
    }
  } catch {
    // fallback to line parsing
  }

  return raw
    .split("\n")
    .map(line => line.replace(/^[\d.\-•"[\]]+/, "").trim())
    .filter(Boolean)
    .slice(0, quantidadeMensagens);
};

export const buildWarmupScript = async (input: BuildScriptInput): Promise<any[]> => {
  if (input.mode === "manual") {
    return sanitizeSteps(input.manualSteps || []);
  }

  if (!input.connectionIds || input.connectionIds.length < 2) {
    return [];
  }

  if (input.mode === "standard") {
    return buildConversationSteps(
      DEFAULT_MESSAGES,
      input.connectionIds,
      input.starterWhatsappId,
      input.turns,
      input.minIntervalSeconds,
      input.maxIntervalSeconds
    );
  }

  if (input.mode === "random") {
    return buildConversationSteps(
      RANDOM_MESSAGES.sort(() => Math.random() - 0.5),
      input.connectionIds,
      input.starterWhatsappId,
      input.turns,
      input.minIntervalSeconds,
      input.maxIntervalSeconds
    );
  }

  if (input.mode === "ai") {
    const aiMessages = await generateAiMessages(input);
    return buildConversationSteps(
      aiMessages,
      input.connectionIds,
      input.starterWhatsappId,
      input.turns,
      input.minIntervalSeconds,
      input.maxIntervalSeconds
    );
  }

  const aiMessages = await generateAiMessages(input);
  const mixed = [...aiMessages.slice(0, Math.ceil(aiMessages.length / 2)), ...DEFAULT_MESSAGES].slice(0, 18);
  return buildConversationSteps(
    mixed,
    input.connectionIds,
    input.starterWhatsappId,
    input.turns,
    input.minIntervalSeconds,
    input.maxIntervalSeconds
  );
};

