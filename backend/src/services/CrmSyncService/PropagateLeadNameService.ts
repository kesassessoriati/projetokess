import Opportunity from "../../models/Opportunity";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";

/**
 * Fase D — Propagação do nome comercial do Lead.
 *
 * Quando o Lead é renomeado no CRM, o nome comercial é a fonte da verdade:
 *   - Opportunity.title de TODAS as oportunidades OPEN do lead é atualizado
 *     (o card do Kanban exibe o título — deixa de ser snapshot antigo);
 *   - Contact.name é atualizado SOMENTE se isManualName=false (nome definido
 *     manualmente no contato tem precedência e nunca é sobrescrito).
 *
 * pushName do WhatsApp não participa aqui — ele é apenas fallback e é
 * bloqueado por contactNameRules quando o nome atual é comercial/manual.
 */

interface Request {
  leadId: number;
  companyId: number;
  contactId?: number | null;
  newName: string;
  previousName?: string | null;
}

interface Response {
  opportunitiesUpdated: number;
  contactUpdated: boolean;
}

const PropagateLeadNameService = async ({
  leadId,
  companyId,
  contactId,
  newName,
  previousName
}: Request): Promise<Response> => {
  const result: Response = { opportunitiesUpdated: 0, contactUpdated: false };
  const trimmed = String(newName || "").trim();

  if (!trimmed || trimmed === String(previousName || "").trim()) {
    return result;
  }

  try {
    const [updatedCount] = await Opportunity.update(
      { title: trimmed },
      { where: { leadId, companyId, status: "OPEN" } }
    );
    result.opportunitiesUpdated = updatedCount || 0;
  } catch (err: any) {
    logger.warn(
      `[CrmSync] Falha ao propagar nome do lead ${leadId} para oportunidades: ${err?.message || err}`
    );
  }

  if (contactId) {
    try {
      const contact = await Contact.findOne({
        where: { id: contactId, companyId }
      });

      if (contact && !contact.isManualName && contact.name !== trimmed) {
        await contact.update({ name: trimmed });
        result.contactUpdated = true;
      }
    } catch (err: any) {
      logger.warn(
        `[CrmSync] Falha ao propagar nome do lead ${leadId} para contato ${contactId}: ${err?.message || err}`
      );
    }
  }

  return result;
};

export default PropagateLeadNameService;
