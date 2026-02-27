import Opportunity from "../../models/Opportunity";
import OpportunityEvent from "../../models/OpportunityEvent";
import EventBus from "../../libs/EventBus";

interface Request {
    companyId: number;
    pipelineId: number;
    stageId: number;
    contactId?: number;
    leadId?: number;
    title: string;
    value?: number;
    assignedUserId?: number;
}

const CreateOpportunityService = async ({
    companyId,
    pipelineId,
    stageId,
    contactId,
    leadId,
    title,
    value = 0,
    assignedUserId
}: Request): Promise<Opportunity> => {
    const opportunity = await Opportunity.create({
        companyId,
        pipelineId,
        stageId,
        contactId,
        leadId,
        title,
        value,
        assignedUserId,
        status: "OPEN"
    });

    await OpportunityEvent.create({
        opportunityId: opportunity.id,
        type: "CREATED",
        metadata: {
            initialStageId: stageId,
            title,
            value
        }
    });

    // Publicar no Event Bus Interno
    await EventBus.publish("OPPORTUNITY_CREATED", {
        opportunityId: opportunity.id,
        pipelineId: opportunity.pipelineId,
        stageId: opportunity.stageId,
        companyId: opportunity.companyId,
        value: opportunity.value
    }, opportunity.companyId);

    return opportunity;
};

export default CreateOpportunityService;
