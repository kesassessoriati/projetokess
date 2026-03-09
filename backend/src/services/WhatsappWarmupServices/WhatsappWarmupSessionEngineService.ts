import moment from "moment";
import Whatsapp from "../../models/Whatsapp";
import WhatsappWarmupSession from "../../models/WhatsappWarmupSession";
import WhatsappWarmupSessionLog from "../../models/WhatsappWarmupSessionLog";
import { getWbot } from "../../libs/wbot";
import { getIO } from "../../libs/socket";

const runningSessions = new Set<number>();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const randomBetween = (min: number, max: number): number => {
  const safeMin = Math.max(1, Number(min) || 1);
  const safeMax = Math.max(safeMin, Number(max) || safeMin);
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
};

const emitSessionUpdate = (companyId: number, payload: Record<string, any>) => {
  try {
    const io = getIO();
    io.to(String(companyId)).emit(`company-${companyId}-warmup-session`, payload);
  } catch (error) {
    // no-op on socket errors
  }
};

const createSessionLog = async (
  session: WhatsappWarmupSession,
  type: string,
  message: string,
  fromWhatsappId?: number,
  toWhatsappId?: number
) => {
  const log = await WhatsappWarmupSessionLog.create({
    companyId: session.companyId,
    warmupSessionId: session.id,
    type,
    message,
    fromWhatsappId: fromWhatsappId || null,
    toWhatsappId: toWhatsappId || null
  });

  emitSessionUpdate(session.companyId, { action: "log", sessionId: session.id, log });
  return log;
};

const ensureConnectionPool = async (session: WhatsappWarmupSession) => {
  const ids = Array.isArray(session.connectionIds) ? session.connectionIds : [];
  const whas = await Whatsapp.findAll({
    where: {
      id: ids,
      companyId: session.companyId
    },
    attributes: ["id", "number", "name", "status"]
  });
  const byId = new Map<number, any>();
  whas.forEach(item => byId.set(item.id, item));
  return byId;
};

const sendStepMessage = async (
  session: WhatsappWarmupSession,
  step: any,
  connectionPool: Map<number, any>
) => {
  const fromConn = connectionPool.get(Number(step.fromWhatsappId));
  const toConn = connectionPool.get(Number(step.toWhatsappId));

  if (!fromConn || !toConn) {
    await createSessionLog(
      session,
      "WARN",
      `Conexao invalida no passo (from=${step.fromWhatsappId}, to=${step.toWhatsappId})`
    );
    return;
  }

  if (!toConn.number) {
    await createSessionLog(session, "WARN", `Destino ${toConn.id} sem numero cadastrado`);
    return;
  }

  let senderWbot: any;
  try {
    senderWbot = getWbot(fromConn.id);
  } catch (error) {
    await createSessionLog(session, "WARN", `Conexao ${fromConn.id} desconectada; passo ignorado`);
    return;
  }

  const jid = `${toConn.number}@s.whatsapp.net`;
  await senderWbot.sendPresenceUpdate("composing", jid).catch(() => null);
  await delay(randomBetween(600, 1800));
  await senderWbot.sendMessage(jid, { text: String(step.message || "").trim() });
  await senderWbot.sendPresenceUpdate("paused", jid).catch(() => null);

  await session.increment("messagesSent");
  await createSessionLog(
    session,
    "MESSAGE_SENT",
    `#${fromConn.id} -> #${toConn.id}: ${String(step.message || "").trim()}`,
    fromConn.id,
    toConn.id
  );
};

export const runWarmupSessionById = async (sessionId: number): Promise<void> => {
  if (runningSessions.has(sessionId)) return;
  runningSessions.add(sessionId);

  try {
    let session = await WhatsappWarmupSession.findByPk(sessionId);
    if (!session) return;

    if (!["scheduled", "running", "draft", "paused"].includes(session.status)) return;
    if (!Array.isArray(session.scriptSteps) || session.scriptSteps.length === 0) {
      await session.update({
        status: "failed",
        failureReason: "Sessao sem script configurado",
        endedAt: new Date()
      });
      await createSessionLog(session, "ERROR", "Sessao encerrada: script vazio");
      return;
    }

    if (session.status === "paused") {
      return;
    }

    if (!session.startedAt) {
      await session.update({ status: "running", startedAt: new Date(), failureReason: null });
      await createSessionLog(session, "SESSION_STARTED", "Sessao iniciada");
    } else if (session.status !== "running") {
      await session.update({ status: "running" });
      await createSessionLog(session, "SESSION_RESUMED", "Sessao retomada");
    }

    const connectionPool = await ensureConnectionPool(session);
    const steps = session.scriptSteps || [];
    const totalSteps = steps.length;
    let stepIndex = Number(session.currentStep) || 0;
    let currentTurn = Number(session.currentTurn) || 1;
    const turns = Math.max(1, Number(session.turns) || 1);

    while (currentTurn <= turns) {
      while (stepIndex < totalSteps) {
        session = await WhatsappWarmupSession.findByPk(sessionId);
        if (!session) return;

        if (session.status === "paused") {
          await createSessionLog(session, "SESSION_PAUSED", "Sessao pausada pelo usuario");
          return;
        }

        if (["canceled", "failed", "completed"].includes(session.status)) {
          return;
        }

        const step = steps[stepIndex];
        if (step?.type === "wait") {
          const waitSeconds = Math.max(1, Number(step.seconds) || randomBetween(session.minIntervalSeconds, session.maxIntervalSeconds));
          await createSessionLog(session, "WAIT", `Aguardando ${waitSeconds}s`);
          await delay(waitSeconds * 1000);
        } else if (step?.type === "send") {
          await sendStepMessage(session, step, connectionPool);
          const sleepSeconds = randomBetween(session.minIntervalSeconds, session.maxIntervalSeconds);
          await delay(sleepSeconds * 1000);
        }

        stepIndex += 1;
        await session.update({ currentStep: stepIndex, currentTurn });
        emitSessionUpdate(session.companyId, {
          action: "progress",
          sessionId: session.id,
          currentStep: stepIndex,
          currentTurn
        });
      }

      currentTurn += 1;
      stepIndex = 0;
      await session.update({ currentTurn, currentStep: 0 });
    }

    await session.update({
      status: "completed",
      endedAt: new Date(),
      currentStep: 0
    });
    await createSessionLog(session, "SESSION_COMPLETED", "Sessao finalizada com sucesso");
    emitSessionUpdate(session.companyId, { action: "completed", sessionId: session.id });
  } catch (error) {
    const session = await WhatsappWarmupSession.findByPk(sessionId);
    if (session) {
      await session.update({
        status: "failed",
        endedAt: new Date(),
        failureReason: error?.message || "Falha inesperada"
      });
      await createSessionLog(session, "ERROR", `Sessao falhou: ${error?.message || "erro desconhecido"}`);
      emitSessionUpdate(session.companyId, { action: "failed", sessionId: session.id });
    }
  } finally {
    runningSessions.delete(sessionId);
  }
};

export const processScheduledWarmupSessions = async (): Promise<void> => {
  const now = moment().toDate();
  const sessions = await WhatsappWarmupSession.findAll({
    where: {
      status: "scheduled"
    },
    order: [["scheduledAt", "ASC"]],
    limit: 20
  });

  for (const session of sessions) {
    if (!session.scheduledAt || session.scheduledAt <= now) {
      runWarmupSessionById(session.id);
    }
  }
};

