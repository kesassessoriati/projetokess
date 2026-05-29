import { Op } from "sequelize";
import Automation from "../../models/Automation";
import AutomationAction from "../../models/AutomationAction";
import AutomationExecution from "../../models/AutomationExecution";
import AutomationLog from "../../models/AutomationLog";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import ContactTag from "../../models/ContactTag";
import CampaignSetting from "../../models/CampaignSetting";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import { getIO } from "../../libs/socket";
import logger from "../../utils/logger";
import moment from "moment";
import renderCampaignTemplate from "../../helpers/RenderCampaignTemplate";
import path from "path";

interface AutomationWindowConfig {
  startHour?: string;
  endHour?: string;
  sabado?: boolean;
  domingo?: boolean;
}

interface CampaignSettings {
  messageInterval: number;
  longerIntervalAfter: number;
  greaterInterval: number;
  sabado: boolean;
  domingo: boolean;
  startHour: string;
  endHour: string;
  automationWindows: Record<string, AutomationWindowConfig>;
}

const AUTOMATION_WINDOW_REGEX = /^automation_(.+)_(startHour|endHour|sabado|domingo)$/;

const INSTANT_ACTIONS = new Set([
  "add_tag",
  "remove_tag",
  "move_kanban",
  "transfer_queue",
  "transfer_user",
  "close_ticket",
  "create_task",
  "create_note"
]);

// Buscar configurações de disparo da empresa
export const getCampaignSettings = async (companyId: number): Promise<CampaignSettings> => {
  const settings = await CampaignSetting.findAll({
    where: { companyId },
    attributes: ["key", "value"]
  });

  let config: CampaignSettings = {
    messageInterval: 20,
    longerIntervalAfter: 20,
    greaterInterval: 60,
    sabado: false,
    domingo: false,
    startHour: "08:00",
    endHour: "18:00",
    automationWindows: {}
  };

  settings.forEach(setting => {
    try {
      const automationMatch = setting.key.match(AUTOMATION_WINDOW_REGEX);
      if (automationMatch) {
        const [, triggerType, field] = automationMatch;
        const windowConfig =
          config.automationWindows[triggerType] ||
          (config.automationWindows[triggerType] = {});

        if (field === "startHour" || field === "endHour") {
          windowConfig[field] = setting.value;
        } else {
          windowConfig[field] = JSON.parse(setting.value);
        }
        return;
      }

      if (setting.key === "messageInterval") config.messageInterval = JSON.parse(setting.value);
      if (setting.key === "longerIntervalAfter") config.longerIntervalAfter = JSON.parse(setting.value);
      if (setting.key === "greaterInterval") config.greaterInterval = JSON.parse(setting.value);
      if (setting.key === "sabado") config.sabado = JSON.parse(setting.value);
      if (setting.key === "domingo") config.domingo = JSON.parse(setting.value);
      if (setting.key === "startHour") config.startHour = setting.value;
      if (setting.key === "endHour") config.endHour = setting.value;
    } catch (e) {}
  });

  return config;
};

const resolveWindow = (
  settings: CampaignSettings,
  triggerType?: string
): Required<AutomationWindowConfig> => {
  const windowConfig = (triggerType && settings.automationWindows[triggerType]) || {};

  return {
    startHour: windowConfig.startHour ?? settings.startHour,
    endHour: windowConfig.endHour ?? settings.endHour,
    sabado: windowConfig.sabado ?? settings.sabado,
    domingo: windowConfig.domingo ?? settings.domingo
  };
};

// Verificar se está dentro do horário de disparo
export const isWithinDispatchHours = (
  settings: CampaignSettings,
  triggerType?: string
): boolean => {
  const windowConfig = resolveWindow(settings, triggerType);
  const now = moment();
  const dayOfWeek = now.day();

  // Verificar sábado e domingo
  if (dayOfWeek === 6 && !windowConfig.sabado) return false;
  if (dayOfWeek === 0 && !windowConfig.domingo) return false;

  // Verificar horário
  const currentTime = now.format("HH:mm");
  return currentTime >= windowConfig.startHour && currentTime <= windowConfig.endHour;
};

