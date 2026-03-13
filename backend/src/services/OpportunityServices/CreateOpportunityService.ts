import Opportunity from "../../models/Opportunity";
import OpportunityEvent from "../../models/OpportunityEvent";
import EventBus from "../../libs/EventBus";
import Contact from "../../models/Contact";
import findOrCreateLeadByContact from "../CrmLeadService/helpers/findOrCreateLeadByContact";

interface Request {
    companyId: number;
    pipelineId: number;
    stageId: number;
    contactId?: number;
    ticketId?: number;
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
    ticketId,
    leadId,
    title,
    value = 0,
    assignedUserId
}: Request): Promise<Opportunity> => {

    if (contactId && !leadId) {
        const contact = await Contact.findOne({
            where: { id: contactId, companyId }
        });
        if (contact) {
            const lead = await findOrCreateLeadByContact({ contact, companyId });
            if (lead) {
                leadId = lead.id;
            }
        }
    }

    const opportunity = await Opportunity.create({
        companyId,
        pipelineId,
        stageId,
        contactId,
        ticketId,
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
