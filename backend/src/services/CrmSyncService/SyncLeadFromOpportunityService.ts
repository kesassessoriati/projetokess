import { Op, Transaction } from "sequelize";
import Opportunity from "../../models/Opportunity";
import CrmLead from "../../models/CrmLead";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import PipelineStage from "../../models/PipelineStage";
import {
  getBrazilianPhoneVariants,
  normalizePhoneNumber
} from "../../helpers/normalizeContactNumber";
import logger from "../../utils/logger";

/**
 * Fase B — Sincronização central Lead ← Opportunity.
 *
 * A Opportunity OPEN ativa é a fonte da verdade para pipelineId/stageId/status
 * do funil. CrmLead.pipelineId/stageId/status/leadStatus são CACHE derivado e
 * só devem ser escritos por este serviço (criação, merge, move e fechamento).
 *
 * Dados comerciais do Lead (nome, qualificação, origem, custom fields) são
 * preservados — este serviço só toca nos campos de sincronização.
 */

export type OpportunityClosingStatus = "WON" | "LOST" | null;

interface Request {
  opportunity?: Opportunity | null;
  opportunityId?: number;
  companyId: number;
  /** Quando o chamador está fechando a oportunidade (GANHO/PERDIDO). */
  closingStatus?: OpportunityClosingStatus;
  transaction?: Transaction;
  /** Emitir socket company-{id}-lead após sincronizar (default true). */
  emitSocket?: boolean;
}

interface Response {
  lead: CrmLead | null;
  /** true quando a Opportunity foi vinculada ao lead nesta chamada. */
  linked: boolean;
  /** status aplicado ao lead ("convertido"/"perdido"/linkedStatus) ou null. */
  appliedStatus: string | null;
}

const resolvePhoneVariants = (phone?: string | null): string[] => {
  const digits = String(phone || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return [];
  const normalized = normalizePhoneNumber(digits) || digits;
  return [...new Set(getBrazilianPhoneVariants(normalized))];
};

// Resolve o lead da oportunidade com segurança: leadId → contactId →
// contato do ticket → telefone do contato. Nunca inventa lead.
const resolveLead = async (
  opportunity: Opportunity,
  companyId: number,
  transaction?: Transaction
): Promise<CrmLead | null> => {
  if (opportunity.leadId) {
    return CrmLead.findOne({
      where: { id: opportunity.leadId, companyId },
      transaction
    });
  }

  let contactId = opportunity.contactId || null;

  if (!contactId && opportunity.ticketId) {
    const ticket = await Ticket.findOne({
      where: { id: opportunity.ticketId, companyId },
      attributes: ["id", "contactId"],
      transaction
    });
    contactId = ticket?.contactId || null;
  }

  if (contactId) {
    const byContact = await CrmLead.findOne({
      where: { contactId, companyId },
      order: [["updatedAt", "DESC"]],
      transaction
    });
    if (byContact) return byContact;

    const contact = await Contact.findOne({
      where: { id: contactId, companyId },
      attributes: ["id", "number"],
      transaction
    });
    const phoneVariants = resolvePhoneVariants(contact?.number);
    if (phoneVariants.length > 0) {
      return CrmLead.findOne({
        where: { companyId, phone: { [Op.in]: phoneVariants } },
        order: [["updatedAt", "DESC"]],
        transaction
      });
    }
  }

  return null;
};

// Guard: só vincula a Opportunity ao lead resolvido quando não há divergência
// de contato entre eles (não juntar pessoas diferentes).
const canLinkLead = (opportunity: Opportunity, lead: CrmLead): boolean => {
  if (!opportunity.contactId || !lead.contactId) return true;
  return Number(opportunity.contactId) === Number(lead.contactId);
};

const SyncLeadFromOpportunityService = async ({
  opportunity: initialOpportunity,
  opportunityId,
  companyId,
  closingStatus = null,
  transaction,
  emitSocket = true
}: Request): Promise<Response> => {
  const empty: Response = { lead: null, linked: false, appliedStatus: null };

  let opportunity = initialOpportunity || null;
  if (!opportunity && opportunityId) {
    opportunity = await Opportunity.findOne({
      where: { id: opportunityId, companyId },
      transaction
    });
  }
  if (!opportunity || Number(opportunity.companyId) !== Number(companyId)) {
    return empty;
  }

  const lead = await resolveLead(opportunity, companyId, transaction);
  if (!lead) {
    logger.warn(
      `[CrmSync] Oportunidade ${opportunity.id} sem lead resolvível (companyId=${companyId}, contactId=${opportunity.contactId || "-"}, ticketId=${opportunity.ticketId || "-"}) — sincronização ignorada.`
    );
    return empty;
  }

  let linked = false;
  if (!opportunity.leadId && canLinkLead(opportunity, lead)) {
    await opportunity.update({ leadId: lead.id }, { transaction });
    linked = true;
  } else if (!opportunity.leadId) {
    logger.warn(
      `[CrmSync] Lead ${lead.id} não vinculado à oportunidade ${opportunity.id}: contato divergente (lead.contactId=${lead.contactId}, opp.contactId=${opportunity.contactId}).`
    );
    return empty;
  }

  const updates: Record<string, unknown> = {};

  if (Number(lead.pipelineId) !== Number(opportunity.pipelineId)) {
    updates.pipelineId = opportunity.pipelineId;
  }
  if (Number(lead.stageId) !== Number(opportunity.stageId)) {
    updates.stageId = opportunity.stageId;
  }
  if (!lead.contactId && opportunity.contactId) {
    updates.contactId = opportunity.contactId;
  }
  if (opportunity.ticketId && !lead.primaryTicketId) {
    updates.primaryTicketId = opportunity.ticketId;
  }

  let appliedStatus: string | null = null;

  if (closingStatus === "WON") {
    const conversionDate = new Date();
    appliedStatus = "convertido";
    updates.status = appliedStatus;
    updates.leadStatus = appliedStatus;
    updates.clientSince = conversionDate;
    updates.acquisitionDate = conversionDate;
  } else if (closingStatus === "LOST") {
    appliedStatus = "perdido";
    updates.status = appliedStatus;
    updates.leadStatus = appliedStatus;
  } else {
    const stage = await PipelineStage.findOne({
      where: {
        id: opportunity.stageId,
        pipelineId: opportunity.pipelineId,
        companyId
      },
      transaction
    });
    if (stage?.linkedStatus) {
      appliedStatus = stage.linkedStatus;
      updates.status = appliedStatus;
      updates.leadStatus = appliedStatus;
    }
  }

  if (Object.keys(updates).length > 0) {
    await lead.update(
      { ...updates, lastActivityAt: new Date() },
      { transaction }
    );
  }

  if (emitSocket) {
    const emit = async () => {
      try {
        const { getIO } = await import("../../libs/socket");
        const io = getIO();
        io.to(companyId.toString()).emit(`company-${companyId}-lead`, {
          action: "update",
          lead
        });
      } catch (err: any) {
        logger.warn(`[CrmSync] Socket emit skipped: ${err?.message || err}`);
      }
    };

    if (transaction) {
      transaction.afterCommit(() => {
        emit().catch(() => undefined);
      });
    } else {
      await emit();
    }
  }

  return { lead, linked, appliedStatus };
};

export default SyncLeadFromOpportunityService;