export const getNextDispatchDate = (
  settings: CampaignSettings,
  triggerType?: string
): Date => {
  const windowConfig = resolveWindow(settings, triggerType);
  const next = moment();

  const [startHour, startMinute] = windowConfig.startHour.split(":").map(Number);
  const [endHour, endMinute] = windowConfig.endHour.split(":").map(Number);

  while (true) {
    const day = next.day();
    if ((day === 6 && !windowConfig.sabado) || (day === 0 && !windowConfig.domingo)) {
      next.add(1, "day").startOf("day");
      continue;
    }

    const startOfWindow = next.clone().startOf("day").add(startHour, "hours").add(startMinute, "minutes");
    const endOfWindow = next.clone().startOf("day").add(endHour, "hours").add(endMinute, "minutes");

    if (next.isBefore(startOfWindow)) {
      return startOfWindow.toDate();
    }

    if (next.isBefore(endOfWindow)) {
      return next.toDate();
    }

    next.add(1, "day").startOf("day");
  }
};

// Calcular delay baseado nas configurações
const calculateDelay = (settings: CampaignSettings, messageCount: number): number => {
  if (messageCount >= settings.longerIntervalAfter) {
    return settings.greaterInterval;
  }
  return settings.messageInterval;
};

// Executar ação de enviar mensagem
const executeActionSendMessage = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number,
  opportunityId?: number
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!contact) {
      logger.warn(`[StageAutomation][WhatsApp] Oportunidade ${opportunityId} sem contato - send_message ignorada`);
      return { success: false, message: "Oportunidade sem contato associado - send_message ignorada" };
    }

    if (!ticket) {
      logger.warn(`[StageAutomation][WhatsApp] Contato ${contact.id} sem ticket - send_message ignorada`);
      return { success: false, message: "Ticket não encontrado para send_message" };
    }

    const { message, whatsappId, quickReplyId, mediaId } = action.actionConfig || {};

    logger.info(`[StageAutomation][WhatsApp] Iniciando - contato ${contact.id}, ticket ${ticket.id}, conexão=${whatsappId || "padrão"}, quickReplyId=${quickReplyId || "—"}, mediaId=${mediaId || "—"}`);

    // Garante que o ticket usa a conexão WhatsApp configurada na ação
    if (whatsappId && Number(ticket.whatsappId) !== Number(whatsappId)) {
      logger.info(`[StageAutomation][WhatsApp] Atualizando conexão do ticket ${ticket.id}: ${ticket.whatsappId} → ${whatsappId}`);
      await ticket.update({ whatsappId: Number(whatsappId) });
      await ticket.reload();
    }

    let textBody = message || "";
    let mediaFilePath: string | null = null;
    let mediaFileName: string | null = null;

    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

    // Resolve resposta rápida (QuickReply)
    if (quickReplyId) {
      const QuickReply = (await import("../../models/QuickReply")).default;
      const qr = await QuickReply.findOne({ where: { id: Number(quickReplyId), companyId } });
      if (qr) {
        if (!textBody && qr.message) textBody = qr.message;
        const rawMedia = qr.getDataValue("mediaUrl") as string | null;
        if (rawMedia) {
          const normalized = rawMedia.replace(/\\/g, "/").replace(/^\/+/, "");
          mediaFilePath = normalized.startsWith("media-drive/")
            ? path.join(publicFolder, `company${companyId}`, normalized)
            : path.join(publicFolder, `company${companyId}`, "quickReply", normalized);
          mediaFileName = qr.mediaName || path.basename(normalized);
          logger.info(`[StageAutomation][WhatsApp] Resposta rápida ${quickReplyId} com mídia: ${mediaFileName}`);
        } else {
          logger.info(`[StageAutomation][WhatsApp] Resposta rápida ${quickReplyId} apenas texto`);
        }
      } else {
        logger.warn(`[StageAutomation][WhatsApp] Resposta rápida ${quickReplyId} não encontrada`);
      }
    }

    // Resolve mídia da biblioteca (apenas se não há mídia de resposta rápida)
    if (mediaId && !mediaFilePath) {
      const MediaFile = (await import("../../models/MediaFile")).default;
      const mf = await MediaFile.findOne({ where: { id: Number(mediaId), companyId } });
      if (mf) {
        const normalizedStorage = mf.storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
        mediaFilePath = path.join(publicFolder, `company${companyId}`, normalizedStorage);
        mediaFileName = mf.customName || mf.originalName;
        logger.info(`[StageAutomation][WhatsApp] Mídia biblioteca ${mediaId}: ${mediaFileName}`);
      } else {
        logger.warn(`[StageAutomation][WhatsApp] Mídia ${mediaId} não encontrada`);
      }
    }

    // Aplica variáveis de template
    const finalText = renderCampaignTemplate(textBody, contact) as string;

    if (mediaFilePath) {
      const { getMessageOptions } = await import("../WbotServices/SendWhatsAppMedia");
      const { getWbot } = await import("../../libs/wbot");
      const CreateMessageService = (await import("../MessageServices/CreateMessageService")).default;
      const mimeLookup = require("mime-types").lookup;

      const wbot = await getWbot(ticket.whatsappId);
      const options = await getMessageOptions(mediaFileName || "arquivo", mediaFilePath, String(companyId), finalText);

      if (!options) {
        return { success: false, message: "Falha ao preparar opções de mídia" };
      }

      const remoteJid =
        contact.remoteJid && contact.remoteJid.includes("@")
          ? contact.remoteJid
          : `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;

      const sentMessage = await wbot.sendMessage(remoteJid, options);
      logger.info(`[StageAutomation][WhatsApp] Mídia enviada: ${sentMessage?.key?.id}`);

      const mimeType = mimeLookup(mediaFilePath) || "application/octet-stream";
      const mediaType = String(mimeType).split("/")[0];

      const messageData = {
        wid: sentMessage.key.id,
        ticketId: ticket.id,
        contactId: undefined,
        body: finalText || mediaFileName,
        fromMe: true,
        read: true,
        mediaUrl: mediaFileName,
        mediaType,
        quotedMsgId: null,
        ack: 2,
        remoteJid,
        participant: null,
        dataJson: JSON.stringify(sentMessage),
        ticketTrakingId: null,
        isForwarded: false
      };
      await CreateMessageService({ messageData, companyId: ticket.companyId });
      await ticket.update({ lastMessage: finalText || `📎 ${mediaFileName}`, imported: null });

      return { success: true, message: "Mídia enviada com sucesso" };
    }

    // Envio de texto simples
    if (!finalText) {
      return { success: false, message: "Mensagem vazia e nenhuma mídia configurada" };
    }

    await SendWhatsAppMessage({ body: finalText, ticket });
    logger.info(`[StageAutomation][WhatsApp] Mensagem de texto enviada com sucesso`);
    return { success: true, message: "Mensagem enviada com sucesso" };
  } catch (error: any) {
    logger.error(`[StageAutomation][WhatsApp] Erro ao enviar: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar ação de adicionar tag
const executeActionAddTag = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!contact) {
      return { success: false, message: "Oportunidade sem contato - add_tag ignorada" };
    }

    const { tagId } = action.actionConfig;

    if (!tagId) {
      return { success: false, message: "Tag não especificada" };
    }

    const tag = await Tag.findOne({ where: { id: tagId, companyId } });
    if (!tag) {
      return { success: false, message: "Tag não encontrada" };
    }

    await ContactTag.findOrCreate({
      where: { contactId: contact.id, tagId: tag.id },
      defaults: { contactId: contact.id, tagId: tag.id }
    });

    if (ticket) {
      await TicketTag.findOrCreate({
        where: { ticketId: ticket.id, tagId: tag.id },
        defaults: { ticketId: ticket.id, tagId: tag.id }
      });
    }

    return { success: true, message: `Tag "${tag.name}" adicionada` };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao adicionar tag: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar ação de remover tag
