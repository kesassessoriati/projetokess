import Opportunity from "../../models/Opportunity";
import OpportunityMovement from "../../models/OpportunityMovement";
import OpportunityEvent from "../../models/OpportunityEvent";
import AppError from "../../errors/AppError";
import EventBus from "../../libs/EventBus";

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
        await opportunity.update({
            stageId: toStageId
        });
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

    await OpportunityEvent.create({
        opportunityId,
        type: "MOVED",
        metadata: {
            fromStageId,
            toStageId,
            movedBy,
            reason
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
