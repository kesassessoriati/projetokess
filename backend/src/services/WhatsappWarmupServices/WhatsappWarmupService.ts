import WhatsappWarmup from "../../models/WhatsappWarmup";
import WhatsappWarmupLog from "../../models/WhatsappWarmupLog";
import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";
import moment from "moment";
import { getIO } from "../../libs/socket";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const getRandomMessage = () => {
    const messages = [
        "Olá, tudo bem?",
        "Boa tarde!",
        "Como vocês estão?",
        "Qual o valor do produto?",
        "Me envia o catálogo fazendo favor",
        "Pode me ajudar com uma dúvida?",
        "Vocês trabalham com cartão?",
        "Bom dia, ótimo trabalho hoje",
        "Opa, maravilha",
        "Gostei muito do atendimento",
        "Qualquer novidade me avisa"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
};

const getRandomTarget = () => {
    // Generate a reasonably real-looking brazilian number prefix for testing warmup
    // Using simple format +55 DD 9XXXX-XXXX
    const ddds = ["11", "21", "31", "41", "51", "61", "62", "81", "85"];
    const ddd = ddds[Math.floor(Math.random() * ddds.length)];
    const prefix = "9" + Math.floor(Math.random() * 9000 + 1000);
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    return `55${ddd}${prefix}${suffix}@s.whatsapp.net`;
};

export const executeWhatsappWarmups = async (): Promise<void> => {
    try {
        const warmups = await WhatsappWarmup.findAll({
            where: { isActive: true },
            include: [{ model: Whatsapp, as: "whatsapp" }]
        });

        for (const warmup of warmups) {
            const currentTime = moment();
            const start = moment(warmup.startTime, "HH:mm");
            const end = moment(warmup.endTime, "HH:mm");

            if (currentTime.isBetween(start, end)) {
                // Here we would implement complex simulation logic to send msgs, read, wait, type, etc.
                const shouldSend = Math.random() < 0.3; // 30% chance each cycle

                if (shouldSend) {
                    try {
                        const targetNumber = getRandomTarget();
                        const messageStr = getRandomMessage();

                        const wbot = getWbot(warmup.whatsappId);
                        if (wbot) {
                            // Simulate typing
                            await wbot.sendPresenceUpdate("composing", targetNumber);
                            const typingDelay = Math.floor(Math.random() * 5000) + 1000;
                            await delay(typingDelay);

                            await wbot.sendMessage(targetNumber, { text: messageStr });
                            await wbot.sendPresenceUpdate("paused", targetNumber);

                            // Increase count
                            await warmup.increment("messagesSentToday");
                            await warmup.increment("simulatedMessages");

                            const log = await WhatsappWarmupLog.create({
                                companyId: warmup.companyId,
                                whatsappId: warmup.whatsappId,
                                warmupId: warmup.id,
                                type: "MSG_SENT",
                                message: `Mensagem enviada para ${targetNumber.split("@")[0]}`
                            });

                            const io = getIO();
                            io.to(warmup.companyId.toString()).emit(`company-${warmup.companyId}-warmup-log`, {
                                action: "create",
                                log
                            });
                        }
                    } catch (err) {
                        console.log("Erro ao aquecer whatsapp:", warmup.whatsappId, err.message);
                    }
                }
            }
        }
    } catch (err) {
        console.log("Erro no serviço de aquecimento", err);
    }
};
