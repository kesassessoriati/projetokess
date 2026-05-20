import { Op } from "sequelize";
import Appointment from "../../models/Appointment";
import AiExternalAgentConfig from "../../models/AiExternalAgentConfig";
import AiExternalAppointment from "../../models/AiExternalAppointment";
import AiExternalReminder from "../../models/AiExternalReminder";
import Company from "../../models/Company";
import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";
import { ProviderFactory } from "../whatsapp/providers/ProviderFactory";
import { sendButtonMessage } from "../../helpers/SendInteractiveMessage";
import logger from "../../utils/logger";
import GetOrCreateExternalAgentConfigService from "./GetOrCreateExternalAgentConfigService";
import { dispatchReminderFlowTrigger } from "../FlowBuilderService/FlowTriggerPayloads";

type GroupEventType = "appointmentCreated" | "reminderSent" | "appointmentCancelled";

const formatDate = (value?: Date | string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

const formatTime = (value?: Date | string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

const normalizeGroupJid = (value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("@")) return raw;
  return `${raw}@g.us`;
};

const normalizeContactJid = (value?: string | null) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return `${digits}@s.whatsapp.net`;
};

export const renderAiExternalTemplate = (
  template: string,
  variables: Record<string, string>
) =>
  String(template || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => variables[key] || "");

const getCompanyName = async (companyId: number) => {
  const company = await Company.findByPk(companyId, { attributes: ["id", "name"] as any });
  return String((company as any)?.name || "");
};

const buildVariables = async ({
  companyId,
  appointment,
  aiAppointment,
  reminder,
  cancellationReason
}: {
  companyId: number;
  appointment?: Appointment | null;
  aiAppointment?: AiExternalAppointment | null;
  reminder?: AiExternalReminder | null;
  cancellationReason?: string | null;
}) => {
  const appointmentDate = appointment?.startDatetime || aiAppointment?.startDatetime || null;
  const leadName = appointment?.leadName || aiAppointment?.leadName || reminder?.leadName || "";
  const leadPhone = appointment?.leadPhone || aiAppointment?.leadPhone || reminder?.leadPhone || "";

  return {
    leadName,
    leadPhone,
    appointmentDate: formatDate(appointmentDate),
    appointmentTime: formatTime(appointmentDate),
    appointmentDateTime: formatDateTime(appointmentDate),
    companyName: await getCompanyName(companyId),
    cancellationReason: cancellationReason || aiAppointment?.cancellationReason || ""
  };
};

const getGroupSettings = (config: AiExternalAgentConfig, eventType: GroupEventType) => {
  const settings = (config.metadata || {}).groupNotifications?.[eventType] || {};
  return {
    enabled: settings.enabled === true,
    whatsappId: Number(settings.whatsappId || 0),
    groupNumber: String(settings.groupNumber || "").trim(),
    message: String(settings.message || "").trim()
  };
};

const getReminderSettings = (config: AiExternalAgentConfig) => {
  const settings = (config.metadata || {}).autoReminder || {};
  return {
    enabled: settings.enabled !== false,
    whatsappId: Number(settings.whatsappId || 0),
    footer: String(settings.footer || ""),
    buttons: Array.isArray(settings.buttons) ? settings.buttons : []
  };
};

const normalizeButtons = (buttons: any[]) =>
  buttons
    .slice(0, 3)
    .map((button, index) => ({
      type: "reply",
      displayText: String(button?.displayText || button?.buttonText?.displayText || `Opcao ${index + 1}`),
      value: String(button?.value || button?.buttonId || index + 1)
    }))
    .filter(button => button.displayText.trim());

const sendTextWithConnection = async ({
  companyId,
  whatsappId,
  to,
  text,
  footer,
  buttons
}: {
  companyId: number;
  whatsappId: number;
  to: string;
  text: string;
  footer?: string;
  buttons?: any[];
}) => {
  const whatsapp = await Whatsapp.findOne({ where: { id: whatsappId, companyId } });
  if (!whatsapp) throw new Error("Conexao de envio nao encontrada.");

  const wbot = getWbot(whatsapp.id);
  const normalizedButtons = normalizeButtons(buttons || []);
  if (normalizedButtons.length) {
    return sendButtonMessage(wbot, to, text, footer || "", normalizedButtons as any);
  }

  return wbot.sendMessage(to, { text });
};

