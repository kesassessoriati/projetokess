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

const mergeDuplicateIntoCanonical = async (
  canonical: Opportunity,
  duplicate: Opportunity
) => {
  const updates: Record<string, unknown> = {};

  if (!canonical.contactId && duplicate.contactId) updates.contactId = duplicate.contactId;
  if (!canonical.leadId && duplicate.leadId) updates.leadId = duplicate.leadId;
  if (!canonical.ticketId && duplicate.ticketId) updates.ticketId = duplicate.ticketId;
  if (!canonical.assignedUserId && duplicate.assignedUserId) {
    updates.assignedUserId = duplicate.assignedUserId;
  }
  if ((!canonical.title || String(canonical.title).trim() === "") && duplicate.title) {
    updates.title = duplicate.title;
  }
  if (Number(canonical.value || 0) === 0 && Number(duplicate.value || 0) > 0) {
    updates.value = duplicate.value;
  }

  if (Object.keys(updates).length > 0) {
    await canonical.update(updates);
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
      text: "Card duplicado consolidado no card mais antigo."
    }
  });

  await duplicate.update({
    status: "LOST",
    lastMovedBy: "DEDUPE"
  });
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
    const group = {
      companyId: canonical.companyId,
      pipelineId: canonical.pipelineId,
      identityKey,
      canonicalOpportunityId: canonical.id,
      duplicateOpportunityIds: duplicatesToProcess.map(item => item.id)
    };
    groups.push(group);

    if (!dryRun) {
      for (const duplicate of duplicatesToProcess) {
        await mergeDuplicateIntoCanonical(canonical, duplicate);
      }
      await canonical.reload();
      await OpportunityEvent.create({
        companyId: canonical.companyId,
        opportunityId: canonical.id,
        type: "UPDATED",
        metadata: {
          origin: "dedupe_same_pipeline_consolidation",
          duplicateOpportunityIds: group.duplicateOpportunityIds,
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