const executeActionRemoveTag = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!contact) {
      return { success: false, message: "Oportunidade sem contato - remove_tag ignorada" };
    }

    const { tagId } = action.actionConfig;

    if (!tagId) {
      return { success: false, message: "Tag não especificada" };
    }

    await ContactTag.destroy({ where: { contactId: contact.id, tagId } });

    if (ticket) {
      await TicketTag.destroy({ where: { ticketId: ticket.id, tagId } });
    }

    return { success: true, message: "Tag removida" };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao remover tag: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar ação de mover no Kanban
const executeActionMoveKanban = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const { tagId } = action.actionConfig; // tagId representa a lane do kanban

    if (!ticket) {
      return { success: false, message: "Ticket não encontrado" };
    }

    const tag = await Tag.findOne({ where: { id: tagId, companyId } });
    if (!tag) {
      return { success: false, message: "Lane do Kanban não encontrada" };
    }

    // Remover tags kanban anteriores
    await TicketTag.destroy({
      where: { ticketId: ticket.id }
    });

    // Adicionar nova tag kanban
    await TicketTag.create({
      ticketId: ticket.id,
      tagId: tag.id
    });

    return { success: true, message: `Movido para "${tag.name}"` };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao mover no Kanban: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar ação de transferir para fila
