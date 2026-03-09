// @ts-nocheck
import { Request, Response } from "express";
import { Op, literal } from "sequelize";
import WhatsappWarmup from "../models/WhatsappWarmup";
import WhatsappWarmupLog from "../models/WhatsappWarmupLog";
import WhatsappWarmupSession from "../models/WhatsappWarmupSession";
import WhatsappWarmupSessionLog from "../models/WhatsappWarmupSessionLog";
import Whatsapp from "../models/Whatsapp";
import Setting from "../models/Setting";
import { buildWarmupScript } from "../services/WhatsappWarmupServices/WarmupScriptBuilderService";
import { runWarmupSessionById } from "../services/WhatsappWarmupServices/WhatsappWarmupSessionEngineService";

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const warmup = await WhatsappWarmup.findOne({ where: { whatsappId, companyId } });
  return res.status(200).json(warmup);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const data = req.body;
  let warmup = await WhatsappWarmup.findOne({ where: { whatsappId, companyId } });
  if (!warmup) {
    warmup = await WhatsappWarmup.create({ ...data, whatsappId, companyId });
  } else {
    await warmup.update(data);
  }
  return res.status(200).json(warmup);
};

export const logs = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const records = await WhatsappWarmupLog.findAll({
    where: { whatsappId, companyId },
    order: [["createdAt", "DESC"]],
    limit,
  });
  return res.status(200).json(records);
};

export const summary = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const whatsapps = await Whatsapp.findAll({
    where: { companyId },
    attributes: ["id", "name", "number", "status"],
    include: [{ model: WhatsappWarmup, as: "warmup", required: false }],
  });
  const result = whatsapps.map(w => ({
    whatsappId: w.id,
    name: w.name,
    number: w.number,
    connectionStatus: w.status,
    warmup: (w as any).warmup || null,
  }));
  return res.status(200).json(result);
};

export const stats = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const logs7days = await WhatsappWarmupLog.findAll({
    where: { whatsappId, companyId, createdAt: { [Op.gte]: sevenDaysAgo } },
    attributes: [
      [literal('DATE("createdAt")'), "date"],
      [literal("COUNT(*)"), "count"],
    ],
    group: [literal('DATE("createdAt")')],
    order: [[literal('DATE("createdAt")'), "ASC"]],
  });

  const chart: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    const found = logs7days.find((l: any) => l.getDataValue("date") === dateStr);
    chart.push({ date: dateStr, count: found ? Number(found.getDataValue("count")) : 0 });
  }

  const warmup = await WhatsappWarmup.findOne({ where: { whatsappId, companyId } });
  return res.status(200).json({ chart, warmup });
};

