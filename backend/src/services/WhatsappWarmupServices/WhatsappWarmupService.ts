// @ts-nocheck
import WhatsappWarmup from "../../models/WhatsappWarmup";
import WhatsappWarmupLog from "../../models/WhatsappWarmupLog";
import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";
import moment from "moment";
import { getIO } from "../../libs/socket";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const DEFAULT_MESSAGES = [
  "Ola, tudo bem?",
  "Boa tarde! Como posso te ajudar?",
  "Oi, tem novidade no estoque?",
  "Me manda o link do catalogo",
  "Qual o prazo de entrega?",
  "Voces parcelam no cartao?",
  "Bom dia! Qual o horario de atendimento?",
  "Opa, ainda tem promocao?",
  "Gostei muito do servico, parabens!",
  "Me avisa quando tiver disponivel",
  "Qual o preco do produto?",
  "Pode me enviar mais informacoes?",
  "Obrigado pelo atendimento rapido!",
  "Estou interessado, como faco o pedido?",
  "Voces entregam para minha cidade?",
];

const CONVERSATION_PAIRS = [
  ["Oi, voce tem esse produto?", "Sim! Temos em estoque. Qual cor prefere?"],
  ["Qual o prazo de entrega?", "Entregamos em ate 3 dias uteis para sua regiao."],
  ["Tem desconto para compra em quantidade?", "Sim, acima de 5 unidades damos 10%."],
  ["Voces aceitam PIX?", "Sim! PIX, cartao e boleto."],
  ["Posso ir buscar pessoalmente?", "Claro! Seg-Sex das 9h as 18h."],
  ["Bom dia! Ainda tem promocao?", "Bom dia! Sim, ate sexta-feira com 15% off."],
  ["Me manda o catalogo completo?", "Claro, vou te enviar agora!"],
  ["Oi, tudo certo com meu pedido?", "Sim! Ja foi despachado. Codigo: BR123456789."],
];

const getRandomMessage = (templates?: string[]): string => {
  const pool = templates && templates.length > 0 ? templates : DEFAULT_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
};

const getRandomTarget = (): string => {
  const ddds = ["11", "21", "31", "41", "51", "61", "62", "81", "85", "48", "47"];
  const ddd = ddds[Math.floor(Math.random() * ddds.length)];
  const prefix = "9" + Math.floor(Math.random() * 9000 + 1000);
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return "55" + ddd + prefix + suffix + "@s.whatsapp.net";
};

const emitLog = async (warmup: any, type: string, message: string) => {
  const log = await WhatsappWarmupLog.create({
    companyId: warmup.companyId,
    whatsappId: warmup.whatsappId,
    warmupId: warmup.id,
    type,
    message,
  });
  try {
    const io = getIO();
    io.to(String(warmup.companyId)).emit("company-" + warmup.companyId + "-warmup-log", { action: "create", log });
  } catch {}
};

const getEffectiveLimit = (warmup: any): number => {
  if (!warmup.dailyRampUp) return warmup.messagesPerDay;
  const startMsgs = warmup.rampUpStartMessages || 5;
  const day = warmup.rampUpDay || 1;
  return Math.min(Math.floor(startMsgs * Math.pow(1.2, day - 1)), warmup.messagesPerDay);
};

const resetDailyCounterIfNeeded = async (warmup: any) => {
  const today = moment().format("YYYY-MM-DD");
  if (warmup.lastResetDate !== today) {
    const newDay = warmup.dailyRampUp ? (warmup.rampUpDay || 1) + 1 : warmup.rampUpDay;
    await warmup.update({ messagesSentToday: 0, lastResetDate: today, rampUpDay: newDay });
  }
};

const runPrivateMode = async (warmup: any, wbot: any): Promise<boolean> => {
  const target = getRandomTarget();
  const msg = getRandomMessage(warmup.scriptTemplates);
  await wbot.sendPresenceUpdate("composing", target);
  await delay(Math.floor(Math.random() * 4000) + 1000);
  await wbot.sendMessage(target, { text: msg });
  await wbot.sendPresenceUpdate("paused", target);
  await warmup.increment("messagesSentToday");
  await warmup.increment("simulatedMessages");
  await emitLog(warmup, "PRIVATE_MSG", "Privado para " + target.split("@")[0] + ": " + msg);
  return true;
};

