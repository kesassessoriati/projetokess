import Opportunity from "../../models/Opportunity";
import OpportunityEvent from "../../models/OpportunityEvent";
import EventBus from "../../libs/EventBus";
import Contact from "../../models/Contact";
import CrmLead from "../../models/CrmLead";
import PipelineStage from "../../models/PipelineStage";
import findOrCreateLeadByContact from "../CrmLeadService/helpers/findOrCreateLeadByContact";
import logger from "../../utils/logger";
import { dispatchFlowTrigger } from "../FlowBuilderService/FlowTriggerDispatchService";
import AppError from "../../errors/AppError";
import FindOrMergeOpportunityInPipelineService from "./FindOrMergeOpportunityInPipelineService";
import ResolveOpportunityIdentityService from "./ResolveOpportunityIdentityService";

interface Request {
  companyId: number;
  pipelineId: number;
  stageId: number;
  contactId?: number;
  ticketId?: number;
  leadId?: number;
  phone?: string;
  number?: string;
  email?: string;
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
  phone,
  number,
  email,
  title,
  value = 0,
  assignedUserId
}: Request): Promise<Opportunity> => {
  const targetStage = await PipelineStage.findOne({
    where: {
      id: stageId,
      companyId,
      pipelineId
    }
  });

  if (!targetStage) {
    throw new AppError("Estágio selecionado não encontrado no funil informado.", 400);
  }

  const identity = await ResolveOpportunityIdentityService({
    companyId,
    contactId,
    leadId,
    phone,
    number,
    email,
    name: title,
    ticketId
  });

  let contact: Contact | null = identity.contact;
  let lead: CrmLead | null = identity.lead;
  contactId = identity.contactId;
  leadId = identity.leadId || leadId;

  if (contact && !leadId) {
    lead = await findOrCreateLeadByContact({ contact, companyId });
    if (lead) {
      leadId = lead.id;
    }
  }

  const existingOpportunity = await FindOrMergeOpportunityInPipelineService({
    companyId,
    pipelineId,
    stageId,
    contactId,
    ticketId,
    leadId,
    title,
    value,
    assignedUserId
  });

  if (existingOpportunity) {
    return existingOpportunity;
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

  if (opportunity.leadId) {
    const leadUpdate: Record<string, any> = {
      pipelineId: opportunity.pipelineId,
      stageId: opportunity.stageId
    };

    if (targetStage?.linkedStatus) {
      leadUpdate.status = targetStage.linkedStatus;
      leadUpdate.leadStatus = targetStage.linkedStatus;
    }

    await CrmLead.update(leadUpdate, {
      where: {
        id: opportunity.leadId,
        companyId
      }
    });
  }

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

  await EventBus.publish(
    "OPPORTUNITY_CREATED",
    {
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
    },
    opportunity.companyId
  );

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
  } catch (err: any) {
    logger.warn(`[CreateOpportunityService] Socket emit skipped: ${err?.message || err}`);
  }

  return opportunity;
};

export default CreateOpportunityService;