const executeActionTransferQueue = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const { queueId } = action.actionConfig;

    if (!ticket) {
      return { success: false, message: "Ticket não encontrado" };
    }

    await UpdateTicketService({
      ticketData: { queueId },
      ticketId: ticket.id,
      companyId
    });

    return { success: true, message: "Transferido para fila" };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao transferir para fila: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar ação de transferir para usuário
const executeActionTransferUser = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const { userId } = action.actionConfig;

    if (!ticket) {
      return { success: false, message: "Ticket não encontrado" };
    }

    await UpdateTicketService({
      ticketData: { userId, status: "open" },
      ticketId: ticket.id,
      companyId
    });

    return { success: true, message: "Transferido para atendente" };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao transferir para usuário: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar ação de fechar ticket
const executeActionCloseTicket = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!ticket) {
      return { success: false, message: "Ticket não encontrado" };
    }

    await UpdateTicketService({
      ticketData: { status: "closed" },
      ticketId: ticket.id,
      companyId
    });

    return { success: true, message: "Ticket fechado" };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao fechar ticket: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar ação de criar tarefa
const executeActionCreateTask = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number,
  opportunityId?: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const { title, description, priority, listId } = action.actionConfig || {};

    const CrmLead = (await import("../../models/CrmLead")).default;
    let lead = null;
    if (contact) {
      lead = await CrmLead.findOne({ where: { contactId: contact.id, companyId } });
    } else if (opportunityId) {
      const Opportunity = (await import("../../models/Opportunity")).default;
      const opp = await Opportunity.findOne({ where: { id: opportunityId, companyId } });
      if (opp?.leadId) {
        lead = await CrmLead.findOne({ where: { id: opp.leadId, companyId } });
      }
    }

    let targetListId = listId ? Number(listId) : null;
    if (!targetListId) {
      const TaskBoard = (await import("../../models/TaskBoard")).default;
      const TaskList = (await import("../../models/TaskList")).default;
      const firstBoard = await TaskBoard.findOne({ where: { companyId } });
      if (firstBoard) {
        const firstList = await TaskList.findOne({ where: { boardId: firstBoard.id } });
        if (firstList) {
          targetListId = firstList.id;
        }
      }
    }

    if (!targetListId) {
      return { success: false, message: "Nenhuma lista de tarefas encontrada para criar a tarefa." };
    }

    const Task = (await import("../../models/Task")).default;
    await Task.create({
      listId: targetListId,
      title: title || "Nova Tarefa de Automação",
      description: description || "",
      priority: priority || "normal",
      status: "active",
      leadId: lead?.id || null
    });

    return { success: true, message: "Tarefa criada com sucesso" };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao criar tarefa: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar ação de criar anotação
