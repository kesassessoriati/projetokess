import Opportunity from "../../models/Opportunity";
import OpportunityEvent from "../../models/OpportunityEvent";
import EventBus from "../../libs/EventBus";
import Contact from "../../models/Contact";
import findOrCreateLeadByContact from "../CrmLeadService/helpers/findOrCreateLeadByContact";
import logger from "../../utils/logger";
import { dispatchFlowTrigger } from "../FlowBuilderService/FlowTriggerDispatchService";

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

    let contact: Contact | null = null;

    if (contactId) {
        contact = await Contact.findOne({
            where: { id: contactId, companyId }
        });
        if (contact && !leadId) {
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

    dispatchFlowTrigger("opportunity_created", companyId, {
        ticketId: opportunity.ticketId || undefined,
        contactNumber: contact?.number || "",
        contactName: contact?.name || title,
        contactEmail: contact?.email || "",
        metadata: {
            opportunityId: opportunity.id,
            pipelineId: opportunity.pipelineId,
            stageId: opportunity.stageId,
            leadId: opportunity.leadId,
            contactId: opportunity.contactId,
            value: opportunity.value,
            status: opportunity.status
        }
    }).catch(() => null);

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
