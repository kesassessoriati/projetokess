import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import FlowExecution from "../../models/FlowExecution";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import CreateContactService from "../ContactServices/CreateContactService";
import CreateTicketService from "../TicketServices/CreateTicketService";
import AppError from "../../errors/AppError";
import logger from "../../utils/logger";

interface TriggerFlowWebhookParams {
  companyId: number;
  flowId: number;
  whatsappId: number;
  contactNumber: string;
  contactName?: string;
  triggerPhrase?: string;
}

const TriggerFlowWebhookService = async ({
  companyId,
  flowId,
  whatsappId,
  contactNumber,
  contactName,
  triggerPhrase
}: TriggerFlowWebhookParams) => {
  const startedAt = Date.now();

  const flow = await FlowBuilderModel.findOne({
    where: { id: flowId, company_id: companyId }
  });

  if (!flow) {
    throw new AppError("Flow not found", 404);
  }

  if (!flow.flow || !flow.flow["nodes"] || !flow.flow["nodes"].length) {
    throw new AppError("Flow has no nodes configured", 400);
  }

  const whatsapp = await Whatsapp.findOne({
    where: { id: whatsappId, companyId }
  });

  if (!whatsapp) {
    throw new AppError("WhatsApp connection not found", 404);
  }

  if (whatsapp.status !== "CONNECTED") {
    throw new AppError("WhatsApp connection is not connected", 400);
  }

  // Find or create contact
  let contact = await Contact.findOne({
    where: { number: contactNumber, companyId }
  });

  if (!contact) {
    contact = await CreateContactService({
      name: contactName || contactNumber,
      number: contactNumber,
      companyId,
      isGroup: false
    });
  }

  // Find open ticket or create new one
  let ticket = await Ticket.findOne({
    where: {
      contactId: contact.id,
      whatsappId,
      companyId,
      status: ["open", "pending"]
    },
    order: [["updatedAt", "DESC"]]
  });

  if (!ticket) {
    ticket = await CreateTicketService({
      contactId: contact.id,
      whatsappId,
      companyId,
      status: "pending"
    });
  }

  const nodes = flow.flow["nodes"];
  const connections = flow.flow["connections"];

  const mountDataContact = {
    number: contact.number,
    name: contact.name,
    email: contact.email || ""
  };

  // Create execution log
  const execution = await FlowExecution.create({
    companyId,
    flowId,
    ticketId: ticket.id,
    contactNumber,
    trigger: "webhook",
    triggerPhrase: triggerPhrase || null,
    status: "started",
    nodesExecuted: 0
  });

  try {
    await ActionsWebhookService(
      whatsappId,
      flowId,
      companyId,
      nodes,
      connections,
      nodes[0].id,
      null,
      "",
      "",
      null,
      ticket.id,
      mountDataContact,
      null
    );

    await execution.update({
      status: "completed",
      durationMs: Date.now() - startedAt
    });

    logger.info(`[TriggerFlowWebhook] Flow ${flowId} triggered for contact ${contactNumber} via webhook`);

    return { executionId: execution.id, ticketId: ticket.id, contactId: contact.id };
  } catch (error) {
    await execution.update({
      status: "error",
      errorMessage: error.message || String(error),
      durationMs: Date.now() - startedAt
    });
    throw error;
  }
};

export default TriggerFlowWebhookService;
