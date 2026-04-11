import Opportunity from "../../models/Opportunity";
import OpportunityEvent from "../../models/OpportunityEvent";
import EventBus from "../../libs/EventBus";
import Contact from "../../models/Contact";
import findOrCreateLeadByContact from "../CrmLeadService/helpers/findOrCreateLeadByContact";
import logger from "../../utils/logger";

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
        companyId,
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
        assignedUserId: opportunity.assignedUserId,
        contactId: opportunity.contactId,
        ticketId: opportunity.ticketId,
        leadId: opportunity.leadId,
        companyId: opportunity.companyId,
        status: opportunity.status,
        value: opportunity.value,
        createdAt: opportunity.createdAt
    }, opportunity.companyId);

    try {
        const { getIO } = await import("../../libs/socket");
        const io = getIO();
        io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
            action: "create",
            opportunity
        });
    } catch (err) {
        logger.warn(`[CreateOpportunityService] Socket emit skipped: ${err?.message || err}`);
    }

    return opportunity;
};

export default CreateOpportunityService;
