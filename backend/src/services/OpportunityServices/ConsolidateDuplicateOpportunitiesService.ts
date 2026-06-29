import { Op } from "sequelize";
import Opportunity from "../../models/Opportunity";
import OpportunityEvent from "../../models/OpportunityEvent";
import EventBus from "../../libs/EventBus";
import logger from "../../utils/logger";

interface Request {
  companyId?: number;
  pipelineId?: number;
  dryRun?: boolean;
}

interface ConsolidationGroup {
  companyId: number;
  pipelineId: number;
  identityKey: string;
  canonicalOpportunityId: number;
  duplicateOpportunityIds: number[];
  mergedFields?: Record<number, string[]>;
}

interface Response {
  dryRun: boolean;
  groups: ConsolidationGroup[];
}

const identityKeysFor = (opportunity: Opportunity): string[] => {
  const keys: string[] = [];
  if (opportunity.contactId) keys.push(`contact:${opportunity.contactId}`);
  if (opportunity.leadId) keys.push(`lead:${opportunity.leadId}`);
  return keys;
};

const hasValue = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim() !== "";

const isEmptyValue = (value: unknown): boolean =>
  value === null || value === undefined || String(value).trim() === "";

const mergeDuplicateIntoCanonical = async (
  canonical: Opportunity,
  duplicate: Opportunity
): Promise<string[]> => {
  const updates: Record<string, unknown> = {};
  const mergedFields: string[] = [];

  const setIfEmptyFromDuplicate = (field: string) => {
    const currentValue = (canonical as any)[field];
    const duplicateValue = (duplicate as any)[field];
    if (isEmptyValue(currentValue) && hasValue(duplicateValue)) {
      updates[field] = duplicateValue;
      mergedFields.push(field);
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

  if (Number((canonical as any).value || 0) === 0 && Number((duplicate as any).value || 0) > 0) {
    updates.value = duplicate.value;
    mergedFields.push("value");
  }

  if (Number((canonical as any).score || 0) === 0 && Number((duplicate as any).score || 0) > 0) {
    updates.score = duplicate.score;
    mergedFields.push("score");
  }

  if (Object.keys(updates).length > 0) {
    await canonical.update(updates);
    logger.info("[KANBAN_DEDUPE] duplicate data merged into canonical", {
      companyId: canonical.companyId,
      pipelineId: canonical.pipelineId,
      canonicalOpportunityId: canonical.id,
      duplicateOpportunityId: duplicate.id,
      mergedFields,
      contactId: canonical.contactId || duplicate.contactId || null,
      leadId: canonical.leadId || duplicate.leadId || null
    });
  }

  await OpportunityEvent.create({
    companyId: canonical.companyId,
    opportunityId: duplicate.id,
    type: "UPDATED",
    metadata: {
      origin: "dedupe_same_pipeline_consolidation",
      mergedIntoOpportunityId: canonical.id,
      preservedStageId: canonical.stageId,
      duplicateStageId: duplicate.stageId,
      mergedFields,
      text: "Card duplicado consolidado no card mais antigo."
    }
  });

  await duplicate.update({
    status: "LOST",
    lastMovedBy: "DEDUPE"
  });

  return mergedFields;
};

const ConsolidateDuplicateOpportunitiesService = async ({
  companyId,
  pipelineId,
  dryRun = true
}: Request = {}): Promise<Response> => {
  const where: any = {
    status: "OPEN",
    [Op.or]: [
      { contactId: { [Op.ne]: null } },
      { leadId: { [Op.ne]: null } }
    ]
  };
  if (companyId) where.companyId = companyId;
  if (pipelineId) where.pipelineId = pipelineId;

  const opportunities = await Opportunity.findAll({
    where,
    order: [
      ["companyId", "ASC"],
      ["pipelineId", "ASC"],
      ["createdAt", "ASC"],
      ["id", "ASC"]
    ]
  });

  const buckets = new Map<string, Opportunity[]>();
  for (const opportunity of opportunities) {
    for (const identityKey of identityKeysFor(opportunity)) {
      const key = `${opportunity.companyId}:${opportunity.pipelineId}:${identityKey}`;
      const bucket = buckets.get(key) || [];
      bucket.push(opportunity);
      buckets.set(key, bucket);
    }
  }

  const processedDuplicates = new Set<number>();
  const groups: ConsolidationGroup[] = [];

  for (const [bucketKey, bucket] of buckets.entries()) {
    const unique = Array.from(new Map(bucket.map(item => [item.id, item])).values());
    if (unique.length <= 1) continue;

    const [canonical, ...duplicates] = unique;
    const duplicatesToProcess = duplicates.filter(item => !processedDuplicates.has(item.id));
    if (duplicatesToProcess.length === 0) continue;

    duplicatesToProcess.forEach(item => processedDuplicates.add(item.id));

    const identityKey = bucketKey.split(":").slice(2).join(":");
    const group: ConsolidationGroup = {
      companyId: canonical.companyId,
      pipelineId: canonical.pipelineId,
      identityKey,
      canonicalOpportunityId: canonical.id,
      duplicateOpportunityIds: duplicatesToProcess.map(item => item.id)
    };
    groups.push(group);

    if (!dryRun) {
      const mergedFieldsByDuplicate: Record<number, string[]> = {};
      for (const duplicate of duplicatesToProcess) {
        mergedFieldsByDuplicate[duplicate.id] = await mergeDuplicateIntoCanonical(canonical, duplicate);
      }
      group.mergedFields = mergedFieldsByDuplicate;
      await canonical.reload();
      await OpportunityEvent.create({
        companyId: canonical.companyId,
        opportunityId: canonical.id,
        type: "UPDATED",
        metadata: {
          origin: "dedupe_same_pipeline_consolidation",
          duplicateOpportunityIds: group.duplicateOpportunityIds,
          mergedFields: mergedFieldsByDuplicate,
          text: "Cards duplicados consolidados no card mais antigo."
        }
      });
      await EventBus.publish(
        "OPPORTUNITY_UPDATED",
        {
          opportunityId: canonical.id,
          pipelineId: canonical.pipelineId,
          stageId: canonical.stageId,
          changes: { duplicateOpportunityIds: group.duplicateOpportunityIds },
          assignedUserId: canonical.assignedUserId,
          status: canonical.status,
          value: canonical.value,
          updatedAt: canonical.updatedAt,
          version: canonical.version
        },
        canonical.companyId
      );
      logger.info("[KANBAN_DEDUPE] duplicate opportunities merged", group);
    }
  }

  return { dryRun, groups };
};

export default ConsolidateDuplicateOpportunitiesService;
