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
import { renderAppointmentVariables } from "../../helpers/RenderAppointmentVariables";
import { isSafeWebhookUrl } from "../../helpers/isSafeWebhookUrl";
import path from "path";
import {
  evaluateCondition,
  normalizeCondition,
  normalizeFlowControl,
  getEffectiveActionUid,
  hasExecutedInCycle,
  recordStageAutomationLog
} from "./AutomationConditionService";

export interface AutomationCycleContext {
  cycleId: string;
  expectedStageId: number | null;
  cycleStartedAt: Date;
}

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

interface OpportunityAutomationContextRequest {
  companyId: number;
  opportunityId?: number;
  contact?: Contact | null;
  ticket?: Ticket | null;
  actions?: AutomationAction[];
}

interface OpportunityAutomationContext {
  opportunity: any | null;
  contact: Contact | null;
  ticket: Ticket | null;
  phoneNumber: string | null;
  missingReason?: string;
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
  "create_note",
  "ai_actions",
  "set_lead_product",
  "send_webhook",
  "stop_automation"
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

export const resolveOpportunityAutomationContext = async ({
  companyId,
  opportunityId,
  contact: initialContact = null,
  ticket: initialTicket = null,
  actions = []
}: OpportunityAutomationContextRequest): Promise<OpportunityAutomationContext> => {
  let contact = initialContact;
  let ticket = initialTicket;
  let opportunity: any = null;

  if (opportunityId) {
    const Opportunity = (await import("../../models/Opportunity")).default;
    const CrmLead = (await import("../../models/CrmLead")).default;

    opportunity = await Opportunity.findOne({
      where: { id: opportunityId, companyId },
      include: [
        { model: Contact, as: "contact", required: false },
        {
          model: Ticket,
          as: "ticket",
          required: false,
          include: [{ model: Contact, as: "contact", required: false }]
        },
        {
          model: CrmLead,
          as: "lead",
          required: false,
          include: [
            { model: Contact, as: "contact", required: false },
            {
              model: Ticket,
              as: "primaryTicket",
              required: false,
              include: [{ model: Contact, as: "contact", required: false }]
            }
          ]
        }
      ]
    });

    if (!opportunity) {
      return {
        opportunity: null,
        contact,
        ticket,
        phoneNumber: contact?.number || null,
        missingReason: "Oportunidade não encontrada."
      };
    }

    ticket = ticket || opportunity.ticket || opportunity.lead?.primaryTicket || null;
    contact =
      contact ||
      opportunity.contact ||
      ticket?.contact ||
      opportunity.lead?.contact ||
      opportunity.lead?.primaryTicket?.contact ||
      null;

    if (!contact && opportunity.contactId) {
      contact = await Contact.findOne({ where: { id: opportunity.contactId, companyId } });
    }

    if (!contact && ticket?.contactId) {
      contact = await Contact.findOne({ where: { id: ticket.contactId, companyId } });
    }

    if (!contact && opportunity.lead?.contactId) {
      contact = await Contact.findOne({ where: { id: opportunity.lead.contactId, companyId } });
    }

    if (!contact && opportunity.lead?.primaryTicket?.contactId) {
      contact = await Contact.findOne({
        where: { id: opportunity.lead.primaryTicket.contactId, companyId }
      });
    }
  }

  const phoneNumber =
    contact?.number ||
    opportunity?.lead?.phone ||
    opportunity?.lead?.decisionMakerPhone ||
    null;

  const hasSendMessage = actions.some(action => action.actionType === "send_message");

  if (hasSendMessage && contact && !ticket) {
    ticket = await Ticket.findOne({
      where: {
        contactId: contact.id,
        companyId,
        status: { [Op.notIn]: ["closed", "lgpd", "nps"] }
      },
      order: [["updatedAt", "DESC"]]
    });
  }

  if (hasSendMessage && contact && !ticket && contact.number) {
    const sendMessageAction = actions.find(action => action.actionType === "send_message");
    const configWhatsappId = sendMessageAction?.actionConfig?.whatsappId;

    let whatsappForTicket: any = null;
    if (configWhatsappId) {
      const WhatsappModel = (await import("../../models/Whatsapp")).default;
      whatsappForTicket = await WhatsappModel.findOne({
        where: { id: Number(configWhatsappId), companyId }
      });
    }

    if (!whatsappForTicket) {
      const GetDefaultWhatsApp = (await import("../../helpers/GetDefaultWhatsApp")).default;
      whatsappForTicket = await GetDefaultWhatsApp(companyId);
    }

    if (whatsappForTicket) {
      const FindOrCreateTicketService = (await import("../TicketServices/FindOrCreateTicketService")).default;
      ticket = await FindOrCreateTicketService(
        contact,
        whatsappForTicket,
        0,
        companyId,
        0,
        null,
        null,
        "whatsapp",
        null,
        false
      );

      if (opportunity && ticket && Number(opportunity.ticketId) !== Number(ticket.id)) {
        await opportunity.update({ ticketId: ticket.id });
      }
    }
  }

  let missingReason: string | undefined;
  if (!contact) {
    missingReason =
      "Não foi possível resolver contato: oportunidade não possui contato, ticket com contato ou lead com contato associado.";
  } else if (hasSendMessage && !contact.number) {
    missingReason = `Não foi possível enviar mensagem: contato ${contact.id} não possui telefone válido.`;
  } else if (hasSendMessage && !ticket) {
    missingReason =
      "Não foi possível enviar mensagem: nenhum ticket ativo encontrado/criado para o contato.";
  }

  return { opportunity, contact, ticket, phoneNumber, missingReason };
};

// Calcular delay baseado nas configurações
const calculateDelay = (settings: CampaignSettings, messageCount: number): number => {
  if (messageCount >= settings.longerIntervalAfter) {
    return settings.greaterInterval;
  }
  return settings.messageInterval;
};

// Executar ação de enviar mensagem com botões interativos.
// Reaproveita o mesmo helper/payload do Disparo Rápido (sendButtonMessage),
// que já possui fallback automático para texto numerado quando o canal não
// suporta botões nativos.
const sendAutomationButtons = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!contact) {
      return { success: false, message: "Não foi possível enviar botões: oportunidade sem contato." };
    }
    if (!ticket) {
      return { success: false, message: "Não foi possível enviar botões: nenhum ticket ativo para o contato." };
    }

    const { message, whatsappId, buttons } = action.actionConfig || {};
    const buttonList = Array.isArray(buttons)
      ? buttons.filter((b: any) => b && String(b.displayText || "").trim())
      : [];

    if (buttonList.length === 0) {
      return { success: false, message: "Nenhum botão configurado na ação." };
    }

    if (whatsappId && Number(ticket.whatsappId) !== Number(whatsappId)) {
      await ticket.update({ whatsappId: Number(whatsappId) });
      await ticket.reload();
    }

    // Renderiza variáveis: agendamento (assíncrono) + contato (template)
    const withAppointment = await renderAppointmentVariables(String(message || ""), {
      companyId,
      contactId: contact.id
    });
    const finalText = renderCampaignTemplate(withAppointment, contact) as string;
    const renderedButtons = renderCampaignTemplate(buttonList, contact) as any[];

    const { getWbot } = await import("../../libs/wbot");
    const { sendButtonMessage } = await import("../../helpers/SendInteractiveMessage");
    const CreateMessageService = (await import("../MessageServices/CreateMessageService")).default;

    const wbot = await getWbot(ticket.whatsappId);
    const remoteJid =
      contact.remoteJid && contact.remoteJid.includes("@")
        ? contact.remoteJid
        : `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;

    const sentMessage = await sendButtonMessage(wbot, remoteJid, finalText || "", "", renderedButtons);

    if (sentMessage?.key?.id) {
      const messageData = {
        wid: sentMessage.key.id,
        ticketId: ticket.id,
        contactId: undefined,
        body: finalText || "Mensagem com botões",
        fromMe: true,
        read: true,
        mediaType: "chat",
        quotedMsgId: null,
        ack: 2,
        remoteJid,
        participant: null,
        dataJson: JSON.stringify(sentMessage),
        ticketTrakingId: null,
        isForwarded: false
      };
      await CreateMessageService({ messageData, companyId: ticket.companyId });
      await ticket.update({ lastMessage: finalText || "Mensagem com botões", imported: null });
    }

    logger.info(`[StageAutomation][Buttons] Botões enviados para contato ${contact.id}, ticket ${ticket.id}`);
    return { success: true, message: "Mensagem com botões enviada com sucesso" };
  } catch (error: any) {
    logger.error(`[StageAutomation][Buttons] Erro ao enviar botões: ${error.message}`);
    return { success: false, message: error.message };
  }
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
      return {
        success: false,
        message: "Não foi possível enviar mensagem: oportunidade não possui contato, ticket ou telefone associado."
      };
    }

    if (!ticket) {
      logger.warn(`[StageAutomation][WhatsApp] Contato ${contact.id} sem ticket - send_message ignorada`);
      return {
        success: false,
        message: "Não foi possível enviar mensagem: nenhum ticket ativo encontrado/criado para o contato."
      };
    }

    // Mensagem com botões: delega ao helper compartilhado com o Disparo Rápido.
    if (action.actionConfig?.messageType === "buttons") {
      return sendAutomationButtons(action, contact, ticket, companyId);
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

    // Aplica variáveis de agendamento (assíncrono, só consulta se houver token)
    // e em seguida as variáveis de contato/template.
    const textWithAppointment = await renderAppointmentVariables(textBody, {
      companyId,
      contactId: contact.id
    });
    const finalText = renderCampaignTemplate(textWithAppointment, contact) as string;

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
      return {
        success: false,
        message: "Não foi possível aplicar etiqueta: oportunidade não possui contato, ticket ou lead com contato associado."
      };
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

// Executar ação de bloqueio/controle de IA
const executeActionAiActions = async (
  action: AutomationAction,
  contact: Contact | null,
  _ticket: Ticket | null,
  _companyId: number,
  _opportunityId?: number
): Promise<{ success: boolean; message: string }> => {
  if (!contact) {
    return { success: false, message: "Contato não encontrado para aplicar ação de IA." };
  }

  const { aiAction, duration, unit, reason, stageId } = action.actionConfig || {};

  try {
    if (aiAction === "pause_for") {
      const rawDuration = parseInt(String(duration || "24"), 10);
      const safeUnit = unit === "days" ? "days" : unit === "minutes" ? "minutes" : "hours";
      const minutes =
        safeUnit === "days"
          ? rawDuration * 24 * 60
          : safeUnit === "minutes"
          ? rawDuration
          : rawDuration * 60;

      if (minutes <= 0) {
        return { success: false, message: "Duração de pausa inválida (deve ser > 0)." };
      }

      const blockedUntil = moment().add(minutes, "minutes").toDate();
      const targetStageId = stageId ? Number(stageId) : null;
      await contact.update({ aiBlockedUntil: blockedUntil, aiBlockMode: "pause_until", aiBlockedByStageId: targetStageId });

      logger.info(
        `[AI Actions] pause_for contact=${contact.id} until=${blockedUntil.toISOString()} ` +
        `duration=${rawDuration}${safeUnit} stageId=${targetStageId} reason="${reason || ""}"`
      );
      return { success: true, message: `IA pausada por ${rawDuration} ${safeUnit} (até ${blockedUntil.toISOString()})` };
    }

    if (aiAction === "disable_in_stage") {
      const targetStageId = stageId ? Number(stageId) : null;

      // Guard: verificar se a oportunidade ainda está na etapa esperada (protege jobs atrasados)
      if (targetStageId && _opportunityId) {
        const Opportunity = (await import("../../models/Opportunity")).default;
        const opp = await Opportunity.findOne({
          where: { id: _opportunityId, companyId: _companyId },
          attributes: ["id", "stageId"]
        });
        if (opp && Number(opp.stageId) !== targetStageId) {
          logger.info(
            `[AI Actions] disable_in_stage ignorado — oportunidade ${_opportunityId} saiu da etapa ${targetStageId} ` +
            `(etapa atual: ${opp.stageId}) antes do delay expirar`,
            { opportunityId: _opportunityId, contactId: contact.id, expectedStageId: targetStageId, currentStageId: opp.stageId, companyId: _companyId }
          );
          return { success: false, message: `AI_DELAYED_ACTION_SKIPPED_STAGE_CHANGED` };
        }
      }

      await contact.update({ aiBlockedUntil: null, aiBlockMode: "disabled_in_stage", aiBlockedByStageId: targetStageId });

      logger.info(`[AI Actions] disable_in_stage contact=${contact.id} stageId=${targetStageId} reason="${reason || ""}"`);
      return { success: true, message: `IA desativada enquanto lead estiver na etapa (stageId=${targetStageId})` };
    }

    if (aiAction === "enable_ai") {
      await contact.update({ aiBlockedUntil: null, aiBlockMode: null, aiBlockedByStageId: null });

      logger.info(`[AI Actions] enable_ai contact=${contact.id} reason="${reason || ""}"`);
      return { success: true, message: "IA reativada" };
    }

    return { success: false, message: `Ação de IA desconhecida: ${aiAction}` };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao executar ai_actions: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar ação de enviar webhook (URL fornecida pelo usuário, com guarda SSRF).
// Falha do webhook NÃO derruba o worker (try/catch + timeout curto).
const executeActionSendWebhook = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number,
  opportunityId?: number
): Promise<{ success: boolean; message: string }> => {
  let safeHost = "";
  try {
    const cfg = action.actionConfig || {};
    const url = String(cfg.url || "").trim();
    if (!url) {
      return { success: false, message: "URL do webhook não configurada." };
    }
    if (!isSafeWebhookUrl(url)) {
      return { success: false, message: "URL de webhook inválida ou bloqueada (esquema/host não permitido)." };
    }
    try {
      safeHost = new URL(url).host; // logamos apenas o host, nunca a URL completa (pode conter tokens)
    } catch {
      safeHost = "";
    }

    const method = String(cfg.method || "POST").toUpperCase() === "GET" ? "GET" : "POST";

    // Enriquecer com dados básicos do lead, se houver oportunidade
    let leadInfo: any = null;
    if (opportunityId) {
      const Opportunity = (await import("../../models/Opportunity")).default;
      const CrmLead = (await import("../../models/CrmLead")).default;
      const opp = await Opportunity.findOne({
        where: { id: opportunityId, companyId },
        attributes: ["id", "leadId", "stageId", "pipelineId", "value", "title"]
      });
      if (opp?.leadId) {
        const lead = await CrmLead.findOne({
          where: { id: opp.leadId, companyId },
          attributes: ["id", "name", "phone", "companyName", "email", "status", "product"]
        });
        if (lead) {
          leadInfo = {
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            companyName: lead.companyName,
            email: lead.email,
            status: lead.status,
            product: lead.product
          };
        }
      }
    }

    const payload = {
      event: "STAGE_AUTOMATION",
      companyId,
      opportunityId: opportunityId || null,
      ticketId: ticket?.id || null,
      contact: contact
        ? { id: contact.id, name: contact.name, number: contact.number, email: contact.email }
        : null,
      lead: leadInfo,
      sentAt: new Date().toISOString()
    };

    const axios = (await import("axios")).default;
    const response = await axios.request({
      url,
      method,
      data: method === "POST" ? payload : undefined,
      params: method === "GET" ? { companyId, opportunityId: opportunityId || "" } : undefined,
      timeout: 8000,
      maxRedirects: 2,
      maxContentLength: 1024 * 256,
      headers: { "Content-Type": "application/json", "User-Agent": "AtendZappy-Automation" },
      validateStatus: () => true
    });

    if (response.status >= 200 && response.status < 300) {
      logger.info(`[StageAutomation][Webhook] Enviado para host ${safeHost} (HTTP ${response.status})`);
      return { success: true, message: `Webhook enviado (HTTP ${response.status}).` };
    }
    logger.warn(`[StageAutomation][Webhook] Host ${safeHost} respondeu HTTP ${response.status}`);
    return { success: false, message: `Webhook respondeu HTTP ${response.status}.` };
  } catch (error: any) {
    // Não logar a URL (pode conter segredos); apenas host + mensagem
    logger.error(`[StageAutomation][Webhook] Falha ao enviar para host ${safeHost || "?"}: ${error.message}`);
    return { success: false, message: `Falha ao enviar webhook: ${error.message}` };
  }
};

// Ação "Parar Automação": no-op que encerra o ciclo (tratada nos loops de ciclo).
const executeActionStopAutomation = async (): Promise<{ success: boolean; message: string }> => {
  return { success: true, message: "Automação interrompida neste ciclo." };
};

// Executar ação de vincular produto ao lead.
// Fase C: grava no campo string CrmLead.product (sem pivot lead↔produto).
const executeActionSetLeadProduct = async (
  action: AutomationAction,
  contact: Contact | null,
  ticket: Ticket | null,
  companyId: number,
  opportunityId?: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const { productId, productName, replaceExisting } = action.actionConfig || {};

    const CrmLead = (await import("../../models/CrmLead")).default;

    // Resolver o lead a partir da oportunidade ou do contato
    let lead: any = null;
    if (opportunityId) {
      const Opportunity = (await import("../../models/Opportunity")).default;
      const opp = await Opportunity.findOne({ where: { id: opportunityId, companyId } });
      if (opp?.leadId) {
        lead = await CrmLead.findOne({ where: { id: opp.leadId, companyId } });
      }
    }
    if (!lead && contact) {
      lead = await CrmLead.findOne({
        where: { contactId: contact.id, companyId },
        order: [["updatedAt", "DESC"]]
      });
    }

    if (!lead) {
      return { success: false, message: "Lead não encontrado para vincular o produto." };
    }

    // Resolver nome do produto: productId (validado por empresa) tem prioridade
    let resolvedName = "";
    if (productId) {
      const Produto = (await import("../../models/Produto")).default;
      const produto = await Produto.findOne({ where: { id: Number(productId), companyId } });
      if (!produto) {
        return { success: false, message: "Produto não encontrado ou não pertence a esta empresa." };
      }
      resolvedName = String((produto as any).nome || (produto as any).name || "").trim();
    }
    if (!resolvedName && productName) {
      resolvedName = String(productName).trim();
    }

    if (!resolvedName) {
      return { success: false, message: "Informe um produto (productId ou productName) para vincular." };
    }

    // Sanitiza (remove angulares e espacos extras) e limita o tamanho
    resolvedName = resolvedName.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 200);

    const current = String(lead.product || "").trim();
    if (current && !replaceExisting) {
      return { success: true, message: `Lead já possui produto ("${current}") — mantido (replaceExisting=false).` };
    }

    await lead.update({ product: resolvedName }, { hooks: false });

    return { success: true, message: `Produto "${resolvedName}" vinculado ao lead.` };
  } catch (error: any) {
    logger.error(`[Automation] Erro ao vincular produto: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Executar uma ação específica
