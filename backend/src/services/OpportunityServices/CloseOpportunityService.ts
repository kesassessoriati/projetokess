import Opportunity from "../../models/Opportunity";
import OpportunityEvent from "../../models/OpportunityEvent";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import EventBus from "../../libs/EventBus";
import SyncLeadFromOpportunityService from "../CrmSyncService/SyncLeadFromOpportunityService";
import { dispatchFlowTrigger } from "../FlowBuilderService/FlowTriggerDispatchService";
import logger from "../../utils/logger";

/**
 * Fase C — Fechamento universal de oportunidade (GANHO/PERDIDO).
 *
 * Centraliza o que antes vivia inline no OpportunityController.update:
 *   WON  → Opportunity.status=WON  → lead "convertido" (+datas comerciais)
 *          → Cliente criado/atualizado idempotentemente (syncLeadToClient)
 *   LOST → Opportunity.status=LOST → lead "perdido"; preserva histórico;
 *          NÃO cria cliente; não apaga dados.
 * Sempre: eventos (OpportunityEvent/EventBus/flow triggers) e sockets de
 * opportunity e lead, para Kanban, módulo Leads e Clientes convergirem.
 */

interface Request {
  opportunityId: number;
  companyId: number;
  status: "WON" | "LOST";
  userId?: number | null;
  reason?: string | null;
  movedBy?: string | null;
}

interface Response {
  opportunity: Opportunity;
  lead: import("../../models/CrmLead").default | null;
  alreadyClosed: boolean;
}

const CloseOpportunityService = async ({
  opportunityId,
  companyId,
  status,
  userId,
  reason,
  movedBy
}: Request): Promise<Response> => {
  if (status !== "WON" && status !== "LOST") {
    throw new AppError("Status de fechamento inválido. Use WON ou LOST.", 400);
  }

  const opportunity = await Opportunity.findOne({
    where: { id: opportunityId, companyId }
  });

  if (!opportunity) {
    throw new AppError("Oportunidade não encontrada", 404);
  }

  const alreadyClosed = opportunity.status === status;
  const previousStatus = opportunity.status;

  if (!alreadyClosed) {
    await opportunity.update({
      status,
      lastMovedBy: movedBy || "USER"
    });

    await OpportunityEvent.create({
      companyId,
      opportunityId: opportunity.id,
      type: "UPDATED",
      metadata: {
        origin: "close_opportunity",
        status,
        previousStatus,
        reason: reason || null,
        userId: userId || null,
        text:
          status === "WON"
            ? "Oportunidade marcada como GANHA."
            : "Oportunidade marcada como PERDIDA."
      }
    });
  }

  // Sincroniza o lead (convertido/perdido) — mesmo em replays idempotentes,
  // para curar divergências deixadas por fluxos antigos.
  const syncResult = await SyncLeadFromOpportunityService({
    opportunity,
    companyId,
    closingStatus: status,
    emitSocket: true
  });

  // GANHO → Cliente criado/atualizado idempotentemente (nunca no PERDIDO).
  if (status === "WON" && syncResult.lead) {
    try {
      const syncLeadToClient = (
        await import("../CrmLeadService/helpers/syncLeadToClient")
      ).default;
      await syncLeadToClient(syncResult.lead);
    } catch (err: any) {
      logger.warn(
        `[CloseOpportunity] Falha ao sincronizar cliente do lead ${syncResult.lead.id}: ${err?.message || err}`
      );
    }
  }

  await EventBus.publish(
    "OPPORTUNITY_UPDATED",
    {
      opportunityId: opportunity.id,
      pipelineId: opportunity.pipelineId,
      stageId: opportunity.stageId,
      changes: { status: { before: previousStatus, after: status } },
      assignedUserId: opportunity.assignedUserId,
      status: opportunity.status,
      value: opportunity.value,
      updatedAt: opportunity.updatedAt,
      version: (opportunity as any).version
    },
    companyId
  );

  const contact = opportunity.contactId
    ? await Contact.findOne({ where: { id: opportunity.contactId, companyId } })
    : null;

  dispatchFlowTrigger(
    status === "WON" ? "opportunity_won" : "opportunity_lost",
    companyId,
    {
      ticketId: opportunity.ticketId || undefined,
      contactNumber: contact?.number || "",
      contactName: contact?.name || opportunity.title,
      contactEmail: contact?.email || "",
      metadata: {
        opportunityId: opportunity.id,
        pipelineId: opportunity.pipelineId,
        stageId: opportunity.stageId,
        leadId: opportunity.leadId,
        contactId: opportunity.contactId,
        value: opportunity.value,
        status: opportunity.status,
        reason: reason || null
      }
    }
  ).catch(() => null);

  try {
    const { getIO } = await import("../../libs/socket");
    const io = getIO();
    io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
      action: "update",
      opportunity
    });
  } catch (err: any) {
    logger.warn(`[CloseOpportunity] Socket emit skipped: ${err?.message || err}`);
  }

  return { opportunity, lead: syncResult.lead, alreadyClosed };
};

export default CloseOpportunityService;
