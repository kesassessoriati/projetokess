import Opportunity from "../../models/Opportunity";
import OpportunityMovement from "../../models/OpportunityMovement";
import OpportunityEvent from "../../models/OpportunityEvent";
import AppError from "../../errors/AppError";
import EventBus from "../../libs/EventBus";
import PipelineStage from "../../models/PipelineStage";
import Contact from "../../models/Contact";
import findOrCreateLeadByContact from "../CrmLeadService/helpers/findOrCreateLeadByContact";
import logger from "../../utils/logger";
import { dispatchFlowTrigger } from "../FlowBuilderService/FlowTriggerDispatchService";

interface Request {
    opportunityId: number;
    toStageId: number;
    companyId: number;
    movedBy?: "USER" | "AI" | "AUTOMATION";
    reason?: string;
}

const MoveOpportunityService = async ({
    opportunityId,
    toStageId,
    companyId,
    movedBy = "USER",
    reason
}: Request): Promise<Opportunity> => {
    const opportunity = await Opportunity.findOne({
        where: { id: opportunityId, companyId }
    });

    if (!opportunity) {
        throw new AppError("ERR_NO_OPPORTUNITY_FOUND", 404);
    }

    const fromStageId = opportunity.stageId;

    if (fromStageId === toStageId) {
        return opportunity;
    }

    // Fetch destination stage upfront so linkedStatus is available inside the try block
    const toStage = await PipelineStage.findOne({
        where: {
            id: toStageId,
            companyId,
            pipelineId: opportunity.pipelineId
        }
    });

    if (!toStage) {
        throw new AppError("Estágio de destino não encontrado neste funil.", 404);
    }

    try {
        const updateData: any = {
            stageId: toStageId,
            lastMovedBy: movedBy
        };

        if (opportunity.contactId) {
            const contact = await Contact.findOne({
                where: { id: opportunity.contactId, companyId }
            });
            if (contact) {
                const lead = await findOrCreateLeadByContact({ contact, companyId });
                if (lead && lead.id !== opportunity.leadId) {
                    updateData.leadId = lead.id;
                }
            }
        }

        await opportunity.update(updateData);

        // Sincronização central Lead ← Opportunity (Fase B). O serviço atualiza
        // pipelineId/stageId/status do lead e emite o socket company-{id}-lead.
        try {
            const { default: SyncLeadFromOpportunityService } = await import(
                "../CrmSyncService/SyncLeadFromOpportunityService"
            );
            const syncResult = await SyncLeadFromOpportunityService({
                opportunity,
                companyId,
                emitSocket: true
            });

            // Etapa com linkedStatus "convertido" também converte em Cliente.
            if (syncResult.lead && syncResult.appliedStatus === "convertido") {
                const syncLeadToClient = (await import("../CrmLeadService/helpers/syncLeadToClient")).default;
                await syncLeadToClient(syncResult.lead);
            }
        } catch (_) { /* non-critical */ }
    } catch (err) {
        if (err.name === "SequelizeOptimisticLockError") {
            throw new AppError("ERR_CONCURRENT_UPDATE_DETECTED", 409);
        }
        throw err;
    }

    const movement = await OpportunityMovement.create({
        companyId,
        opportunityId,
        fromStageId,
        toStageId,
        movedBy,
        reason
    });

    await OpportunityEvent.create({
        companyId,
        opportunityId,
        type: "MOVED",
        metadata: {
            fromStageId,
            toStageId,
            movedBy,
            reason,
            text: `Estágio atualizado para: ${toStage?.name || toStageId}`
        }
    });

    // Publicar no Event Bus Interno
    await EventBus.publish("OPPORTUNITY_MOVED", {
        opportunityId: opportunity.id,
        pipelineId: opportunity.pipelineId,
        fromStageId,
        toStageId,
        assignedUserId: opportunity.assignedUserId,
        companyId: opportunity.companyId,
        status: opportunity.status,
        value: opportunity.value,
        movementId: movement.id,
        movedBy,
        reason,
        movedAt: movement.createdAt
    }, opportunity.companyId);

    await opportunity.reload();

    const contact = opportunity.contactId
        ? await Contact.findOne({ where: { id: opportunity.contactId, companyId } })
        : null;

    const triggerData = {
        ticketId: opportunity.ticketId || undefined,
        contactNumber: contact?.number || "",
        contactName: contact?.name || opportunity.title,
        contactEmail: contact?.email || "",
        metadata: {
            opportunityId: opportunity.id,
            pipelineId: opportunity.pipelineId,
            fromStageId,
            stageId: opportunity.stageId,
            toStageId,
            leadId: opportunity.leadId,
            contactId: opportunity.contactId,
            value: opportunity.value,
            status: opportunity.status,
            movedBy,
            reason
        }
    };

    dispatchFlowTrigger("opportunity_moved", companyId, triggerData).catch(() => null);
    dispatchFlowTrigger("kanban_event", companyId, {
        ...triggerData,
        metadata: { ...triggerData.metadata, event: "opportunity_moved" }
    }).catch(() => null);

    // O gatilho "Lead movido" também cobre moves feitos pelo board: o sync
    // Lead ← Opportunity (SyncLeadFromOpportunityService) atualiza o lead sem
    // disparar gatilhos, e a categoria "Negócios" saiu da UI de gatilhos —
    // sem isto, mover o card só dispararia opportunity_moved (legado).
    if (opportunity.leadId) {
        const leadTriggerData = {
            ...triggerData,
            metadata: { ...triggerData.metadata, event: "lead_stage_changed" }
        };
        dispatchFlowTrigger("lead_stage_changed", companyId, leadTriggerData).catch(() => null);
        dispatchFlowTrigger("move_lead", companyId, leadTriggerData).catch(() => null);
    }

    // Disparo de conversões de anúncios (Meta Ads / Google Ads)
    import("../AdTrackingServices/DispatchAdTrackingService")
        .then(({ default: dispatchAdTracking }) => dispatchAdTracking({
            companyId,
            pipelineId: opportunity.pipelineId,
            stageId: toStageId,
            opportunityId: opportunity.id,
            leadId: opportunity.leadId || undefined,
            contactId: opportunity.contactId || undefined,
            ticketId: opportunity.ticketId || undefined,
            value: opportunity.value || undefined
        }))
        .catch(() => null);

    try {
        const { getIO } = await import("../../libs/socket");
        const io = getIO();
        io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
            action: "update",
            opportunity
        });
    } catch (err) {
        logger.warn(`[MoveOpportunityService] Socket emit skipped: ${err?.message || err}`);
    }

    return opportunity;
};

export default MoveOpportunityService;
