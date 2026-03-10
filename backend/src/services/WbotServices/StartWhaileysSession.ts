import { initWASocketWhaileys } from "../../libs/wbotWhaileys";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import logger from "../../utils/logger";
import * as Sentry from "@sentry/node";

export const StartWhaileysSession = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  await whatsapp.update({ status: "OPENING" });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
    action: "update",
    session: whatsapp
  });

  try {
    const wbot = await initWASocketWhaileys(whatsapp);

    if (wbot?.id) {
      // Reutiliza o mesmo listener de mensagens do canal Baileys
      wbotMessageListener(wbot as any, companyId);
      logger.info(
        `[Whaileys] Sessão ${whatsapp.name} iniciada com sucesso (company ${companyId})`
      );
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`[Whaileys] Erro ao iniciar sessão ${whatsapp.name}: ${err}`);
  }
};
