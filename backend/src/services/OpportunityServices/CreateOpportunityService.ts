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
import SyncLeadFromOpportunityService from "../CrmSyncService/SyncLeadFromOpportunityService";
import { Transaction } from "sequelize";

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
  transaction?: Transaction;
}

const runAfterCommit = (
  transaction: Transaction | undefined,
  callback: () => Promise<void>
) => {
  if (transaction) {
    transaction.afterCommit(() => {
      callback().catch(err => {
        logger.warn(
          `[CreateOpportunityService] Post-commit side effect skipped: ${
            err?.message || err
          }`
        );
      });
    });
    return;
  }

  callback().catch(err => {
    logger.warn(
      `[CreateOpportunityService] Post-commit side effect skipped: ${
        err?.message || err
      }`
    );
  });
};

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
  assignedUserId,
  transaction
}: Request): Promise<Opportunity> => {
  const targetStage = await PipelineStage.findOne({
    where: {
      id: stageId,
      companyId,
      pipelineId
    },
    transaction
  });

  if (!targetStage) {
    throw new AppError(
      "Estágio selecionado não encontrado no funil informado.",
      400
    );
  }

  const identity = await ResolveOpportunityIdentityService({
    companyId,
    contactId,
    leadId,
    phone,
    number,
    email,
    name: title,
    ticketId,
    // Fase A: cards sem contato são permitidos (forms web/API externa) e
    // deduplicados pela cascata do FindOrMerge (leadId/telefone/título).
    allowMissingContact: true,
    transaction
  });

  let contact: Contact | null = identity.contact;
  let lead: CrmLead | null = identity.lead;
  contactId = identity.contactId || contactId;
  leadId = identity.leadId || leadId;

  if (contact && !leadId) {
    lead = await findOrCreateLeadByContact({ contact, companyId, transaction });
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
    phone: phone || number,
    title,
    value,
    assignedUserId,
    transaction
  });

  if (existingOpportunity) {
    return existingOpportunity;
  }

  const opportunity = await Opportunity.create(
    {
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
    },
    { transaction }
  );

  // Sincronização central Lead ← Opportunity (Fase B): cache derivado do lead
  // (pipelineId/stageId/status) é mantido por um único serviço.
  await SyncLeadFromOpportunityService({
    opportunity,
    companyId,
    transaction,
    emitSocket: true
  });

  await OpportunityEvent.create(
    {
      companyId,
      opportunityId: opportunity.id,
      type: "CREATED",
      metadata: {
        initialStageId: stageId,
        title,
        value
      }
    },
    { transaction }
  );

  runAfterCommit(transaction, async () => {
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
      logger.warn(
        `[CreateOpportunityService] Socket emit skipped: ${err?.message || err}`
      );
    }
  });

  return opportunity;
};

export default CreateOpportunityService;