const runGroupsMode = async (warmup: any, wbot: any): Promise<boolean> => {
  let groups: any[] = [];
  try {
    const all = await wbot.groupFetchAllParticipating();
    groups = Object.values(all);
  } catch {
    await emitLog(warmup, "ERROR", "Falha ao buscar grupos");
    return false;
  }
  if (!groups.length) {
    await emitLog(warmup, "INFO", "Nenhum grupo encontrado para este numero");
    return false;
  }
  const group = groups[Math.floor(Math.random() * groups.length)];
  const msg = getRandomMessage(warmup.scriptTemplates);
  await wbot.sendPresenceUpdate("composing", group.id);
  await delay(Math.floor(Math.random() * 3000) + 800);
  await wbot.sendMessage(group.id, { text: msg });
  await wbot.sendPresenceUpdate("paused", group.id);
  await warmup.increment("messagesSentToday");
  await warmup.increment("simulatedMessages");
  await emitLog(warmup, "GROUP_MSG", "Grupo " + group.subject + ": " + msg);
  return true;
};

const runCrossMode = async (warmup: any, wbot: any): Promise<boolean> => {
  const others = await Whatsapp.findAll({
    where: { companyId: warmup.companyId, status: "CONNECTED" },
    attributes: ["id", "number"],
  });
  const partner = others.find(w => w.id !== warmup.whatsappId);
  if (!partner || !partner.number) {
    await emitLog(warmup, "INFO", "Nenhum parceiro disponivel para modo cruzado");
    return false;
  }
  let partnerWbot: any;
  try {
    partnerWbot = getWbot(partner.id);
  } catch {
    await emitLog(warmup, "INFO", "Parceiro desconectado, pulando modo cruzado");
    return false;
  }
  const pair = CONVERSATION_PAIRS[Math.floor(Math.random() * CONVERSATION_PAIRS.length)];
  const myJid = partner.number + "@s.whatsapp.net";
  const partnerNumber = warmup.whatsapp ? warmup.whatsapp.number : "";
  const partnerJid = partnerNumber ? partnerNumber + "@s.whatsapp.net" : "";

  await wbot.sendPresenceUpdate("composing", myJid);
  await delay(Math.floor(Math.random() * 2000) + 600);
  await wbot.sendMessage(myJid, { text: pair[0] });
  await wbot.sendPresenceUpdate("paused", myJid);

  await delay(Math.floor(Math.random() * 4000) + 1500);

  if (partnerJid) {
    await partnerWbot.sendPresenceUpdate("composing", partnerJid);
    await delay(Math.floor(Math.random() * 2000) + 600);
    await partnerWbot.sendMessage(partnerJid, { text: pair[1] });
    await partnerWbot.sendPresenceUpdate("paused", partnerJid);
  }

  await warmup.increment("messagesSentToday");
  await warmup.increment("simulatedMessages");
  await emitLog(warmup, "CROSS_MSG", "Cruzado com " + partner.number + ": " + pair[0] + " / " + pair[1]);
  return true;
};

export const executeWhatsappWarmups = async (): Promise<void> => {
  try {
    const warmups = await WhatsappWarmup.findAll({
      where: { isActive: true },
      include: [{ model: Whatsapp, as: "whatsapp" }],
    });

    for (const warmup of warmups) {
      try {
        const now = moment();
        const start = moment(warmup.startTime, "HH:mm");
        const end = moment(warmup.endTime, "HH:mm");
        if (!now.isBetween(start, end)) continue;

        await resetDailyCounterIfNeeded(warmup);
        if (warmup.messagesSentToday >= getEffectiveLimit(warmup)) continue;
        if (Math.random() > 0.35) continue;

        let wbot: any;
        try {
          wbot = getWbot(warmup.whatsappId);
        } catch {
          continue;
        }

        const mode = warmup.warmupMode || "private";

        if (mode === "groups") {
          await runGroupsMode(warmup, wbot);
        } else if (mode === "cross") {
          await runCrossMode(warmup, wbot);
        } else if (mode === "combined") {
          const r = Math.random();
          if (r < 0.33) {
            await runPrivateMode(warmup, wbot);
          } else if (r < 0.66) {
            const ok = await runGroupsMode(warmup, wbot).catch(() => false);
            if (!ok) await runPrivateMode(warmup, wbot);
          } else {
            const ok = await runCrossMode(warmup, wbot).catch(() => false);
            if (!ok) await runPrivateMode(warmup, wbot);
          }
        } else {
          await runPrivateMode(warmup, wbot);
        }

        const total = warmup.simulatedMessages + 1;
        const healthScore =
          total < 50 ? "warming" :
          total < 200 ? "good" :
          total < 500 ? "great" : "excellent";
        await warmup.update({ healthScore });

      } catch (err) {
        console.log("[Warmup] Error warmup " + warmup.id + ":", err && err.message);
      }
    }
  } catch (err) {
    console.log("[Warmup] Fatal:", err && err.message);
  }
};
