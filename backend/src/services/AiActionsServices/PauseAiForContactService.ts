import moment from "moment";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";

interface PauseOptions {
  contactId: number;
  companyId: number;
  mode: "manual" | "manual_until";
  pauseUntil?: Date | null;
  reason?: string;
}

const PauseAiForContactService = async (opts: PauseOptions): Promise<void> => {
  const { contactId, companyId, mode, pauseUntil, reason } = opts;

  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });

  if (!contact) {
    throw new Error(`Contato ${contactId} não encontrado na empresa ${companyId}`);
  }

  if (mode === "manual_until") {
    if (!pauseUntil || new Date(pauseUntil) <= new Date()) {
      throw new Error("Data de pausa inválida ou no passado");
    }
    await contact.update({
      aiBlockMode: "manual_until",
      aiBlockedUntil: new Date(pauseUntil),
      aiBlockedByStageId: null
    });
    logger.info(
      `[AiActions] pause manual_until contact=${contactId} until=${new Date(pauseUntil).toISOString()} reason="${reason || ""}"`
    );
  } else {
    await contact.update({
      aiBlockMode: "manual",
      aiBlockedUntil: null,
      aiBlockedByStageId: null
    });
    logger.info(`[AiActions] pause manual contact=${contactId} reason="${reason || ""}"`);
  }
};

export default PauseAiForContactService;
