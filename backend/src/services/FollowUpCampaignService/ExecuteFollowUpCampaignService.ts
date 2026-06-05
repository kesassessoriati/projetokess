// @ts-nocheck
/**
 * ExecuteFollowUpCampaignService
 *
 * Active follow-up engine used by the Follow-up Campaign UI.
 *
 * Trigger model:
 * - single trigger only: an outbound ticket message persisted in Message
 * - legacy manual/campaign sourceType values are ignored by runtime
 *
 * Execution flow:
 * 1. Cron loads active campaigns and their active stages.
 * 2. For each open ticket with at least one outbound persisted message,
 *    the newest outbound message becomes the current trigger cycle anchor.
 * 3. Stage 1 delay is relative to that trigger message timestamp.
 * 4. Subsequent stage delays are relative to the previously sent stage.
 * 5. Any inbound reply after the current anchor stops the cycle.
 * 6. FollowUpLog stores stage attempts and cycle metadata.
 *
 * This keeps cron execution for now while allowing sequences longer than 48h
 * and deterministic sequential stage timing.
 */
import { Op } from "sequelize";
import FollowUpCampaign from "../../models/FollowUpCampaign";
import FollowUpStage from "../../models/FollowUpStage";
import FollowUpLog from "../../models/FollowUpLog";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";
import TicketTag from "../../models/TicketTag";
import CrmLead from "../../models/CrmLead";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Opportunity from "../../models/Opportunity";
import { getWbot } from "../../libs/wbot";
import { sendFollowUpStageMessage } from "./FollowUpStageSender";
import evaluateFollowUpContextService from "./EvaluateFollowUpContextService";
import { FOLLOW_UP_TARGET_MODES } from "./followUpDefaults";

const SUCCESSFUL_LOG_STATUSES = new Set(["sent", "responded"]);
const RESPONDABLE_LOG_STATUSES = new Set(["sent", "failed", "skipped"]);

/**
 * Detects numbers that are not valid individual WhatsApp phone numbers.
 * Matches the same isLidNumber logic used in CreateOrUpdateContactService
 * to avoid constructing JIDs that trigger ghost contact/ticket creation.
 */
function isInvalidFollowUpNumber(number: string): boolean {
  if (!number) return true;
  if (number.startsWith("temp-") || number.startsWith("lid-")) return true;
  const digits = number.replace(/\D/g, "");
  if (!digits) return true;
  // Group/LID pattern: starts with 120 + at least 15 digits, or more than 15 digits
  if (digits.startsWith("120") && digits.length >= 15) return true;
  if (digits.length > 15) return true;
  return false;
}

const executeFollowUpCampaigns = async () => {
  try {
    const campaigns = await FollowUpCampaign.findAll({
      where: { isActive: true },
      include: [
        {
          model: FollowUpStage,
          as: "stages",
          where: { isActive: true },
          required: false,
          order: [["order", "ASC"]],
        },
      ],
    });

    for (const campaign of campaigns) {
      try {
        await processCampaign(campaign);
      } catch (err) {
        console.error(`[FollowUpCampaign] Error processing campaign ${campaign.id}:`, err?.message);
      }
    }
  } catch (err) {
    console.error("[FollowUpCampaign] Fatal error:", err?.message);
  }
};

async function resolveWbot(campaign) {
  let whatsappId = campaign.whatsappId;
  if (!whatsappId) {
    const fallback = await Whatsapp.findOne({
      where: { companyId: campaign.companyId, status: "CONNECTED" },
      attributes: ["id"],
    });
    whatsappId = fallback?.id ?? null;
  }
  if (!whatsappId) return null;
  try {
    return getWbot(whatsappId);
  } catch {
    return null;
  }
}

async function processCampaign(campaign) {
  const stages = campaign.stages || [];
  if (!stages.length) return;

  const recentTickets = await Ticket.findAll({
    where: { companyId: campaign.companyId, status: { [Op.ne]: "closed" } },
    include: [
      {
        model: Contact,
        as: "contact",
        required: true,
        include: [{ model: Tag, as: "tags", through: { attributes: [] }, required: false }],
      },
      { model: Tag, as: "tags", through: { attributes: [] }, required: false },
      {
        model: CrmLead,
        as: "crmLead",
        required: false,
        include: [
          { model: Pipeline, required: false },
          { model: PipelineStage, as: "stage", required: false },
        ],
      }
    ],
  });

  for (const ticket of recentTickets) {
    try {
      if (!matchesCampaignTarget(campaign, ticket)) {
        continue;
      }

      await processContact(campaign, stages, ticket);
    } catch (err) {
      console.error(`[FollowUpCampaign] Error on ticket ${ticket.id}:`, err?.message);
    }
  }
}

