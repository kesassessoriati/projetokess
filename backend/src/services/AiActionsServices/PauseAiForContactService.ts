import moment from "moment";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";

interface PauseOptions {
  contactId: number;
  companyId: number;
  mode: "manual" | "manual_until" | "disabled_manual" | "pause_until";
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

  // Normaliza aliases legados: "manual_until" → "pause_until", "manual" → "disabled_manual"
  const isPauseUntil = mode === "manual_until" || mode === "pause_until";
  const isDisableManual = mode === "manual" || mode === "disabled_manual";

  if (isPauseUntil) {
    if (!pauseUntil || new Date(pauseUntil) <= new Date()) {
      throw new Error("Data de pausa inválida ou no passado");
    }
    await contact.update({
      aiBlockMode: "pause_until",
      aiBlockedUntil: new Date(pauseUntil),
      aiBlockedByStageId: null
    });
    logger.info(
      `[AI Block] pause set contactId=${contactId} until=${new Date(pauseUntil).toISOString()} reason="${reason || ""}"`
    );
  } else if (isDisableManual) {
    await contact.update({
      aiBlockMode: "disabled_manual",
      aiBlockedUntil: null,
      aiBlockedByStageId: null
    });
    logger.info(`[AI Block] manual disable set contactId=${contactId} reason="${reason || ""}"`);
  }
};

export default PauseAiForContactService;