const withStageAutomationAiConfig = (
  automation: Automation,
  action: AutomationAction
): AutomationAction => {
  const actionConfig = action.actionConfig || {};
  const stageId = automation.triggerConfig?.stageId;

  if (
    automation.triggerType === "crm_stage" &&
    action.actionType === "ai_actions" &&
    (actionConfig.aiAction === "disable_in_stage" || actionConfig.aiAction === "pause_for") &&
    stageId &&
    !actionConfig.stageId
  ) {
    action.actionConfig = { ...actionConfig, stageId: Number(stageId) };
  }

  return action;
};

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
    case "ai_actions":
      return executeActionAiActions(action, contact, ticket, companyId, opportunityId);
    case "set_lead_product":
      return executeActionSetLeadProduct(action, contact, ticket, companyId, opportunityId);
    case "send_webhook":
      return executeActionSendWebhook(action, contact, ticket, companyId, opportunityId);
    case "stop_automation":
      return executeActionStopAutomation();
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
  opportunityId?: number,
  cycleContext?: AutomationCycleContext
): Promise<void> => {
  const companyId = automation.companyId;
  const settings = await getCampaignSettings(companyId);

  // Motor condicional/anti-loop só se aplica às automações por etapa do pipeline
  // (Fase A). Demais gatilhos (birthday/kanban_time/no_response) mantêm o
  // comportamento legado inalterado.
  const useCycle = !!cycleContext && automation.triggerType === "crm_stage";

  const actions = await AutomationAction.findAll({
    where: { automationId: automation.id },
    order: [["order", "ASC"]]
  });

  const context = await resolveOpportunityAutomationContext({
    companyId,
    opportunityId,
    contact,
    ticket,
    actions
  });
  contact = context.contact;
  ticket = context.ticket;

  let messageCount = 0;

  for (const rawAction of actions) {
    const action = withStageAutomationAiConfig(automation, rawAction);
    const isInstantAction = INSTANT_ACTIONS.has(action.actionType);

    // =========================================================================
    // Caminho com ciclo (automação por etapa do pipeline) — condições + flow + anti-loop
    // =========================================================================
    if (useCycle && cycleContext) {
      const actionUid = getEffectiveActionUid(action);
      const flow = normalizeFlowControl(action.flowControl);
      const condition = normalizeCondition(action.condition);

      const baseLog = {
        companyId,
        automationId: automation.id,
        actionUid,
        cycleId: cycleContext.cycleId,
        opportunityId: opportunityId || null,
        contactId: contact?.id || null,
        ticketId: ticket?.id || null,
        stageId: cycleContext.expectedStageId,
        metadata: { actionType: action.actionType, order: action.order }
      };

      // Não repetir a mesma ação no mesmo ciclo
      if (
        flow.skipIfAlreadyExecuted &&
        (await hasExecutedInCycle(companyId, cycleContext.cycleId, actionUid))
      ) {
        await recordStageAutomationLog({
          ...baseLog,
          status: "skipped",
          reason: "Ação já executada neste ciclo de entrada na etapa."
        });
        continue;
      }

      if (isInstantAction) {
        // Condição avaliada imediatamente (ação sem delay)
        const evalRes = await evaluateCondition(action.condition, {
          companyId,
          opportunityId,
          contact,
          ticket,
          cycleStartedAt: cycleContext.cycleStartedAt,
          expectedStageId: cycleContext.expectedStageId
        });

        if (!evalRes.pass) {
          await recordStageAutomationLog({
            ...baseLog,
            status: "skipped",
            reason: `Condição não satisfeita: ${evalRes.reason}`
          });
          if (condition.stopIfFalse) {
            await recordStageAutomationLog({
              ...baseLog,
              status: "stopped",
              reason: "stopIfFalse: condição falsa encerrou o ciclo."
            });
            logger.info(`[StageAutomation] Ciclo ${cycleContext.cycleId} encerrado por stopIfFalse na ação ${actionUid}`);
            break;
          }
          continue;
        }

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

        await recordStageAutomationLog({
          ...baseLog,
          status: result.success ? "executed" : "failed",
          reason: result.message
        });

        if (!result.success) {
          logger.warn(`[StageAutomation] Ação instantânea ${action.actionType} falhou: ${result.message}`);
          continue;
        }

        if (flow.stopAfterExecute || action.actionType === "stop_automation") {
          await recordStageAutomationLog({
            ...baseLog,
            status: "stopped",
            reason:
              action.actionType === "stop_automation"
                ? "stop_automation: ação encerrou o ciclo."
                : "stopAfterExecute: ação encerrou o ciclo após executar."
          });
          logger.info(`[StageAutomation] Ciclo ${cycleContext.cycleId} encerrado na ação ${actionUid}`);
          break;
        }
        continue;
      }

      // Ação agendada (send_message/move_lead/call_task): condição é avaliada no
      // momento da execução pelo job. Aqui apenas agendamos com o contexto do ciclo.
      if (!contact && action.actionType === "send_message") {
        logger.warn(`[StageAutomation] Ação send_message ignorada para oportunidade ${opportunityId}: sem contato associado`);
        await recordStageAutomationLog({
          ...baseLog,
          status: "skipped",
          reason: "send_message sem contato associado."
        });
        continue;
      }

      const anchorMomentCycle = isWithinDispatchHours(settings, automation.triggerType)
        ? moment()
        : moment(getNextDispatchDate(settings, automation.triggerType));

      const delaySecondsCycle =
        action.delayMinutes > 0
          ? action.delayMinutes * 60
          : calculateDelay(settings, messageCount);

      const scheduledAtCycle = anchorMomentCycle.clone().add(delaySecondsCycle, "seconds").toDate();

      const executionCycle = await AutomationExecution.create({
        automationId: automation.id,
        automationActionId: action.id,
        contactId: contact?.id || null,
        ticketId: ticket?.id,
        cycleId: cycleContext.cycleId,
        actionUid,
        scheduledAt: scheduledAtCycle,
        status: "scheduled",
        metadata: {
          actionType: action.actionType,
          opportunityId: opportunityId || null,
          cycleId: cycleContext.cycleId,
          actionUid,
          expectedStageId: cycleContext.expectedStageId,
          cycleStartedAt: cycleContext.cycleStartedAt.toISOString(),
          companyId
        }
      });

      await AutomationLog.create({
        automationId: automation.id,
        contactId: contact?.id || null,
        ticketId: ticket?.id,
        status: "pending",
        result: { executionId: executionCycle.id, actionType: action.actionType, cycleId: cycleContext.cycleId }
      });

      if (action.actionType === "send_message") {
        messageCount++;
      }
      continue;
    }

    // =========================================================================
    // Caminho legado (sem ciclo) — comportamento inalterado
    // =========================================================================
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

  logger.info(`[Automation] ${actions.length} ações processadas para automação ${automation.id}${contact ? `, contato ${contact.id}` : `, oportunidade ${opportunityId}`}${useCycle ? ` (ciclo ${cycleContext?.cycleId})` : ""}`);
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