async function processContact(campaign, stages, ticket) {
  const contact = ticket.contact;
  if (!contact) return;

  // ── Ticket resolution guard ─────────────────────────────────────────────
  // Skip group tickets: sending to a group JID as @s.whatsapp.net creates
  // a ghost contact (temp-*) and a phantom ticket in the waiting queue.
  if (ticket.isGroup || contact.isGroup) {
    console.log(
      `[FollowUp Runtime][ticket.resolve] SKIP campaignId=${campaign.id} ticketId=${ticket.id} contactId=${contact.id} companyId=${campaign.companyId} reason=group_ticket`
    );
    return;
  }

  const contactNumber = contact.number;

  // Skip contacts whose number would be misidentified as LID/temp by the
  // WhatsApp listener (same isLidNumber rule used in CreateOrUpdateContactService).
  if (isInvalidFollowUpNumber(contactNumber)) {
    console.log(
      `[FollowUp Runtime][ticket.resolve] SKIP campaignId=${campaign.id} ticketId=${ticket.id} contactId=${contact.id} companyId=${campaign.companyId} reason=invalid_number`
    );
    return;
  }
  // ────────────────────────────────────────────────────────────────────────

  const recentMessages = await Message.findAll({
    where: { ticketId: ticket.id },
    order: [["createdAt", "DESC"]],
    limit: 12
  });

  const triggerMessage = recentMessages.find((message) => message.fromMe);
  if (!triggerMessage) return;

  const triggerAt = new Date(triggerMessage.createdAt);
  const stageOrderMap = new Map(stages.map(stage => [stage.id, stage.order]));

  const logs = await FollowUpLog.findAll({
    where: {
      followUpCampaignId: campaign.id,
      contactNumber,
      companyId: campaign.companyId
    },
    order: [["createdAt", "ASC"]]
  });

  const cycleLogs = logs.filter(log => isCurrentTriggerCycle(log, triggerMessage.id, triggerAt));
  const successfulCycleLogs = cycleLogs
    .filter(log => SUCCESSFUL_LOG_STATUSES.has(log.status))
    .sort((a, b) => resolveStageOrder(a, stageOrderMap) - resolveStageOrder(b, stageOrderMap));

  const nextStage = resolveNextStage(stages, successfulCycleLogs, stageOrderMap);
  if (!nextStage) return;

  let anchorAt = resolveAnchorAt(triggerAt, nextStage.order, successfulCycleLogs, stageOrderMap);

  const latestInboundMessage = recentMessages.find(
    (message) => !message.fromMe && new Date(message.createdAt).getTime() > anchorAt.getTime()
  );

  const shouldStop = campaign.stopOnReply !== false; // default true

  if (latestInboundMessage) {
    if (!campaign.smartMode || !shouldStop) {
      // Non-smart mode: always stop on reply if stopOnReply is true
      if (shouldStop) {
        await markCycleAsResponded(cycleLogs, latestInboundMessage.createdAt);
        await executeReplyAction(campaign, ticket, contact);
        return;
      }
      // stopOnReply=false: adjust anchor and continue
      anchorAt = new Date(
        Math.max(anchorAt.getTime(), new Date(latestInboundMessage.createdAt).getTime())
      );
    } else {
      // Smart mode ON + stopOnReply ON: evaluate context before stopping
      const decision = await evaluateFollowUpContextService({
        campaign,
        ticket,
        latestInboundMessage
      });

      if (decision.shouldStop) {
        await markCycleAsResponded(cycleLogs, latestInboundMessage.createdAt);
        await executeReplyAction(campaign, ticket, contact);
        return;
      }

      anchorAt = new Date(
        Math.max(anchorAt.getTime(), new Date(latestInboundMessage.createdAt).getTime())
      );
    }
  }

  const elapsedMinutes = Math.floor((Date.now() - anchorAt.getTime()) / 60000);
  if (elapsedMinutes < nextStage.delayMinutes) return;

  // Non-message step types: log success without sending a message
  const stepType = (nextStage as any).stepType || "send_message";

  if (stepType === "wait") {
    await FollowUpLog.create({
      followUpCampaignId: campaign.id,
      stageId: nextStage.id,
      contactNumber,
      companyId: campaign.companyId,
      triggerMessageId: triggerMessage.id,
      triggeredAt: triggerAt,
      sentAt: new Date(),
      status: "sent",
    });
    return;
  }

  if (stepType === "add_tag") {
    try {
      const stepConfig = (nextStage as any).stepConfig || {};
      const tagId = Number(stepConfig.tagId);
      if (tagId && contact?.id) {
        await ContactTag.findOrCreate({ where: { contactId: contact.id, tagId } });
        if (ticket?.id) {
          await TicketTag.findOrCreate({ where: { ticketId: ticket.id, tagId } });
        }
      }
    } catch (err) {
      console.error(`[FollowUpCampaign] add_tag step error stage ${nextStage.id}:`, err?.message);
    }
    await FollowUpLog.create({
      followUpCampaignId: campaign.id,
      stageId: nextStage.id,
      contactNumber,
      companyId: campaign.companyId,
      triggerMessageId: triggerMessage.id,
      triggeredAt: triggerAt,
      sentAt: new Date(),
      status: "sent",
    });
    return;
  }

  if (stepType === "move_crm") {
    try {
      const stepConfig = (nextStage as any).stepConfig || {};
      const targetStageId = Number(stepConfig.stageId);
      const targetPipelineId = Number(stepConfig.pipelineId);
      if (targetStageId && targetPipelineId && contact?.id) {
        const opp = await Opportunity.findOne({
          where: { contactId: contact.id, companyId: campaign.companyId },
          order: [["createdAt", "DESC"]],
        });
        if (opp) {
          await opp.update({ stageId: targetStageId, pipelineId: targetPipelineId });
        }
      }
    } catch (err) {
      console.error(`[FollowUpCampaign] move_crm step error stage ${nextStage.id}:`, err?.message);
    }
    await FollowUpLog.create({
      followUpCampaignId: campaign.id,
      stageId: nextStage.id,
      contactNumber,
      companyId: campaign.companyId,
      triggerMessageId: triggerMessage.id,
      triggeredAt: triggerAt,
      sentAt: new Date(),
      status: "sent",
    });
    return;
  }

  if (stepType === "webhook") {
    try {
      const stepConfig = (nextStage as any).stepConfig || {};
      const url = stepConfig.url;
      const method = stepConfig.method || "POST";
      if (url) {
        const body = String(stepConfig.body || "{}");
        // fire-and-forget with timeout
        const controller = new (require("abort-controller"))();
        const timeout = setTimeout(() => controller.abort(), 10000);
        fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: method !== "GET" ? body : undefined,
          signal: controller.signal,
        }).catch((e) => {
          console.warn(`[FollowUpCampaign] webhook step ${nextStage.id} failed:`, e?.message);
        }).finally(() => clearTimeout(timeout));
      }
    } catch (err) {
      console.error(`[FollowUpCampaign] webhook step error stage ${nextStage.id}:`, err?.message);
    }
    await FollowUpLog.create({
      followUpCampaignId: campaign.id,
      stageId: nextStage.id,
      contactNumber,
      companyId: campaign.companyId,
      triggerMessageId: triggerMessage.id,
      triggeredAt: triggerAt,
      sentAt: new Date(),
      status: "sent",
    });
    return;
  }

  if (stepType === "condition") {
    // Conditions are evaluated during step ordering — treat as pass-through
    await FollowUpLog.create({
      followUpCampaignId: campaign.id,
      stageId: nextStage.id,
      contactNumber,
      companyId: campaign.companyId,
      triggerMessageId: triggerMessage.id,
      triggeredAt: triggerAt,
      sentAt: new Date(),
      status: "sent",
    });
    return;
  }

  // Default: send_message
  let status = "sent";
  try {
    const wbot = await resolveWbot(campaign);
    if (!wbot) {
      status = "skipped";
    } else {
      const jid = `${contactNumber}@s.whatsapp.net`;
      console.log(
        `[FollowUp Runtime][ticket.resolve] SEND campaignId=${campaign.id} stageId=${nextStage.id} ticketId=${ticket.id} contactId=${contact.id} whatsappId=${campaign.whatsappId || "auto"} companyId=${campaign.companyId} decision=reuse jid_suffix=${jid.slice(-10)}`
      );
      const result = await sendFollowUpStageMessage({
        wbot,
        jid,
        stage: nextStage,
        companyId: campaign.companyId,
        campaign,
        ticket,
        latestInboundMessage,
        triggerMessage
      });
      status = result.status || status;
    }
  } catch (sendErr) {
    console.error(`[FollowUpCampaign] Send error stage ${nextStage.id}:`, sendErr?.message);
    status = "failed";
  }

  await FollowUpLog.create({
    followUpCampaignId: campaign.id,
    stageId: nextStage.id,
    contactNumber,
    companyId: campaign.companyId,
    triggerMessageId: triggerMessage.id,
    triggeredAt: triggerAt,
    sentAt: status === "sent" ? new Date() : null,
    status,
  });
}

