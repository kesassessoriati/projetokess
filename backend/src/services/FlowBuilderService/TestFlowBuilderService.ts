import { FlowBuilderModel } from "../../models/FlowBuilder";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import FlowExecution from "../../models/FlowExecution";
import CreateContactService from "../ContactServices/CreateContactService";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";

interface TestFlowData {
  flowId: number;
  message?: string;
  contactNumber: string;
  contactName?: string;
  companyId: number;
  userId: number;
}

const onlyNumbers = (value: string) => String(value || "").replace(/\D/g, "");

const TestFlowBuilderService = async ({
  flowId,
  message = "",
  contactNumber,
  contactName,
  companyId,
  userId
}: TestFlowData) => {
  const startedAt = Date.now();
  const normalizedNumber = onlyNumbers(contactNumber);

  if (!normalizedNumber) {
    throw new AppError("Informe um número de contato para o teste", 400);
  }

  const flow = await FlowBuilderModel.findOne({
    where: {
      id: flowId,
      company_id: companyId
    }
  });

  if (!flow) {
    throw new AppError("Fluxo não encontrado", 404);
  }

  const flowData = flow.flow as any;
  const nodes = Array.isArray(flowData?.nodes) ? flowData.nodes : [];
  const connections = Array.isArray(flowData?.connections) ? flowData.connections : [];

  if (!nodes.length) {
    throw new AppError("Fluxo não possui blocos configurados", 400);
  }

  const whatsapp = await Whatsapp.findOne({
    where: { companyId, status: "CONNECTED" },
    order: [["updatedAt", "DESC"]]
  });

  if (!whatsapp) {
    throw new AppError("Nenhuma conexão WhatsApp conectada encontrada para o teste", 404);
  }

  let contact = await Contact.findOne({
    where: { number: normalizedNumber, companyId }
  });

  if (!contact) {
    contact = await CreateContactService({
      name: contactName || `Teste Fluxo ${normalizedNumber}`,
      number: normalizedNumber,
      companyId
    });
  }

  let ticket = await Ticket.findOne({
    where: {
      contactId: contact.id,
      whatsappId: whatsapp.id,
      companyId,
      status: ["open", "pending"]
    },
    order: [["updatedAt", "DESC"]]
  });

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: contact.id,
      whatsappId: whatsapp.id,
      companyId,
      status: "pending",
      userId,
      channel: whatsapp.channel || "whatsapp",
      isBot: true,
      isGroup: false,
      unreadMessages: 0,
      flowWebhook: false,
      webhookDisabled: false,
      isActiveDemand: true
    } as any);
  }

  const startNode = nodes.find((node: any) => node.type === "start") || nodes[0];
  const entryNodeId = startNode.id;

  const execution = await FlowExecution.create({
    companyId,
    flowId,
    ticketId: ticket.id,
    contactNumber: normalizedNumber,
    trigger: "manual_test",
    triggerPhrase: message || null,
    status: "started",
    nodesExecuted: 0,
    nodePath: []
  });

  try {
    await ActionsWebhookService(
      whatsapp.id,
      flowId,
      companyId,
      nodes,
      connections,
      entryNodeId,
      { variables: { testMessage: message } },
      null,
      "",
      null,
      ticket.id,
      {
        number: contact.number,
        name: contact.name,
        email: contact.email || ""
      },
      null,
      execution.id
    );

    await execution.reload();
    await execution.update({
      status: "completed",
      durationMs: Date.now() - startedAt
    });

    return {
      success: true,
      message: "Fluxo de teste executado com sucesso",
      executionId: execution.id,
      ticketId: ticket.id,
      contactId: contact.id,
      nodesExecuted: execution.nodesExecuted,
      nodePath: execution.nodePath || []
    };
  } catch (error) {
    await execution.update({
      status: "error",
      errorMessage: error?.message || String(error),
      durationMs: Date.now() - startedAt
    });

    throw error;
  }
};

export default TestFlowBuilderService;
