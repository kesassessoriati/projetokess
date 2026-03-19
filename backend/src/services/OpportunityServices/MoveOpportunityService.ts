import Opportunity from "../../models/Opportunity";
import OpportunityMovement from "../../models/OpportunityMovement";
import OpportunityEvent from "../../models/OpportunityEvent";
import AppError from "../../errors/AppError";
import EventBus from "../../libs/EventBus";
import PipelineStage from "../../models/PipelineStage";
import Contact from "../../models/Contact";
import findOrCreateLeadByContact from "../CrmLeadService/helpers/findOrCreateLeadByContact";

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

        // CORREÇÃO: Atualizar o CrmLead relacionado para manter sincronia do funil/estágio
        if (opportunity.leadId) {
            const CrmLead = (await import("../../models/CrmLead")).default;
            await CrmLead.update(
                { stageId: toStageId },
                { where: { id: opportunity.leadId, companyId } }
            );
        }
    } catch (err) {
        if (err.name === "SequelizeOptimisticLockError") {
            throw new AppError("ERR_CONCURRENT_UPDATE_DETECTED", 409);
        }
        throw err;
    }

    const movement = await OpportunityMovement.create({
        opportunityId,
        fromStageId,
        toStageId,
        movedBy,
        reason
    });

    const toStage = await PipelineStage.findOne({ where: { id: toStageId } });

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
        toStageId: opportunity.stageId,
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

    return opportunity;
};

export default MoveOpportunityService;