function matchesCampaignTarget(campaign, ticket) {
  const targetMode = campaign?.targetMode || FOLLOW_UP_TARGET_MODES.all;
  if (targetMode === FOLLOW_UP_TARGET_MODES.all) {
    return true;
  }

  const campaignTagIds = Array.isArray(campaign?.tagIds)
    ? campaign.tagIds.map((value) => Number(value)).filter(Boolean)
    : [];
  const ticketTagIds = Array.isArray(ticket?.tags)
    ? ticket.tags.map((tag) => Number(tag.id)).filter(Boolean)
    : [];
  const contactTagIds = Array.isArray(ticket?.contact?.tags)
    ? ticket.contact.tags.map((tag) => Number(tag.id)).filter(Boolean)
    : [];
  const allTagIds = [...new Set([...ticketTagIds, ...contactTagIds])];

  const tagMatch =
    campaignTagIds.length > 0 && allTagIds.some((tagId) => campaignTagIds.includes(tagId));

  const stageMatch = Boolean(
    ticket?.crmLead &&
    (!campaign?.pipelineId || Number(ticket.crmLead.pipelineId) === Number(campaign.pipelineId)) &&
    (!campaign?.pipelineStageId || Number(ticket.crmLead.stageId) === Number(campaign.pipelineStageId))
  );

  if (targetMode === FOLLOW_UP_TARGET_MODES.tags) {
    return tagMatch;
  }

  if (targetMode === FOLLOW_UP_TARGET_MODES.pipeline_stage) {
    return stageMatch;
  }

  if (targetMode === FOLLOW_UP_TARGET_MODES.hybrid) {
    return tagMatch || stageMatch;
  }

  return true;
}

