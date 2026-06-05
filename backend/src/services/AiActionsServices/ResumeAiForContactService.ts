import Contact from "../../models/Contact";
import logger from "../../utils/logger";

const ResumeAiForContactService = async (
  contactId: number,
  companyId: number
): Promise<void> => {
  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });

  if (!contact) {
    throw new Error(`Contato ${contactId} não encontrado na empresa ${companyId}`);
  }

  await contact.update({
    aiBlockMode: null,
    aiBlockedUntil: null,
    aiBlockedByStageId: null
  });

  logger.info(`[AiActions] IA reativada manualmente contact=${contactId} companyId=${companyId}`);
};

export default ResumeAiForContactService;