export const notifyAiExternalGroup = async ({
  companyId,
  eventType,
  appointment,
  aiAppointment,
  reminder,
  cancellationReason
}: {
  companyId: number;
  eventType: GroupEventType;
  appointment?: Appointment | null;
  aiAppointment?: AiExternalAppointment | null;
  reminder?: AiExternalReminder | null;
  cancellationReason?: string | null;
}): Promise<boolean> => {
  const config = await GetOrCreateExternalAgentConfigService({ companyId });
  const settings = getGroupSettings(config, eventType);
  if (!settings.enabled || !settings.whatsappId || !settings.groupNumber || !settings.message) return false;

  try {
    const whatsapp = await Whatsapp.findOne({ where: { id: settings.whatsappId, companyId } });
    if (!whatsapp) throw new Error("Conexao de grupo nao encontrada para a empresa.");

    const wbot = whatsapp.provider === "whatsmeow" ? null : getWbot(whatsapp.id);
    const provider = ProviderFactory.createProvider(whatsapp, wbot, companyId);
    const variables = await buildVariables({
      companyId,
      appointment,
      aiAppointment,
      reminder,
      cancellationReason
    });
    const text = renderAiExternalTemplate(settings.message, variables);
    if (!text.trim()) return false;

    await provider.sendGroupMessage(normalizeGroupJid(settings.groupNumber), { text });
    return true;
  } catch (error: any) {
    logger.warn(`[AiExternalAgent] Falha ao notificar grupo (${eventType}): ${error?.message || error}`);
    return false;
  }
};

export const sendAiExternalReminderNow = async (
  reminder: AiExternalReminder
): Promise<AiExternalReminder> => {
  const config = await GetOrCreateExternalAgentConfigService({ companyId: reminder.companyId });
  const settings = getReminderSettings(config);
  if (!settings.enabled || !settings.whatsappId) {
    throw new Error("Conexao de envio do lembrete nao configurada.");
  }

  const aiAppointment =
    (reminder as any).aiAppointment ||
    (reminder.aiAppointmentId
      ? await AiExternalAppointment.findOne({
          where: { id: reminder.aiAppointmentId, companyId: reminder.companyId }
        })
      : null);
  const variables = await buildVariables({
    companyId: reminder.companyId,
    aiAppointment,
    reminder
  });
  const message = renderAiExternalTemplate(
    reminder.message || reminder.metadata?.interactivePayload?.text || "",
    variables
  );
  const targetJid = normalizeContactJid(reminder.leadPhone || aiAppointment?.leadPhone);
  if (!targetJid) throw new Error("Telefone do lead nao informado.");
  if (!message.trim()) throw new Error("Mensagem do lembrete vazia.");

  await sendTextWithConnection({
    companyId: reminder.companyId,
    whatsappId: settings.whatsappId,
    to: targetJid,
    text: message,
    footer: settings.footer,
    buttons: settings.buttons
  });

  await reminder.update({ status: "sent", sentAt: new Date(), message });
  dispatchReminderFlowTrigger("reminder_sent", reminder, { whatsappId: settings.whatsappId });

  return reminder.reload();
};

export const processAiExternalReminders = async ({ companyId }: { companyId?: number } = {}) => {
  const where: Record<string, any> = {
    status: "pending",
    scheduledAt: { [Op.lte]: new Date() }
  };
  if (companyId) where.companyId = companyId;

  const reminders = await AiExternalReminder.findAll({
    where,
    include: [{ model: AiExternalAppointment, as: "aiAppointment", required: false }],
    order: [["scheduledAt", "ASC"]],
    limit: 25
  });

  for (const reminder of reminders) {
    const [locked] = await AiExternalReminder.update(
      { status: "processing" },
      { where: { id: reminder.id, status: "pending" } }
    );
    if (!locked) continue;

    try {
      const aiAppointment = reminder.aiAppointment;
      await sendAiExternalReminderNow(reminder);
      await notifyAiExternalGroup({
        companyId: reminder.companyId,
        eventType: "reminderSent",
        aiAppointment,
        reminder
      });
    } catch (error: any) {
      await reminder.update({
        status: "failed",
        metadata: {
          ...(reminder.metadata || {}),
          lastSendError: error?.message || String(error)
        }
      });
      logger.warn(`[AiExternalAgent] Falha ao enviar lembrete ${reminder.id}: ${error?.message || error}`);
    }
  }
};
