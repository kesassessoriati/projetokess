import { FlowBuilderModel } from "../../models/FlowBuilder";
import FlowExecution from "../../models/FlowExecution";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import logger from "../../utils/logger";

const LOG_PREFIX = "[FLOWBUILDER_TRIGGER]";

export interface TriggerDispatchData {
  ticketId?: number;
  contactNumber?: string;
  contactName?: string;
  contactEmail?: string;
  whatsappId?: number;
  message?: string;
  metadata?: Record<string, any>;
}

const onlyNumbers = (value?: string): string =>
  String(value || "").replace(/\D/g, "");

const safeMeta = (
  event: string,
  companyId: number,
  data: TriggerDispatchData = {},
  extra: Record<string, any> = {}
) => {
  const metadata = data.metadata || {};
  return {
    event,
    companyId,
    triggerType: extra.triggerType,
    triggerKey: extra.triggerKey,
    flowId: extra.flowId,
    executionId: extra.executionId,
    ticketId: data.ticketId || extra.ticketId,
    contactId: metadata.contactId || extra.contactId,
    leadId: metadata.leadId || extra.leadId,
    opportunityId: metadata.opportunityId || extra.opportunityId,
    pipelineId: metadata.pipelineId || extra.pipelineId,
    stageId: metadata.toStageId || metadata.stageId || extra.stageId,
    whatsappId: data.whatsappId || extra.whatsappId,
    reason: extra.reason
  };
};

const logInfo = (
  event: string,
  companyId: number,
  data: TriggerDispatchData,
  extra: Record<string, any> = {}
) => logger.info(`${LOG_PREFIX} ${event}`, safeMeta(event, companyId, data, extra));

const logWarn = (
  event: string,
  companyId: number,
  data: TriggerDispatchData,
  extra: Record<string, any> = {}
) => logger.warn(`${LOG_PREFIX} ${event}`, safeMeta(event, companyId, data, extra));

const logError = (
  event: string,
  companyId: number,
  data: TriggerDispatchData,
  extra: Record<string, any> = {}
) => logger.error(`${LOG_PREFIX} ${event}`, safeMeta(event, companyId, data, extra));

const getTriggers = (flow: FlowBuilderModel): any[] =>
  Array.isArray(flow.triggers) ? flow.triggers : [];

const triggerMatchesEvent = (trigger: any, eventType: string): boolean =>
  String(trigger?.type || "").toLowerCase() === eventType.toLowerCase();

const matchesKeyword = (trigger: any, message?: string): boolean => {
  const keyword = (trigger.config?.keyword || "").trim();
  if (!keyword) return true;

  const msg = (message || "").toLowerCase();
  const kw = keyword.toLowerCase();
  const matchType = trigger.config?.matchType || "contains";

  if (matchType === "exact") return msg === kw;
  if (matchType === "starts") return msg.startsWith(kw);
  return msg.includes(kw);
};

const matchesTriggerFilters = (
  eventType: string,
  trigger: any,
  data: TriggerDispatchData
): { matches: boolean; reason?: string } => {
  const config = trigger.config || {};

  if (config.whatsappId && data.whatsappId) {
    if (Number(config.whatsappId) !== Number(data.whatsappId)) {
      return { matches: false, reason: "whatsappId_mismatch" };
    }
  }

  if (eventType === "message_received" && !matchesKeyword(trigger, data.message)) {
    return { matches: false, reason: "keyword_mismatch" };
  }

  if (config.pipelineId && data.metadata?.pipelineId) {
    if (String(config.pipelineId) !== String(data.metadata.pipelineId)) {
      return { matches: false, reason: "pipelineId_mismatch" };
    }
  }

  if (config.stageId && (data.metadata?.stageId || data.metadata?.toStageId)) {
    const currentStageId = data.metadata?.toStageId || data.metadata?.stageId;
    if (String(config.stageId) !== String(currentStageId)) {
      return { matches: false, reason: "stageId_mismatch" };
    }
  }

  return { matches: true };
};

/**
 * Dispatches a flow trigger event.
 * Scans all active flows for matching triggers and executes them.
 * Returns true if at least one flow was triggered.
 */
