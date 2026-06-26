import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import CrmLead from "../../models/CrmLead";
import Opportunity from "../../models/Opportunity";
import OpportunityEvent from "../../models/OpportunityEvent";
import PipelineStage from "../../models/PipelineStage";
import EventBus from "../../libs/EventBus";
import { getIO } from "../../libs/socket";
import logger from "../../utils/logger";

interface Request {
  companyId: number;
  pipelineId: number;
  stageId: number;
  contactId?: number | null;
  ticketId?: number | null;
  leadId?: number | null;
  title?: string | null;
  value?: number | null;
  assignedUserId?: number | null;
}

const hasValue = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim() !== "";

const isEmptyValue = (value: unknown): boolean =>
  value === null || value === undefined || String(value).trim() === "";

const resolveScopedLead = async (
  companyId: number,
  leadId?: number | null
): Promise<CrmLead | null> => {
  if (!leadId) return null;

  const lead = await CrmLead.findOne({ where: { id: leadId, companyId } });
  if (!lead) {
    throw new AppError("Lead informado não encontrado para esta empresa.", 404);
  }

  return lead;
};

const resolveScopedContact = async ({
  companyId,
  contactId,
  lead
}: {
  companyId: number;
  contactId?: number | null;
  lead?: CrmLead | null;
}): Promise<Contact | null> => {
  const resolvedContactId = contactId || lead?.contactId;
  if (!resolvedContactId) return null;

  const contact = await Contact.findOne({
    where: { id: resolvedContactId, companyId }
  });

  if (!contact) {
    throw new AppError("Contato informado não encontrado para esta empresa.", 404);
  }

  return contact;
};

const ensureStageBelongsToPipeline = async ({
  companyId,
  pipelineId,
  stageId
}: {
  companyId: number;
  pipelineId: number;
  stageId: number;
}): Promise<PipelineStage> => {
  const stage = await PipelineStage.findOne({
    where: { id: stageId, pipelineId, companyId }
  });

  if (!stage) {
    throw new AppError("Estágio selecionado não encontrado no funil informado.", 400);
  }

  return stage;
};

const findExistingOpportunity = async ({
  companyId,
  pipelineId,
  contactId,
  leadId
}: {
  companyId: number;
  pipelineId: number;
  contactId?: number | null;
  leadId?: number | null;
}): Promise<Opportunity | null> => {
  const or: Record<string, unknown>[] = [];

  if (contactId) {
    or.push({ contactId });
  }

  if (leadId) {
    or.push({ leadId });
  }

  if (!or.length) return null;

  return Opportunity.findOne({
    where: {
      companyId,
      pipelineId,
      [Op.or]: or
    },
    order: [
      ["updatedAt", "DESC"],
      ["id", "DESC"]
    ]
  });
};

const mergeSafeLeadFields = async ({
  existingOpportunity,
  incomingLead,
  contactId
}: {
  existingOpportunity: Opportunity;
  incomingLead?: CrmLead | null;
  contactId?: number | null;
}) => {
  const targetLeadId = existingOpportunity.leadId || incomingLead?.id;
  if (!targetLeadId) return;

  const targetLead = await CrmLead.findOne({
    where: { id: targetLeadId, companyId: existingOpportunity.companyId }
  });
  if (!targetLead) return;

  const updates: Record<string, unknown> = {};

  if (contactId && !targetLead.contactId) {
    updates.contactId = contactId;
  }

  if (incomingLead && incomingLead.id !== targetLead.id) {
    const safeFields = [
      "name",
      "email",
      "phone",
      "document",
      "companyName",
      "source",
      "campaign",
      "medium",
      "product",
      "notes",
      "position",
      "decisionMakerName",
      "decisionMakerPhone",
      "gmn",
      "website",
      "instagram",
      "linkedin"
    ];

    for (const field of safeFields) {
      const currentValue = (targetLead as any)[field];
      const incomingValue = (incomingLead as any)[field];
      if (isEmptyValue(currentValue) && hasValue(incomingValue)) {
        updates[field] = incomingValue;
      }
    }

    if (
      (targetLead.purchaseValue === null ||
        targetLead.purchaseValue === undefined ||
        Number(targetLead.purchaseValue) === 0) &&
      incomingLead.purchaseValue !== null &&
      incomingLead.purchaseValue !== undefined
    ) {
      updates.purchaseValue = incomingLead.purchaseValue;
    }
  }

  if (Object.keys(updates).length > 0) {
    await targetLead.update({
      ...updates,
      lastActivityAt: new Date()
    });
  }
};