export const generateScript = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    category = "generic",
    count = 15,
    mode = "ai",
    connectionIds = [],
    starterWhatsappId,
    turns = 2,
    minIntervalSeconds = 6,
    maxIntervalSeconds = 16,
    aiConfig = {}
  } = req.body;

  if (Array.isArray(connectionIds) && connectionIds.length >= 2) {
    const steps = await buildWarmupScript({
      companyId,
      mode,
      connectionIds: connectionIds.map(Number),
      starterWhatsappId: starterWhatsappId ? Number(starterWhatsappId) : undefined,
      turns: Number(turns) || 2,
      minIntervalSeconds: Number(minIntervalSeconds) || 6,
      maxIntervalSeconds: Number(maxIntervalSeconds) || 16,
      aiConfig
    });
    return res.status(200).json({ steps, source: mode });
  }

  const openAiSetting = await Setting.findOne({ where: { companyId, key: "openaiApiKey" } }).catch(() => null);
  const apiKey = openAiSetting?.value || process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey });
      const labels: Record<string, string> = {
        ecommerce: "loja virtual / e-commerce",
        services: "prestacao de servicos",
        food: "restaurante ou delivery de comida",
        health: "clinica medica ou saude",
        education: "escola ou cursos",
        realestate: "imobiliaria",
        generic: "negocio generico",
      };
      const label = labels[category] || "negocio generico";
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Voce e um especialista em aquecimento de chips WhatsApp. Gere mensagens curtas e naturais simulando clientes reais enviando mensagens para um " +
              label +
              ". Retorne SOMENTE um array JSON com as strings, sem explicacoes. Max 100 chars por mensagem. Sem emojis.",
          },
          { role: "user", content: "Gere " + count + " mensagens para " + label + "." },
        ],
        temperature: 0.9,
        max_tokens: 700,
      });
      const raw = resp.choices[0]?.message?.content || "[]";
      let scripts: string[] = [];
      try {
        scripts = JSON.parse(raw);
      } catch {
        scripts = raw.split("\n").map((l: string) => l.replace(/^[\d.\-"[\]]+/, "").trim()).filter(Boolean);
      }
      return res.status(200).json({ scripts, source: "openai" });
    } catch (err) {
      console.log("[WarmupScript] OpenAI fallback:", err && err.message);
    }
  }

  const TEMPLATES: Record<string, string[]> = {
    ecommerce: [
      "Ola, voce tem esse produto em estoque?",
      "Qual o prazo de entrega para o interior?",
      "Aceita troca de produto?",
      "Tem alguma promocao esta semana?",
      "Como funciona o frete gratis?",
      "Posso pagar parcelado no cartao?",
      "Qual a politica de devolucao?",
      "Tem versao maior desse produto?",
      "Voces enviam para todo o Brasil?",
      "Me manda o link do catalogo completo",
      "Tem garantia no produto?",
      "Aceita PIX com desconto?",
      "Quando chega o produto que pedi?",
      "Tem nota fiscal nos pedidos?",
      "Qual o tamanho disponivel?",
    ],
    services: [
      "Qual o preco do servico?",
      "Voces atendem no final de semana?",
      "Qual o horario de funcionamento?",
      "Tem orcamento gratuito?",
      "Quanto tempo demora o servico?",
      "Voces emitem nota fiscal?",
      "Tem servico de urgencia?",
      "Posso agendar para semana que vem?",
      "Qual a experiencia da equipe?",
      "Atendem na minha regiao?",
      "Tem garantia no servico?",
      "Qual a forma de pagamento?",
      "Tem fotos de servicos anteriores?",
      "Posso ver referencias de clientes?",
      "Me manda o contrato de servico",
    ],
    food: [
      "Qual o cardapio do dia?",
      "Tem opcao sem gluten?",
      "Qual o tempo de entrega?",
      "Aceita entrega pelo app?",
      "Tem prato vegetariano?",
      "Qual o horario de funcionamento?",
      "Tem mesa disponivel para jantar?",
      "Tem sobremesa sem lactose?",
      "Faz entrega em meu bairro?",
      "Tem promocao de almoco?",
      "Posso fazer pedido pelo WhatsApp?",
      "Tem porcao para criancas?",
      "Me manda o link do cardapio online",
      "Tem estacionamento?",
      "Aceita voucher de alimentacao?",
    ],
    health: [
      "Qual o valor da consulta?",
      "Tem horario disponivel esta semana?",
      "Aceita convenio?",
      "Qual o endereco da clinica?",
      "Precisa de encaminhamento medico?",
      "Faz atendimento online?",
      "Qual o tempo medio de consulta?",
      "Tem especialidade em pediatria?",
      "Posso cancelar a consulta?",
      "Emite receita digital?",
      "Tem estacionamento para pacientes?",
      "Qual o prazo para resultado do exame?",
      "Faz exame laboratorial no local?",
      "Tem atendimento de emergencia?",
      "Aceita pagamento no credito?",
    ],
    generic: [
      "Ola, tudo bem?",
      "Boa tarde, pode me ajudar?",
      "Qual o horario de atendimento?",
      "Como funciona o processo?",
      "Tem alguma novidade?",
      "Me manda mais informacoes",
      "Qual o valor aproximado?",
      "Aceita parcelamento?",
      "Voces atendem online?",
      "Tem suporte pos-venda?",
      "Qual a diferenca dos planos?",
      "Tem versao gratuita?",
      "Posso testar antes de comprar?",
      "Tem algum desconto para novo cliente?",
      "Qual o diferencial de voces?",
    ],
  };

  const scripts = TEMPLATES[category] || TEMPLATES.generic;
  return res.status(200).json({ scripts, source: "template" });
};

export const createSession = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    name,
    connectionIds = [],
    starterWhatsappId,
    turns = 2,
    minIntervalSeconds = 8,
    maxIntervalSeconds = 20,
    scriptMode = "manual",
    scriptSteps = [],
    scheduleAt,
    aiConfig = {},
    autoStart = false
  } = req.body;

  const ids = [...new Set((Array.isArray(connectionIds) ? connectionIds : []).map(Number).filter(Boolean))];
  if (ids.length < 2) {
    return res.status(400).json({ error: "Selecione pelo menos duas conexoes." });
  }

  const validConnections = await Whatsapp.findAll({
    where: {
      companyId,
      id: ids
    },
    attributes: ["id", "status", "name", "number"]
  });

  if (validConnections.length !== ids.length) {
    return res.status(400).json({ error: "Uma ou mais conexoes nao pertencem a empresa." });
  }

  const safeStarter = ids.includes(Number(starterWhatsappId)) ? Number(starterWhatsappId) : ids[0];
  const computedSteps = scriptMode === "manual"
    ? scriptSteps
    : await buildWarmupScript({
      companyId,
      mode: scriptMode,
      connectionIds: ids,
      starterWhatsappId: safeStarter,
      turns: Number(turns) || 2,
      minIntervalSeconds: Number(minIntervalSeconds) || 8,
      maxIntervalSeconds: Number(maxIntervalSeconds) || 20,
      aiConfig
    });

  const status = scheduleAt ? "scheduled" : autoStart ? "running" : "draft";

  const session = await WhatsappWarmupSession.create({
    companyId,
    name: name || `Sessao ${new Date().toLocaleString("pt-BR")}`,
    connectionIds: ids,
    starterWhatsappId: safeStarter,
    turns: Number(turns) || 2,
    minIntervalSeconds: Number(minIntervalSeconds) || 8,
    maxIntervalSeconds: Number(maxIntervalSeconds) || 20,
    scriptMode,
    scriptSteps: computedSteps,
    aiConfig,
    status,
    scheduledAt: scheduleAt ? new Date(scheduleAt) : null
  });

  await WhatsappWarmupSessionLog.create({
    companyId,
    warmupSessionId: session.id,
    type: "SESSION_CREATED",
    message: `Sessao criada com modo ${scriptMode}`
  });

  if (autoStart && !scheduleAt) {
    runWarmupSessionById(session.id);
  }

  return res.status(201).json(session);
};