const executeActionCreateNote = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number,
  opportunityId?: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const { text } = action.actionConfig || {};

    if (!text) {
      return { success: false, message: "Conteúdo da anotação não informado." };
    }

    const Opportunity = (await import("../../models/Opportunity")).default;

    let opportunity = null;
    if (opportunityId) {
      opportunity = await Opportunity.findOne({ where: { id: opportunityId, companyId } });
    } else if (contact) {
      opportunity = await Opportunity.findOne({
        where: { contactId: contact.id, companyId },
        order: [["updatedAt", "DESC"]]
      });
    }

    if (!opportunity) {
      return { success: false, message: "Oportunidade não encontrada para associar a anotação." };
    }

    const CreateOpportunityEventService = (await import("../OpportunityServices/CreateOpportunityEventService")).default;
    await CreateOpportunityEventService({
      opportunityId: opportunity.id,
      companyId,
      type: "ANOTACAO",
      metadata: { text }
    });

    return { success: true, message: "Anotação criada com sucesso" };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao criar anotação: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar ação de mover lead de etapa
const executeActionMoveLead = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number,
  opportunityId?: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const { destinationStageId } = action.actionConfig || {};

    if (!destinationStageId) {
      return { success: false, message: "Etapa de destino não configurada." };
    }

    const Opportunity = (await import("../../models/Opportunity")).default;
    let opportunity = null;
    if (opportunityId) {
      opportunity = await Opportunity.findOne({ where: { id: opportunityId, companyId } });
    } else if (contact) {
      opportunity = await Opportunity.findOne({
        where: { contactId: contact.id, companyId },
        order: [["updatedAt", "DESC"]]
      });
    }

    if (!opportunity) {
      return { success: false, message: "Oportunidade não encontrada para mover de etapa." };
    }

    if (Number(opportunity.stageId) === Number(destinationStageId)) {
      return { success: true, message: "Lead já se encontra na etapa de destino." };
    }

    const MoveOpportunityService = (await import("../OpportunityServices/MoveOpportunityService")).default;
    await MoveOpportunityService({
      opportunityId: opportunity.id,
      toStageId: Number(destinationStageId),
      companyId,
      movedBy: "AUTOMATION",
      reason: "Movimentação automática por regra de etapa"
    });

    return { success: true, message: `Oportunidade movida para a etapa ${destinationStageId} com sucesso.` };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao mover lead de etapa: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar ação de criar tarefa de ligação
const executeActionCallTask = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number,
  opportunityId?: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const { title, description, priority, listId } = action.actionConfig || {};

    const CrmLead = (await import("../../models/CrmLead")).default;
    let lead = null;
    if (contact) {
      lead = await CrmLead.findOne({ where: { contactId: contact.id, companyId } });
    } else if (opportunityId) {
      const Opportunity = (await import("../../models/Opportunity")).default;
      const opp = await Opportunity.findOne({ where: { id: opportunityId, companyId } });
      if (opp?.leadId) {
        lead = await CrmLead.findOne({ where: { id: opp.leadId, companyId } });
      }
    }

    let targetListId = listId ? Number(listId) : null;
    if (!targetListId) {
      const TaskBoard = (await import("../../models/TaskBoard")).default;
      const TaskList = (await import("../../models/TaskList")).default;
      const firstBoard = await TaskBoard.findOne({ where: { companyId } });
      if (firstBoard) {
        const firstList = await TaskList.findOne({ where: { boardId: firstBoard.id } });
        if (firstList) {
          targetListId = firstList.id;
        }
      }
    }

    if (!targetListId) {
      return { success: false, message: "Nenhuma lista de tarefas encontrada para criar a tarefa de ligação." };
    }

    const Task = (await import("../../models/Task")).default;
    await Task.create({
      listId: targetListId,
      title: title || `Telefonar para ${contact?.name || "Contato"}`,
      description: description || "Tarefa de ligação agendada automaticamente por automação de etapa.",
      priority: priority || "high",
      status: "active",
      leadId: lead?.id || null
    });

    return { success: true, message: "Tarefa de ligação criada com sucesso" };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao criar tarefa de ligação: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar uma ação específica