function isCurrentTriggerCycle(log, triggerMessageId, triggerAt) {
  if (Number(log.triggerMessageId) === Number(triggerMessageId)) {
    return true;
  }

  if (log.triggerMessageId) {
    return false;
  }

  // Backward compatibility for logs created before triggerMessageId existed.
  const logMoment = log.sentAt || log.respondedAt || log.createdAt;
  return !!logMoment && new Date(logMoment).getTime() >= triggerAt.getTime();
}

function resolveStageOrder(log, stageOrderMap) {
  return stageOrderMap.get(log.stageId) || Number.MAX_SAFE_INTEGER;
}

function resolveNextStage(stages, successfulCycleLogs, stageOrderMap) {
  const completedOrders = new Set(successfulCycleLogs.map(log => resolveStageOrder(log, stageOrderMap)));
  return stages
    .slice()
    .sort((a, b) => a.order - b.order)
    .find(stage => !completedOrders.has(stage.order));
}

function resolveAnchorAt(triggerAt, nextStageOrder, successfulCycleLogs, stageOrderMap) {
  if (nextStageOrder <= 1) {
    return triggerAt;
  }

  const previousStageLog = successfulCycleLogs
    .filter(log => resolveStageOrder(log, stageOrderMap) === nextStageOrder - 1)
    .sort((a, b) => new Date(b.sentAt || b.respondedAt || b.createdAt).getTime() - new Date(a.sentAt || a.respondedAt || a.createdAt).getTime())[0];

  return previousStageLog?.sentAt
    ? new Date(previousStageLog.sentAt)
    : triggerAt;
}

async function executeReplyAction(campaign: any, ticket: any, contact: any) {
  const action = campaign.actionOnReply || "none";
  if (action === "none") return;

  const config = campaign.replyActionConfig || {};

  try {
    if (action === "add_tag") {
      const tagId = Number(config.tagId);
      if (tagId && contact?.id) {
        await ContactTag.findOrCreate({ where: { contactId: contact.id, tagId } });
        if (ticket?.id) {
          await TicketTag.findOrCreate({ where: { ticketId: ticket.id, tagId } });
        }
      }
      return;
    }

    if (action === "move_crm") {
      const targetStageId = Number(config.stageId);
      const targetPipelineId = Number(config.pipelineId);
      if (targetStageId && targetPipelineId && contact?.id) {
        const opp = await Opportunity.findOne({
          where: { contactId: contact.id, companyId: campaign.companyId },
          order: [["createdAt", "DESC"]],
        });
        if (opp) {
          await opp.update({ stageId: targetStageId, pipelineId: targetPipelineId });
        }
      }
      return;
    }

    if (action === "activate_ai") {
      // Placeholder: AI agent activation is managed by the channel binding system.
      // A full implementation requires resolving the AI agent bound to the campaign's
      // WhatsApp connection and scheduling it for the ticket.
      console.log(
        `[FollowUpCampaign] actionOnReply=activate_ai triggered for ticket ${ticket?.id} — AI agent binding not yet automated.`
      );
      return;
    }
  } catch (err) {
    console.error(`[FollowUpCampaign] executeReplyAction(${action}) error:`, err?.message);
  }
}

async function markCycleAsResponded(cycleLogs, respondedAt) {
  const logIds = cycleLogs
    .filter(log => RESPONDABLE_LOG_STATUSES.has(log.status))
    .map(log => log.id);

  if (!logIds.length) return;

  await FollowUpLog.update(
    { respondedAt, status: "responded" },
    {
      where: {
        id: { [Op.in]: logIds }
      }
    }
  );
}

export default executeFollowUpCampaigns;