export const listSessions = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const sessions = await WhatsappWarmupSession.findAll({
    where: { companyId },
    order: [["createdAt", "DESC"]],
    limit
  });
  return res.status(200).json(sessions);
};

export const sessionLogs = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  const logs = await WhatsappWarmupSessionLog.findAll({
    where: { companyId, warmupSessionId: id },
    order: [["createdAt", "DESC"]],
    limit: Math.min(Number(req.query.limit) || 200, 500)
  });
  return res.status(200).json(logs);
};

const getSessionOr404 = async (id: string | number, companyId: number) => {
  const session = await WhatsappWarmupSession.findOne({
    where: { id, companyId }
  });
  return session;
};

export const startSession = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const session = await getSessionOr404(req.params.id, companyId);
  if (!session) return res.status(404).json({ error: "Sessao nao encontrada." });

  await session.update({
    status: "running",
    startedAt: session.startedAt || new Date(),
    endedAt: null,
    failureReason: null
  });
  runWarmupSessionById(session.id);
  return res.status(200).json({ success: true });
};

export const pauseSession = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const session = await getSessionOr404(req.params.id, companyId);
  if (!session) return res.status(404).json({ error: "Sessao nao encontrada." });
  await session.update({ status: "paused" });
  await WhatsappWarmupSessionLog.create({
    companyId,
    warmupSessionId: session.id,
    type: "SESSION_PAUSED",
    message: "Sessao pausada pelo usuario"
  });
  return res.status(200).json({ success: true });
};

export const resumeSession = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const session = await getSessionOr404(req.params.id, companyId);
  if (!session) return res.status(404).json({ error: "Sessao nao encontrada." });
  await session.update({ status: "running" });
  runWarmupSessionById(session.id);
  return res.status(200).json({ success: true });
};

export const stopSession = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const session = await getSessionOr404(req.params.id, companyId);
  if (!session) return res.status(404).json({ error: "Sessao nao encontrada." });
  await session.update({ status: "canceled", endedAt: new Date() });
  await WhatsappWarmupSessionLog.create({
    companyId,
    warmupSessionId: session.id,
    type: "SESSION_CANCELED",
    message: "Sessao encerrada pelo usuario"
  });
  return res.status(200).json({ success: true });
};

export const sessionMetrics = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [connections, sessions, todayMessages] = await Promise.all([
    Whatsapp.count({ where: { companyId } }),
    WhatsappWarmupSession.findAll({ where: { companyId }, attributes: ["id", "status", "messagesSent", "connectionIds", "scriptMode"] }),
    WhatsappWarmupSessionLog.count({
      where: {
        companyId,
        type: "MESSAGE_SENT",
        createdAt: { [Op.gte]: startOfDay }
      }
    })
  ]);

  const summary = {
    totalConnections: connections,
    activeWarmingConnections: 0,
    messagesToday: todayMessages,
    sessionsExecuted: 0,
    sessionsFailed: 0,
    avgMessagesPerSession: 0,
    topConnections: [],
    topScripts: []
  };

  const connectionUsage: Record<string, number> = {};
  const scriptUsage: Record<string, number> = {};
  let totalMessages = 0;

  sessions.forEach((session: any) => {
    if (["running", "paused", "scheduled"].includes(session.status)) {
      const ids = Array.isArray(session.connectionIds) ? session.connectionIds : [];
      summary.activeWarmingConnections += ids.length;
    }
    if (["completed", "failed", "canceled"].includes(session.status)) summary.sessionsExecuted += 1;
    if (session.status === "failed") summary.sessionsFailed += 1;
    totalMessages += Number(session.messagesSent) || 0;
    scriptUsage[session.scriptMode] = (scriptUsage[session.scriptMode] || 0) + 1;

    const ids = Array.isArray(session.connectionIds) ? session.connectionIds : [];
    ids.forEach((id: number) => {
      connectionUsage[id] = (connectionUsage[id] || 0) + 1;
    });
  });

  summary.avgMessagesPerSession = summary.sessionsExecuted > 0
    ? Number((totalMessages / summary.sessionsExecuted).toFixed(2))
    : 0;

  summary.topConnections = Object.entries(connectionUsage)
    .map(([connectionId, uses]) => ({ connectionId: Number(connectionId), uses }))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 5);

  summary.topScripts = Object.entries(scriptUsage)
    .map(([scriptMode, uses]) => ({ scriptMode, uses }))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 5);

  return res.status(200).json(summary);
};
