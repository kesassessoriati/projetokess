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

        // Auto-sync CrmLead: update stageId and optionally status from stage.linkedStatus
        if (opportunity.leadId) {
            const CrmLead = (await import("../../models/CrmLead")).default;
            const leadUpdate: Record<string, any> = {
                stageId: toStageId,
                pipelineId: toStage?.pipelineId || opportunity.pipelineId
            };

            if (toStage?.linkedStatus) {
                leadUpdate.status = toStage.linkedStatus;
                leadUpdate.leadStatus = toStage.linkedStatus;
            }

            await CrmLead.update(leadUpdate, {
                where: { id: opportunity.leadId, companyId }
            });

            // Emit socket event so open LeadModal re-renders with updated status
            try {
                const { getIO } = await import("../../libs/socket");
                const io = getIO();
                let updatedLead = await CrmLead.findOne({ where: { id: opportunity.leadId } });
                
                if (updatedLead && leadUpdate.status === "convertido") {
                    const syncLeadToClient = (await import("../CrmLeadService/helpers/syncLeadToClient")).default;
                    await syncLeadToClient(updatedLead);
                    updatedLead = await CrmLead.findOne({ where: { id: opportunity.leadId } });
                }
                if (updatedLead) {
                    io.to(companyId.toString()).emit(`company-${companyId}-lead`, {
                        action: "update",
                        lead: updatedLead
                    });
                }
            } catch (_) { /* non-critical */ }
        }
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
