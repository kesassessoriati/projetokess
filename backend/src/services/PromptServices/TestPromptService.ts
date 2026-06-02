import AppError from "../../errors/AppError";
import Prompt from "../../models/Prompt";
import {
  AIProviderName,
  PromptUsageMode,
  registerAIUsage,
  resolveAIProviderConfig
} from "../AIProviderService/AIProviderService";

interface TestPromptMessage {
  role?: string;
  content?: string;
}

interface TestPromptRequest {
  companyId: number;
  promptId?: number | null;
  prompt?: string;
  message: string;
  provider?: AIProviderName;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  aiUsageMode?: PromptUsageMode;
  allowedTools?: string[];
  context?: TestPromptMessage[];
}

const SENSITIVE_TEST_TOOLS = [
  "create_contact_schedule",
  "update_contact_schedule",
  "update_contact_info",
  "send_product",
  "send_contact_file",
  "execute_tool",
  "execute_command",
  "call_prompt_agent",
  "call_flow_builder",
  "send_group_message",
  "create_company"
];

const OPENAI_COMPATIBLE_BASE_URL: Partial<Record<AIProviderName, string>> = {
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1"
};

const DEFAULT_MODELS: Record<AIProviderName, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
  openrouter: "deepseek/deepseek-chat-v3.1:free",
  groq: "llama-3.1-8b-instant"
};

const normalizeMessages = (context: TestPromptMessage[] = []) =>
  context
    .filter(item => item?.content)
    .slice(-12)
    .map(item => ({
      role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(item.content || "")
    }));

const buildSystemPrompt = (prompt: string, allowedTools: string[] = []) => {
  const enabledSensitiveTools = allowedTools.filter(tool =>
    SENSITIVE_TEST_TOOLS.includes(tool)
  );

  return [
    prompt,
    "# Modo teste",
    "Voce esta em um simulador interno. Nao envie mensagens reais, nao crie ticket, nao altere contato, nao chame webhook e nao execute integracoes externas.",
    "Se precisar usar uma ferramenta sensivel, responda com uma simulacao curta no formato: [Modo teste] Esta ferramenta seria chamada, mas nao foi executada.",
    enabledSensitiveTools.length > 0
      ? `Ferramentas sensiveis em modo simulado: ${enabledSensitiveTools.join(", ")}.`
      : "Nenhuma ferramenta sensivel deve ser executada neste teste."
  ].join("\n\n");
};

const TestPromptService = async ({
  companyId,
  promptId = null,
  prompt,
  message,
  provider,
  model,
  temperature = 0.7,
  maxTokens = 300,
  aiUsageMode = "company_default",
  allowedTools = [],
  context = []
}: TestPromptRequest) => {
  const normalizedMessage = String(message || "").trim();
  if (!normalizedMessage) {
    throw new AppError("Informe uma mensagem para testar o agente.", 400);
  }

  let storedPrompt: Prompt | null = null;
  if (promptId) {
    storedPrompt = await Prompt.findOne({ where: { id: promptId, companyId } });
    if (!storedPrompt) {
      throw new AppError("Agente nao encontrado para teste.", 404);
    }
  }

  const promptText = String(prompt || storedPrompt?.prompt || "").trim();
  if (!promptText) {
    throw new AppError("Preencha o prompt do agente antes de testar.", 400);
  }

  const resolved = await resolveAIProviderConfig({
    companyId,
    provider: provider || (storedPrompt?.provider as AIProviderName),
    promptId: promptId || null,
    promptUsageMode: aiUsageMode || (storedPrompt?.aiUsageMode as PromptUsageMode),
    requestType: "agent_test",
    model: model || storedPrompt?.model
  });
  const selectedModel = model || resolved.model || DEFAULT_MODELS[resolved.provider];
  const systemPrompt = buildSystemPrompt(promptText, allowedTools);

  try {
    let reply = "";

    if (resolved.provider === "gemini") {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(resolved.apiKey);
      const genModel = genAI.getGenerativeModel({ model: selectedModel });
      const history = normalizeMessages(context)
        .map(item => `${item.role === "assistant" ? "Agente" : "Usuario"}: ${item.content}`)
        .join("\n");
      const result = await genModel.generateContent(
        `${systemPrompt}\n\n${history}\nUsuario: ${normalizedMessage}`
      );
      reply = result.response.text() || "";
    } else {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: resolved.apiKey,
        baseURL: OPENAI_COMPATIBLE_BASE_URL[resolved.provider],
        defaultHeaders:
          resolved.provider === "openrouter"
            ? {
                "HTTP-Referer": process.env.FRONTEND_URL || "https://atendzappy.com",
                "X-Title": "AtendZappy Agent Test"
              }
            : undefined
      });

      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...normalizeMessages(context),
          { role: "user", content: normalizedMessage }
        ],
        temperature,
        max_tokens: maxTokens
      });
      reply = completion.choices[0]?.message?.content || "";
    }

    await registerAIUsage({
      companyId,
      provider: resolved.provider,
      usageMode: resolved.usageMode,
      requestType: "agent_test",
      promptId,
      model: selectedModel,
      status: "success",
      metadata: {
        messageLength: normalizedMessage.length,
        contextLength: context.length,
        simulatedSensitiveTools: allowedTools.filter(tool =>
          SENSITIVE_TEST_TOOLS.includes(tool)
        )
      }
    });

    return {
      reply: reply || "Nao consegui gerar uma resposta agora.",
      provider: resolved.provider,
      model: selectedModel,
      mode: "test"
    };
  } catch (err: any) {
    await registerAIUsage({
      companyId,
      provider: resolved.provider,
      usageMode: resolved.usageMode,
      requestType: "agent_test",
      promptId,
      model: selectedModel,
      status: "error",
      errorCode: err?.status ? String(err.status) : "provider_error",
      metadata: { messageLength: normalizedMessage.length }
    }).catch(() => undefined);

    throw err;
  }
};

export default TestPromptService;
