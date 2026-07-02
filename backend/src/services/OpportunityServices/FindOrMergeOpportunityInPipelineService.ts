import { Op, Transaction } from "sequelize";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import CrmLead from "../../models/CrmLead";
import Opportunity from "../../models/Opportunity";
import OpportunityEvent from "../../models/OpportunityEvent";
import PipelineStage from "../../models/PipelineStage";
import EventBus from "../../libs/EventBus";
import { getIO } from "../../libs/socket";
import {
  getBrazilianPhoneVariants,
  normalizePhoneNumber
} from "../../helpers/normalizeContactNumber";
import SyncLeadFromOpportunityService from "../CrmSyncService/SyncLeadFromOpportunityService";
import logger from "../../utils/logger";

interface Request {
  companyId: number;
  pipelineId: number;
  stageId: number;
  contactId?: number | null;
  ticketId?: number | null;
  leadId?: number | null;
  phone?: string | null;
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

const resolvePhoneVariants = (phone?: string | null): string[] => {
  const digits = String(phone || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return [];
  const normalized = normalizePhoneNumber(digits) || digits;
  return [...new Set(getBrazilianPhoneVariants(normalized))];
};

// Cascata de dedupe (sempre em companyId + pipelineId + status OPEN):
//   1. contactId, quando existir;
//   2. leadId, quando existir;
//   3. telefone normalizado (variantes BR), quando não há contactId/leadId;
//   4. título exato como ÚLTIMO recurso, apenas entre cards SEM identidade
//      (contactId e leadId nulos), para não mesclar pessoas diferentes por nome.
const findMatchingOpenOpportunities = async ({
  companyId,
  pipelineId,
  contactId,
  leadId,
  phone,
  title,
  transaction
}: {
  companyId: number;
  pipelineId: number;
  contactId?: number | null;
  leadId?: number | null;
  phone?: string | null;
  title?: string | null;
  transaction?: Transaction;
}): Promise<Opportunity[]> => {
  const or: Record<string, unknown>[] = [];
  if (contactId) or.push({ contactId });
  if (leadId) or.push({ leadId });

  if (!contactId && !leadId) {
    const phoneVariants = resolvePhoneVariants(phone);
    if (phoneVariants.length > 0) {
      const [phoneLeads, phoneContacts] = await Promise.all([
        CrmLead.findAll({
          where: { companyId, phone: { [Op.in]: phoneVariants } },
          attributes: ["id"],
          transaction
        }),
        Contact.findAll({
          where: { companyId, number: { [Op.in]: phoneVariants } },
          attributes: ["id"],
          transaction
        })
      ]);

      if (phoneLeads.length > 0) {
        or.push({ leadId: { [Op.in]: phoneLeads.map(lead => lead.id) } });
      }
      if (phoneContacts.length > 0) {
        or.push({ contactId: { [Op.in]: phoneContacts.map(c => c.id) } });
      }
    }
  }

  if (or.length > 0) {
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
  }

  const trimmedTitle = String(title || "").trim();
  if (!trimmedTitle) return [];

  return Opportunity.findAll({
    where: {
      companyId,
      pipelineId,
      status: "OPEN",
      title: trimmedTitle,
      contactId: null,
      leadId: null
    },
    order: [
      ["createdAt", "ASC"],
      ["id", "ASC"]
    ],
    transaction
  });
};

// Guard de identidade: nunca mesclar cards que apontam para pessoas diferentes.
// Divergência explícita de contactId ou leadId bloqueia; ticketId divergente só
// bloqueia quando não conseguimos confirmar que é o mesmo contato.
const isIdentityCompatible = (
  candidate: Opportunity,
  {
    contactId,
    leadId,
    ticketId
  }: { contactId?: number | null; leadId?: number | null; ticketId?: number | null }
): boolean => {
  if (
    contactId &&
    candidate.contactId &&
    Number(candidate.contactId) !== Number(contactId)
  ) {
    return false;
  }

  if (leadId && candidate.leadId && Number(candidate.leadId) !== Number(leadId)) {
    return false;
  }

  const sameContact =
    contactId &&
    candidate.contactId &&
    Number(candidate.contactId) === Number(contactId);

  if (
    ticketId &&
    candidate.ticketId &&
    Number(candidate.ticketId) !== Number(ticketId) &&
    !sameContact
  ) {
    return false;
  }

  return true;
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
  contactId?: number | null;
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
  phone,
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

  const rawMatches = await findMatchingOpenOpportunities({
    companyId,
    pipelineId,
    contactId,
    leadId,
    phone,
    title,
    transaction
  });

  const matches = rawMatches.filter(candidate => {
    const compatible = isIdentityCompatible(candidate, {
      contactId,
      leadId,
      ticketId
    });
    if (!compatible) {
      logger.info("[KANBAN_DEDUPE] candidate skipped: divergent identity", {
        companyId,
        pipelineId,
        candidateOpportunityId: candidate.id,
        candidateContactId: candidate.contactId || null,
        candidateLeadId: candidate.leadId || null,
        incomingContactId: contactId || null,
        incomingLeadId: leadId || null,
        incomingTicketId: ticketId || null
      });
    }
    return compatible;
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

  // Sincronização central Lead ← Opportunity (Fase B): o caminho de merge
  // também sincroniza o lead — bug confirmado na auditoria.
  await SyncLeadFromOpportunityService({
    opportunity: canonical,
    companyId,
    transaction,
    emitSocket: true
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
