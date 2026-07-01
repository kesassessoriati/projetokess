import { Op, Transaction } from "sequelize";
import AppError from "../../errors/AppError";
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
  contactId: number;
  ticketId?: number | null;
  leadId?: number | null;
  title?: string | null;
  value?: number | null;
  assignedUserId?: number | null;
  transaction?: Transaction;
}

const hasValue = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim() !== "";

const isEmptyValue = (value: unknown): boolean =>
  value === null || value === undefined || String(value).trim() === "";

const ensureStageBelongsToPipeline = async ({
  companyId,
  pipelineId,
  stageId,
  transaction
}: {
  companyId: number;
  pipelineId: number;
  stageId: number;
  transaction?: Transaction;
}): Promise<PipelineStage> => {
  const stage = await PipelineStage.findOne({
    where: { id: stageId, pipelineId, companyId },
    transaction
  });

  if (!stage) {
    throw new AppError(
      "Estágio selecionado não encontrado no funil informado.",
      400
    );
  }

  return stage;
};

const findMatchingOpenOpportunities = async ({
  companyId,
  pipelineId,
  contactId,
  leadId,
  transaction
}: {
  companyId: number;
  pipelineId: number;
  contactId: number;
  leadId?: number | null;
  transaction?: Transaction;
}): Promise<Opportunity[]> => {
  const or: Record<string, unknown>[] = [{ contactId }];
  if (leadId) or.push({ leadId });

  return Opportunity.findAll({
    where: {
      companyId,
      pipelineId,
      status: "OPEN",
      [Op.or]: or
    },
    order: [
      ["createdAt", "ASC"],
      ["id", "ASC"]
    ],
    transaction
  });
};

const mergeSafeLeadFields = async ({
  canonical,
  incomingLeadId,
  contactId,
  transaction
}: {
  canonical: Opportunity;
  incomingLeadId?: number | null;
  contactId: number;
  transaction?: Transaction;
}) => {
  const targetLeadId = canonical.leadId || incomingLeadId;
  if (!targetLeadId) return;

  const targetLead = await CrmLead.findOne({
    where: { id: targetLeadId, companyId: canonical.companyId },
    transaction
  });
  if (!targetLead) return;

  const updates: Record<string, unknown> = {};
  if (!targetLead.contactId) updates.contactId = contactId;
  if (Number(targetLead.pipelineId) !== Number(canonical.pipelineId)) {
    updates.pipelineId = canonical.pipelineId;
  }
  if (Number(targetLead.stageId) !== Number(canonical.stageId)) {
    updates.stageId = canonical.stageId;
  }

  const canonicalStage = await PipelineStage.findOne({
    where: {
      id: canonical.stageId,
      pipelineId: canonical.pipelineId,
      companyId: canonical.companyId
    },
    transaction
  });

  if (canonicalStage?.linkedStatus) {
    updates.status = canonicalStage.linkedStatus;
    updates.leadStatus = canonicalStage.linkedStatus;
  }

  if (Object.keys(updates).length > 0) {
    await targetLead.update(
      {
        ...updates,
        lastActivityAt: new Date()
      },
      { transaction }
    );
  }
};

const buildCanonicalUpdates = ({
  canonical,
  contactId,
  leadId,
  ticketId,
  title,
  value,
  assignedUserId
}: {
  canonical: Opportunity;
  contactId: number;
  leadId?: number | null;
  ticketId?: number | null;
  title?: string | null;
  value?: number | null;
  assignedUserId?: number | null;
}) => {
  const updates: Record<string, unknown> = {};
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  const setIfEmpty = (field: string, nextValue: unknown) => {
    if (hasValue(nextValue) && isEmptyValue((canonical as any)[field])) {
      updates[field] = nextValue;
      changes[field] = { before: (canonical as any)[field], after: nextValue };
    }
  };

  setIfEmpty("contactId", contactId);
  setIfEmpty("leadId", leadId);
  setIfEmpty("ticketId", ticketId);
  setIfEmpty("title", title ? String(title).trim() : null);
  setIfEmpty("assignedUserId", assignedUserId);

  if (
    value !== null &&
    value !== undefined &&
    Number(value) > 0 &&
    (canonical.value === null ||
      canonical.value === undefined ||
      Number(canonical.value) === 0)
  ) {
    updates.value = Number(value);
    changes.value = { before: canonical.value, after: updates.value };
  }

  return { updates, changes };
};

