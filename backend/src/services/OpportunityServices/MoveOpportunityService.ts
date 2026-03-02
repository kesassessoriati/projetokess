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
    } catch (err) {
        if (err.name === "SequelizeOptimisticLockError") {
            throw new AppError("ERR_CONCURRENT_UPDATE_DETECTED", 409);
        }
        throw err;
    }

    await OpportunityMovement.create({
        opportunityId,
        fromStageId,
        toStageId,
        movedBy,
        reason
    });

    const toStage = await PipelineStage.findOne({ where: { id: toStageId } });

    await OpportunityEvent.create({
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
        companyId: opportunity.companyId,
        value: opportunity.value
    }, opportunity.companyId);

    await opportunity.reload();

    return opportunity;
};

export default MoveOpportunityService;