export const executeAction = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number,
  opportunityId?: number
): Promise<{ success: boolean; message: string }> => {
  switch (action.actionType) {
    case "send_message":
      return executeActionSendMessage(action, contact, ticket, companyId, opportunityId);
    case "add_tag":
      return executeActionAddTag(action, contact, ticket, companyId);
    case "remove_tag":
      return executeActionRemoveTag(action, contact, ticket, companyId);
    case "move_kanban":
      return executeActionMoveKanban(action, contact, ticket, companyId);
    case "transfer_queue":
      return executeActionTransferQueue(action, contact, ticket, companyId);
    case "transfer_user":
      return executeActionTransferUser(action, contact, ticket, companyId);
    case "close_ticket":
      return executeActionCloseTicket(action, contact, ticket, companyId);
    case "create_task":
      return executeActionCreateTask(action, contact, ticket, companyId, opportunityId);
    case "create_note":
      return executeActionCreateNote(action, contact, ticket, companyId, opportunityId);
    case "move_lead":
      return executeActionMoveLead(action, contact, ticket, companyId, opportunityId);
    case "call_task":
      return executeActionCallTask(action, contact, ticket, companyId, opportunityId);
    case "wait":
      return { success: true, message: "Aguardando..." };
    default:
      return { success: false, message: `Ação desconhecida: ${action.actionType}` };
  }
};

// Processar automação completa para um contato (contact pode ser null para oportunidades sem contato)
export const processAutomationForContact = async (
  automation: Automation,
  contact: Contact | null,
  ticket: Ticket | null,
  opportunityId?: number
): Promise<void> => {
  const companyId = automation.companyId;
  const settings = await getCampaignSettings(companyId);

  const actions = await AutomationAction.findAll({
    where: { automationId: automation.id },
    order: [["order", "ASC"]]
  });

  let messageCount = 0;

  for (const action of actions) {
    const isInstantAction = INSTANT_ACTIONS.has(action.actionType);

    if (isInstantAction) {
      const result = await executeAction(action, contact, ticket, companyId, opportunityId);

      await AutomationLog.create({
        automationId: automation.id,
        contactId: contact?.id || null,
        ticketId: ticket?.id,
        status: result.success ? "completed" : "failed",
        executedAt: new Date(),
        result,
        error: result.success ? null : result.message
      });

      if (!result.success) {
        logger.warn(`[Automation] Ação instantânea ${action.actionType} falhou: ${result.message}`);
      }
      continue;
    }

    // Ações não-instantâneas sem contato não podem ser agendadas (dependem de contato para execução)
    if (!contact && action.actionType === "send_message") {
      logger.warn(`[Automation] Ação send_message ignorada para oportunidade ${opportunityId}: sem contato associado`);
      continue;
    }

    const anchorMoment = isWithinDispatchHours(settings, automation.triggerType)
      ? moment()
      : moment(getNextDispatchDate(settings, automation.triggerType));

    const delaySeconds =
      action.delayMinutes > 0
        ? action.delayMinutes * 60
        : calculateDelay(settings, messageCount);

    const scheduledAt = anchorMoment.clone().add(delaySeconds, "seconds").toDate();

    const execution = await AutomationExecution.create({
      automationId: automation.id,
      automationActionId: action.id,
      contactId: contact?.id || null,
      ticketId: ticket?.id,
      scheduledAt,
      status: "scheduled",
      metadata: { actionType: action.actionType, opportunityId: opportunityId || null }
    });

    await AutomationLog.create({
      automationId: automation.id,
      contactId: contact?.id || null,
      ticketId: ticket?.id,
      status: "pending",
      result: { executionId: execution.id, actionType: action.actionType }
    });

    if (action.actionType === "send_message") {
      messageCount++;
    }
  }

  logger.info(`[Automation] ${actions.length} ações processadas para automação ${automation.id}${contact ? `, contato ${contact.id}` : `, oportunidade ${opportunityId}`}`);
};

// Buscar automações por gatilho
export const getAutomationsByTrigger = async (
  companyId: number,
  triggerType: string
): Promise<Automation[]> => {
  return Automation.findAll({
    where: {
      companyId,
      triggerType,
      isActive: true
    },
    include: [
      {
        model: AutomationAction,
        as: "actions",
        separate: true,
        order: [["order", "ASC"]]
      }
    ]
  });
};