const buildDuplicateDataMerge = (
  canonical: Opportunity,
  duplicate: Opportunity
) => {
  const updates: Record<string, unknown> = {};
  const changes: Record<
    string,
    { before: unknown; after: unknown; sourceOpportunityId: number }
  > = {};

  const setIfEmptyFromDuplicate = (field: string) => {
    const currentValue = (canonical as any)[field];
    const duplicateValue = (duplicate as any)[field];
    if (isEmptyValue(currentValue) && hasValue(duplicateValue)) {
      updates[field] = duplicateValue;
      changes[field] = {
        before: currentValue,
        after: duplicateValue,
        sourceOpportunityId: duplicate.id
      };
    }
  };

  [
    "contactId",
    "leadId",
    "ticketId",
    "assignedUserId",
    "title",
    "temperature",
    "slaDeadline",
    "aiSuggestedStageId"
  ].forEach(setIfEmptyFromDuplicate);

  if (
    Number((canonical as any).value || 0) === 0 &&
    Number((duplicate as any).value || 0) > 0
  ) {
    updates.value = duplicate.value;
    changes.value = {
      before: canonical.value,
      after: duplicate.value,
      sourceOpportunityId: duplicate.id
    };
  }

  if (
    Number((canonical as any).score || 0) === 0 &&
    Number((duplicate as any).score || 0) > 0
  ) {
    updates.score = duplicate.score;
    changes.score = {
      before: canonical.score,
      after: duplicate.score,
      sourceOpportunityId: duplicate.id
    };
  }

  return { updates, changes };
};

const runAfterCommit = (
  transaction: Transaction | undefined,
  callback: () => Promise<void>
) => {
  if (transaction) {
    transaction.afterCommit(() => {
      callback().catch(err => {
        logger.warn(
          `[FindOrMergeOpportunityInPipelineService] Post-commit side effect skipped: ${
            err?.message || err
          }`
        );
      });
    });
    return;
  }

  callback().catch(err => {
    logger.warn(
      `[FindOrMergeOpportunityInPipelineService] Post-commit side effect skipped: ${
        err?.message || err
      }`
    );
  });
};

