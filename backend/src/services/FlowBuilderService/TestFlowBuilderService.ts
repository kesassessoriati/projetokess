import { FlowBuilderModel } from "../../models/FlowBuilder";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import FlowExecution from "../../models/FlowExecution";
import CreateContactService from "../ContactServices/CreateContactService";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import logger from "../../utils/logger";

const LOG = "[FLOWBUILDER_TEST]";

interface TestFlowData {
  flowId: number;
  message?: string;
  contactNumber: string;
  contactName?: string;
  companyId: number;
  userId: number;
  whatsappId?: number;
}

const onlyNumbers = (value: string) => String(value || "").replace(/\D/g, "");

const TestFlowBuilderService = async ({
  flowId,
  message = "",
  contactNumber,
  contactName,
  companyId,
  userId,
  whatsappId
}: TestFlowData) => {
  const startedAt = Date.now();
  const normalizedNumber = onlyNumbers(contactNumber);

  logger.info(
    `${LOG} flowbuilder_test_started companyId=${companyId} flowId=${flowId} whatsappIdRequested=${whatsappId || "auto"}`
  );

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

  // Conexão: usa a escolhida no modal (se conectada e da empresa) ou cai para
  // qualquer conexão CONNECTED da empresa.
  let whatsapp = null;
  if (whatsappId) {
    whatsapp = await Whatsapp.findOne({
      where: { id: whatsappId, companyId, status: "CONNECTED" }
    });
  }
  if (!whatsapp) {
    whatsapp = await Whatsapp.findOne({
      where: { companyId, status: "CONNECTED" },
      order: [["updatedAt", "DESC"]]
    });
  }

  if (!whatsapp) {
    throw new AppError("Nenhuma conexão WhatsApp conectada encontrada para o teste", 404);
  }

  logger.info(
    `${LOG} flowbuilder_test_selected_whatsappId companyId=${companyId} flowId=${flowId} whatsappId=${whatsapp.id}`
  );

  let contact = await Contact.findOne({
    where: { number: normalizedNumber, companyId }
  });

  if (!contact) {
    contact = await CreateContactService({
      name: contactName || `Teste Fluxo ${normalizedNumber}`,
      number: normalizedNumber,
      companyId
    });
    logger.info(
      `${LOG} flowbuilder_test_created_contact companyId=${companyId} contactId=${contact.id}`
    );
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
    logger.info(
      `${LOG} flowbuilder_test_created_ticket companyId=${companyId} ticketId=${ticket.id}`
    );
  }

  // Espelha o dispatcher real (FlowTriggerDispatchService): entra no nó DEPOIS
  // do start (startConn.target), preferindo arestas cujo target ainda existe —
  // aresta órfã de nó deletado no canvas causava dead-end silencioso.
  const startNode = nodes.find((node: any) => node.type === "start") || nodes[0];
  const startConns = connections.filter((c: any) => c.source === startNode.id);
  const startConn =
    startConns.find((c: any) =>
      nodes.some((n: any) => String(n.id) === String(c.target))
    ) || startConns[0];

  if (!startConn) {
    throw new AppError(
      "O bloco de início não está conectado a nenhum outro bloco",
      400
    );
  }

  const entryNodeId = startConn.target;

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

  logger.info(
    `${LOG} flowbuilder_test_runner_started companyId=${companyId} flowId=${flowId} executionId=${execution.id} ticketId=${ticket.id} whatsappId=${whatsapp.id}`
  );

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

    logger.info(
      `${LOG} flowbuilder_test_runner_finished companyId=${companyId} executionId=${execution.id} nodesExecuted=${execution.nodesExecuted}`
    );

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

    logger.error(
      `${LOG} flowbuilder_test_runner_failed companyId=${companyId} executionId=${execution.id} reason=${error?.message || String(error)}`
    );

    throw error;
  }
};

export default TestFlowBuilderService;