export const dispatchFlowTrigger = async (
  eventType: string,
  companyId: number,
  data: TriggerDispatchData
): Promise<boolean> => {
  try {
    logInfo("trigger_received", companyId, data, { triggerType: eventType });

    const flows = await FlowBuilderModel.findAll({
      where: { company_id: companyId }
    });

    const activeFlows = flows.filter(flow => flow.active === true);
    logInfo("active_flows_loaded", companyId, data, {
      triggerType: eventType,
      reason: `${activeFlows.length}/${flows.length}`
    });

    let triggered = false;

    for (const flow of flows) {
      if (flow.active !== true) {
        logInfo("flow_skipped_inactive", companyId, data, {
          flowId: flow.id,
          triggerType: eventType,
          reason: "active_not_true"
        });
        continue;
      }

      const triggers = getTriggers(flow);
      if (!triggers.length) {
        logInfo("trigger_type_mismatch", companyId, data, {
          flowId: flow.id,
          triggerType: eventType,
          reason: "flow_without_triggers"
        });
        continue;
      }

      let matchedTrigger: any = null;

      for (const trigger of triggers) {
        if (!triggerMatchesEvent(trigger, eventType)) {
          logInfo("trigger_type_mismatch", companyId, data, {
            flowId: flow.id,
            triggerType: eventType,
            triggerKey: trigger?.type || "unknown"
          });
          continue;
        }

        const filterResult = matchesTriggerFilters(eventType, trigger, data);
        if (!filterResult.matches) {
          logInfo("trigger_filter_failed", companyId, data, {
            flowId: flow.id,
            triggerType: eventType,
            triggerKey: trigger?.type,
            reason: filterResult.reason
          });
          continue;
        }

        matchedTrigger = trigger;
        break;
      }

      if (!matchedTrigger) continue;

      logInfo("flow_matched", companyId, data, {
        flowId: flow.id,
        triggerType: eventType,
        triggerKey: matchedTrigger.type
      });

      const ok = await _executeFlow(flow, companyId, data, matchedTrigger);
      if (ok) triggered = true;
    }

    if (!triggered) {
      logInfo("trigger_no_flow_dispatched", companyId, data, {
        triggerType: eventType,
        reason: "no_matching_active_flow"
      });
    }

    return triggered;
  } catch (err) {
    logError("dispatcher_failed", companyId, data, {
      triggerType: eventType,
      reason: err?.message
    });
    return false;
  }
};

/**
 * Executes a specific flow directly (for HTTP webhook triggers with known token).
 */
export const executeFlowByToken = async (
  token: string,
  data: TriggerDispatchData
): Promise<{ success: boolean; flowId?: number; error?: string }> => {
  try {
    logInfo("trigger_received", 0, data, { triggerType: "http_webhook" });

    const flows = await FlowBuilderModel.findAll();

    for (const flow of flows) {
      if (flow.active !== true) {
        logInfo("flow_skipped_inactive", flow.company_id, data, {
          flowId: flow.id,
          triggerType: "http_webhook",
          reason: "active_not_true"
        });
        continue;
      }

      const triggers = getTriggers(flow);
      const httpTrigger = triggers.find(
        t => t.type === "http_webhook" && t.config?.token === token
      );
      if (!httpTrigger) {
        logInfo("trigger_type_mismatch", flow.company_id, data, {
          flowId: flow.id,
          triggerType: "http_webhook",
          reason: "token_or_trigger_not_matched"
        });
        continue;
      }

      const whatsappId = httpTrigger.config?.whatsappId
        ? Number(httpTrigger.config.whatsappId)
        : data.whatsappId;

      const ok = await _executeFlow(
        flow,
        flow.company_id,
        { ...data, whatsappId },
        httpTrigger
      );

      return { success: ok, flowId: flow.id };
    }

    logInfo("trigger_no_flow_dispatched", 0, data, {
      triggerType: "http_webhook",
      reason: "token_not_found_or_flow_inactive"
    });
    return { success: false, error: "Token not found or flow inactive" };
  } catch (err) {
    logError("dispatcher_failed", 0, data, {
      triggerType: "http_webhook",
      reason: err?.message
    });
    return { success: false, error: err?.message };
  }
};