const emitOpportunityUpdate = async (
  companyId: number,
  canonical: Opportunity,
  changes: Record<string, unknown>,
  transaction?: Transaction
) => {
  runAfterCommit(transaction, async () => {
    await EventBus.publish(
      "OPPORTUNITY_UPDATED",
      {
        opportunityId: canonical.id,
        pipelineId: canonical.pipelineId,
        stageId: canonical.stageId,
        changes,
        assignedUserId: canonical.assignedUserId,
        status: canonical.status,
        value: canonical.value,
        updatedAt: canonical.updatedAt,
        version: canonical.version
      },
      companyId
    );

    try {
      const io = getIO();
      io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
        action: "update",
        opportunity: canonical
      });
    } catch (err: any) {
      logger.warn(
        `[FindOrMergeOpportunityInPipelineService] Socket emit skipped: ${
          err?.message || err
        }`
      );
    }
  });
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
  assignedUserId,
  transaction
}: Request): Promise<Opportunity | null> => {
  await ensureStageBelongsToPipeline({
    companyId,
    pipelineId,
    stageId,
    transaction
  });

  if (!contactId) {
    throw new AppError(
      "Não é permitido criar card no funil sem telefone/contato válido.",
      400
    );
  }

  const matches = await findMatchingOpenOpportunities({
    companyId,
    pipelineId,
    contactId,
    leadId,
    transaction
  });

  if (matches.length === 0) return null;

  const canonical = matches[0];
  const duplicates = matches.slice(1);
  const duplicateIds = duplicates.map(opportunity => opportunity.id);

  const { updates, changes } = buildCanonicalUpdates({
    canonical,
    contactId,
    leadId,
    ticketId,
    title,
    value,
    assignedUserId
  });

  if (Object.keys(updates).length > 0) {
    await canonical.update(updates, { transaction });
  }

  const duplicateMergeChanges: Record<string, unknown> = {};

  for (const duplicate of duplicates) {
    const { updates: duplicateUpdates, changes: mergedFields } =
      buildDuplicateDataMerge(canonical, duplicate);

    if (Object.keys(duplicateUpdates).length > 0) {
      await canonical.update(duplicateUpdates, { transaction });
      duplicateMergeChanges[duplicate.id] = mergedFields;
      logger.info("[KANBAN_DEDUPE] duplicate data merged into canonical", {
        companyId,
        pipelineId,
        canonicalOpportunityId: canonical.id,
        duplicateOpportunityId: duplicate.id,
        mergedFields: Object.keys(mergedFields),
        contactId: canonical.contactId || contactId,
        leadId: canonical.leadId || leadId || null
      });
    }

    const duplicateChanges: Record<string, unknown> = {
      mergedIntoOpportunityId: canonical.id,
      preservedStageId: canonical.stageId,
      duplicateStageId: duplicate.stageId,
      mergedFields
    };

    await OpportunityEvent.create(
      {
        companyId,
        opportunityId: duplicate.id,
        type: "UPDATED",
        metadata: {
          origin: "dedupe_same_pipeline",
          text: "Card duplicado no mesmo funil consolidado no card mais antigo.",
          ...duplicateChanges
        }
      },
      { transaction }
    );

    await duplicate.update(
      {
        status: "LOST",
        lastMovedBy: "DEDUPE"
      },
      { transaction }
    );

    runAfterCommit(transaction, async () => {
      try {
        const io = getIO();
        io.to(companyId.toString()).emit(`company-${companyId}-opportunity`, {
          action: "delete",
          opportunityId: duplicate.id
        });
      } catch (err: any) {
        logger.warn(
          `[FindOrMergeOpportunityInPipelineService] Duplicate socket emit skipped: ${
            err?.message || err
          }`
        );
      }
    });
  }

  await mergeSafeLeadFields({
    canonical,
    incomingLeadId: leadId,
    contactId,
    transaction
  });

  await OpportunityEvent.create(
    {
      companyId,
      opportunityId: canonical.id,
      type: "UPDATED",
      metadata: {
        origin: "dedupe_same_pipeline",
        preservedStageId: canonical.stageId,
        attemptedStageId: stageId,
        attemptedPipelineId: pipelineId,
        duplicateOpportunityIds: duplicateIds,
        changes: {
          incoming: changes,
          duplicates: duplicateMergeChanges
        },
        text:
          duplicateIds.length > 0
            ? "Cards duplicados no mesmo funil foram consolidados no card mais antigo."
            : "Tentativa de criar/importar card duplicado no mesmo funil foi mesclada ao card existente."
      }
    },
    { transaction }
  );

  await canonical.reload({ transaction });
  await emitOpportunityUpdate(companyId, canonical, changes, transaction);

  if (duplicateIds.length > 0) {
    logger.info("[KANBAN_DEDUPE] duplicate opportunities merged", {
      companyId,
      pipelineId,
      canonicalOpportunityId: canonical.id,
      duplicateOpportunityIds: duplicateIds,
      contactId,
      leadId: leadId || canonical.leadId || null
    });
  }

  return canonical;
};

export default FindOrMergeOpportunityInPipelineService;
