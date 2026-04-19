import { FlowBuilderModel } from "../../models/FlowBuilder";
import FlowExecution from "../../models/FlowExecution";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import logger from "../../utils/logger";

export interface TriggerDispatchData {
  ticketId?: number;
  contactNumber?: string;
  contactName?: string;
  contactEmail?: string;
  whatsappId?: number;
  message?: string;
  metadata?: Record<string, any>;
}

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
    const flows = await FlowBuilderModel.findAll({
      where: { company_id: companyId, active: true }
    });

    let triggered = false;

    for (const flow of flows) {
      const triggers: any[] = flow.triggers || [];
      if (!triggers.length) continue;

      const matching = triggers.find(t => t.type === eventType);
      if (!matching) continue;

      // Keyword filter for message_received
      if (eventType === "message_received") {
        const keyword = (matching.config?.keyword || "").trim();
        if (keyword) {
          const msg = (data.message || "").toLowerCase();
          const kw = keyword.toLowerCase();
          const matchType = matching.config?.matchType || "contains";
          let matched = false;
          if (matchType === "exact") matched = msg === kw;
          else if (matchType === "starts") matched = msg.startsWith(kw);
          else matched = msg.includes(kw);
          if (!matched) continue;
        }
        // If no keyword configured: any message triggers the flow
      }

      // Stage filter for opportunity_moved
      if (eventType === "opportunity_moved" && matching.config?.stageId) {
        if (String(data.metadata?.stageId) !== String(matching.config.stageId)) continue;
      }

      const ok = await _executeFlow(flow, companyId, data, matching);
      if (ok) triggered = true;
    }

    return triggered;
  } catch (err) {
    logger.error(`[FlowTrigger] dispatch error for ${eventType}: ${err?.message}`);
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
    const flows = await FlowBuilderModel.findAll({ where: { active: true } });

    for (const flow of flows) {
      const triggers: any[] = flow.triggers || [];
      const httpTrigger = triggers.find(
        t => t.type === "http_webhook" && t.config?.token === token
      );
      if (!httpTrigger) continue;

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

    return { success: false, error: "Token not found or flow inactive" };
  } catch (err) {
    logger.error(`[FlowTrigger] executeFlowByToken error: ${err?.message}`);
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
    if (!flowData?.nodes?.length) return false;

    const nodes = flowData.nodes;
    const connections = flowData.connections || [];

    // Find the node after the start node
    const startNode = nodes.find((n: any) => n.type === "start");
    if (!startNode) return false;
    const startConn = connections.find((c: any) => c.source === startNode.id);
    if (!startConn) return false;
    const entryNodeId = startConn.target;

    // Resolve whatsappId
    let whatsappId = data.whatsappId;
    let ticketId = data.ticketId;
    let contactNumber = data.contactNumber || "";
    let contactName = data.contactName || "";

    if (!whatsappId && trigger.config?.whatsappId) {
      whatsappId = Number(trigger.config.whatsappId);
    }

    if (!whatsappId && ticketId) {
      const ticket = await Ticket.findOne({ where: { id: ticketId, companyId } });
      if (ticket) {
        whatsappId = ticket.whatsappId;
        if (!contactNumber && ticket.contactId) {
          const c = await Contact.findByPk(ticket.contactId);
          if (c) { contactNumber = c.number; contactName = c.name; }
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
      logger.warn(`[FlowTrigger] No whatsappId for flow ${flow.id}, skipping`);
      return false;
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

    const startedAt = Date.now();
    const mountDataContact = {
      number: contactNumber,
      name: contactName,
      email: data.contactEmail || ""
    };

    try {
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
        null
      );
      await execution.update({
        status: "completed",
        durationMs: Date.now() - startedAt
      });
      logger.info(`[FlowTrigger] Flow ${flow.id} executed via trigger "${trigger.type}"`);
      return true;
    } catch (err) {
      await execution.update({
        status: "error",
        errorMessage: err?.message,
        durationMs: Date.now() - startedAt
      });
      return false;
    }
  } catch (err) {
    logger.error(`[FlowTrigger] _executeFlow error flow ${flow.id}: ${err?.message}`);
    return false;
  }
}