const FindOrMergeOpportunityInPipelineService = async ({
  companyId,
  pipelineId,
  stageId,
  contactId,
  ticketId,
  leadId,
  title,
  value,
  assignedUserId
}: Request): Promise<Opportunity | null> => {
  await ensureStageBelongsToPipeline({ companyId, pipelineId, stageId });

  const lead = await resolveScopedLead(companyId, leadId);
  const contact = await resolveScopedContact({ companyId, contactId, lead });
  const resolvedContactId = contact?.id || null;
  const resolvedLeadId = lead?.id || null;

  const existingOpportunity = await findExistingOpportunity({
    companyId,
    pipelineId,
    contactId: resolvedContactId,
    leadId: resolvedLeadId
  });

  if (!existingOpportunity) return null;

  const updates: Record<string, unknown> = {};
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  if (resolvedContactId && !existingOpportunity.contactId) {
    updates.contactId = resolvedContactId;
    changes.contactId = { before: existingOpportunity.contactId, after: resolvedContactId };
  }

  if (ticketId && !existingOpportunity.ticketId) {
    updates.ticketId = ticketId;
    changes.ticketId = { before: existingOpportunity.ticketId, after: ticketId };
  }

  if (resolvedLeadId && !existingOpportunity.leadId) {
    updates.leadId = resolvedLeadId;
    changes.leadId = { before: existingOpportunity.leadId, after: resolvedLeadId };
  }

  if (hasValue(title) && isEmptyValue(existingOpportunity.title)) {
    updates.title = String(title).trim();
    changes.title = { before: existingOpportunity.title, after: updates.title };
  }

  if (
    value !== null &&
    value !== undefined &&
    Number(value) > 0 &&
    (existingOpportunity.value === null ||
      existingOpportunity.value === undefined ||
      Number(existingOpportunity.value) === 0)
  ) {
    updates.value = Number(value);
    changes.value = { before: existingOpportunity.value, after: updates.value };
  }

  if (assignedUserId && !existingOpportunity.assignedUserId) {
    updates.assignedUserId = assignedUserId;
    changes.assignedUserId = {
      before: existingOpportunity.assignedUserId,
      after: assignedUserId
    };
  }

  if (Object.keys(updates).length > 0) {
    await existingOpportunity.update(updates);
  }

  await mergeSafeLeadFields({
    existingOpportunity,
    incomingLead: lead,
    contactId: resolvedContactId
  });

  await OpportunityEvent.create({
    companyId,
    opportunityId: existingOpportunity.id,
    type: "UPDATED",
    metadata: {
      origin: "dedupe_same_pipeline",
      preservedStageId: existingOpportunity.stageId,
      attemptedStageId: stageId,
      attemptedPipelineId: pipelineId,
      changes,
      text:
        "Tentativa de criar/importar card duplicado no mesmo funil foi mesclada ao card existente."
    }
  });

  await EventBus.publish(
    "OPPORTUNITY_UPDATED",
    {
      opportunityId: existingOpportunity.id,
      pipelineId: existingOpportunity.pipelineId,
      stageId: existingOpportunity.stageId,
      changes,
      assignedUserId: existingOpportunity.assignedUserId,
      status: existingOpportunity.status,
      value: existingOpportunity.value,
      updatedAt: existingOpportunity.updatedAt,
      version: existingOpportunity.version
    },
    companyId
  );

  try {
    const io = getIO();
    io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
      action: "update",
      opportunity: existingOpportunity
    });
  } catch (err) {
    logger.warn(
      `[FindOrMergeOpportunityInPipelineService] Socket emit skipped: ${err?.message || err}`
    );
  }

  logger.info(
    `[FindOrMergeOpportunityInPipelineService] Duplicate card merged company=${companyId} pipeline=${pipelineId} opportunity=${existingOpportunity.id} contact=${resolvedContactId || "none"} lead=${resolvedLeadId || "none"}`
  );

  return existingOpportunity;
};

export default FindOrMergeOpportunityInPipelineService;