async function _executeFlow(
  flow: FlowBuilderModel,
  companyId: number,
  data: TriggerDispatchData,
  trigger: any
): Promise<boolean> {
  try {
    const flowData = flow.flow as any;
    if (!flowData?.nodes?.length) {
      logWarn("runner_failed", companyId, data, {
        flowId: flow.id,
        triggerType: trigger.type,
        triggerKey: trigger.type,
        reason: "flow_without_nodes"
      });
      return false;
    }

    const nodes = flowData.nodes;
    const connections = flowData.connections || [];

    // Find the node after the start node
    const startNode = nodes.find((n: any) => n.type === "start");
    if (!startNode) {
      logWarn("runner_failed", companyId, data, {
        flowId: flow.id,
        triggerType: trigger.type,
        triggerKey: trigger.type,
        reason: "start_node_not_found"
      });
      return false;
    }
    const startConn = connections.find((c: any) => c.source === startNode.id);
    if (!startConn) {
      logWarn("runner_failed", companyId, data, {
        flowId: flow.id,
        triggerType: trigger.type,
        triggerKey: trigger.type,
        reason: "start_connection_not_found"
      });
      return false;
    }
    const entryNodeId = startConn.target;

    // Resolve whatsappId
    let whatsappId = data.whatsappId;
    let ticketId = data.ticketId;
    let contactNumber = onlyNumbers(data.contactNumber);
    let contactName = data.contactName || "";
    let contactEmail = data.contactEmail || "";

    if (!whatsappId && trigger.config?.whatsappId) {
      whatsappId = Number(trigger.config.whatsappId);
    }

    if (!whatsappId && ticketId) {
      const ticket = await Ticket.findOne({ where: { id: ticketId, companyId } });
      if (ticket) {
        whatsappId = ticket.whatsappId;
        if (!contactNumber && ticket.contactId) {
          const c = await Contact.findByPk(ticket.contactId);
          if (c) {
            contactNumber = c.number;
            contactName = c.name;
            contactEmail = c.email || contactEmail;
          }
        }
      }
    }

    if (!whatsappId) {
      const wp = await Whatsapp.findOne({
        where: { companyId, status: "CONNECTED" }
      });
      if (wp) whatsappId = wp.id;
    }

    if (!whatsappId) {
      logWarn("runner_failed", companyId, data, {
        flowId: flow.id,
        triggerType: trigger.type,
        triggerKey: trigger.type,
        reason: "whatsappId_not_found"
      });
      return false;
    }

    if (!ticketId && contactNumber) {
      let contact = await Contact.findOne({
        where: { number: contactNumber, companyId }
      });

      if (!contact) {
        contact = await Contact.create({
          name: contactName || contactNumber,
          number: contactNumber,
          email: contactEmail || "",
          companyId,
          channel: "whatsapp",
          active: true,
          isGroup: false
        } as any);
      }

      contactName = contactName || contact.name;
      contactEmail = contactEmail || contact.email || "";

      const ticket = await Ticket.findOne({
        where: {
          contactId: contact.id,
          whatsappId,
          companyId,
          status: ["open", "pending"]
        },
        order: [["updatedAt", "DESC"]]
      });

      if (ticket) {
        ticketId = ticket.id;
      } else {
        const whatsapp = await Whatsapp.findOne({ where: { id: whatsappId, companyId } });
        const newTicket = await Ticket.create({
          contactId: contact.id,
          whatsappId,
          companyId,
          status: "pending",
          userId: null,
          channel: whatsapp?.channel || "whatsapp",
          isBot: true,
          isGroup: false,
          unreadMessages: 0,
          flowWebhook: false,
          webhookDisabled: false,
          isActiveDemand: true
        } as any);
        ticketId = newTicket.id;
      }
    }

    const execution = await FlowExecution.create({
      companyId,
      flowId: flow.id,
      ticketId: ticketId || null,
      contactNumber,
      trigger: "trigger_engine",
      triggerPhrase: trigger.type,
      status: "started",
      nodesExecuted: 0
    });

    logInfo("execution_created", companyId, data, {
      flowId: flow.id,
      executionId: execution.id,
      ticketId,
      triggerType: trigger.type,
      triggerKey: trigger.type,
      whatsappId
    });

    const startedAt = Date.now();
    const mountDataContact = {
      number: contactNumber,
      name: contactName,
      email: contactEmail
    };

    try {
      logInfo("runner_started", companyId, data, {
        flowId: flow.id,
        executionId: execution.id,
        ticketId,
        triggerType: trigger.type,
        triggerKey: trigger.type,
        whatsappId
      });

      await ActionsWebhookService(
        whatsappId,
        flow.id,
        companyId,
        nodes,
        connections,
        entryNodeId,
        null,
        "",
        "",
        null,
        ticketId || null,
        mountDataContact,
        null,
        execution.id
      );
      await execution.reload();
      await execution.update({
        status: execution.status === "stopped" ? "stopped" : "completed",
        durationMs: Date.now() - startedAt
      });
      logInfo("runner_finished", companyId, data, {
        flowId: flow.id,
        executionId: execution.id,
        ticketId,
        triggerType: trigger.type,
        triggerKey: trigger.type,
        whatsappId,
        reason: execution.status === "stopped" ? execution.stoppedReason : undefined
      });
      return true;
    } catch (err) {
      await execution.update({
        status: "error",
        errorMessage: err?.message,
        durationMs: Date.now() - startedAt
      });
      logError("runner_failed", companyId, data, {
        flowId: flow.id,
        executionId: execution.id,
        ticketId,
        triggerType: trigger.type,
        triggerKey: trigger.type,
        whatsappId,
        reason: err?.message
      });
      return false;
    }
  } catch (err) {
    logError("runner_failed", companyId, data, {
      flowId: flow.id,
      triggerType: trigger?.type,
      triggerKey: trigger?.type,
      reason: err?.message
    });
    return false;
  }
}
