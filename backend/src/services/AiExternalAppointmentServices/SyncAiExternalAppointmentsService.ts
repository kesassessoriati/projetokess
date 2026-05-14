import { Op } from "sequelize";
import AiExternalAppointment from "../../models/AiExternalAppointment";
import AiExternalReminder from "../../models/AiExternalReminder";
import Appointment from "../../models/Appointment";
import CreateAppointmentService from "../AppointmentServices/CreateAppointmentService";
import DeleteAppointmentService from "../AppointmentServices/DeleteAppointmentService";
import GetOrCreateExternalAgentConfigService from "../AiExternalAgentServices/GetOrCreateExternalAgentConfigService";
import {
  buildReminderPayload,
  createReminder,
  getReminderSettings
} from "../AiExternalReminderServices/AiExternalReminderServices";
import logger from "../../utils/logger";

interface Request {
  companyId: number;
  userId?: number;
}

const normalizePhone = (value?: string | null): string =>
  String(value || "").replace(/\D/g, "");

const normalizeText = (value?: string | null): string =>
  String(value || "").trim().toLowerCase();

const buildDuplicateKey = (appointment: AiExternalAppointment): string => {
  const start = appointment.startDatetime
    ? new Date(appointment.startDatetime).getTime()
    : 0;
  const leadRef =
    normalizePhone(appointment.leadPhone) ||
    normalizeText(appointment.leadEmail) ||
    normalizeText(appointment.leadName);

  return [
    appointment.scheduleId || "schedule",
    start,
    normalizeText(appointment.title),
    leadRef || "lead"
  ].join("|");
};

const findExistingAppointment = async (
  aiAppointment: AiExternalAppointment,
  companyId: number
): Promise<Appointment | null> => {
  if (!aiAppointment.startDatetime || !aiAppointment.scheduleId) return null;

  const where: any = {
    companyId,
    scheduleId: aiAppointment.scheduleId,
    startDatetime: new Date(aiAppointment.startDatetime)
  };

  const phone = normalizePhone(aiAppointment.leadPhone);
  if (phone) {
    where.leadPhone = { [Op.like]: `%${phone}%` };
  } else if (aiAppointment.leadName) {
    where.leadName = aiAppointment.leadName;
  } else {
    where.title = aiAppointment.title;
  }

  return Appointment.findOne({ where });
};

const ensureCrmAppointment = async ({
  aiAppointment,
  companyId,
  userId
}: {
  aiAppointment: AiExternalAppointment;
  companyId: number;
  userId?: number;
}): Promise<void> => {
  if (aiAppointment.appointmentId) {
    const linkedAppointment = await Appointment.findOne({
      where: { id: aiAppointment.appointmentId, companyId }
    });

    if (linkedAppointment) return;
  }

  const existingAppointment = await findExistingAppointment(aiAppointment, companyId);
  if (existingAppointment) {
    await aiAppointment.update({ appointmentId: existingAppointment.id });
    return;
  }

  const createdAppointment = await CreateAppointmentService({
    title: aiAppointment.title,
    description: aiAppointment.description,
    startDatetime: aiAppointment.startDatetime,
    durationMinutes: aiAppointment.durationMinutes || 60,
    status: aiAppointment.status || "scheduled",
    scheduleId: aiAppointment.scheduleId,
    serviceId: aiAppointment.serviceId || undefined,
    contactId: aiAppointment.contactId || undefined,
    companyId,
    clientEmail: aiAppointment.leadEmail || undefined,
    leadName: aiAppointment.leadName || undefined,
    leadPhone: aiAppointment.leadPhone || undefined,
    participantEmails: aiAppointment.leadEmail ? [aiAppointment.leadEmail] : undefined,
    operationalNote: "Sincronizado automaticamente pelo Agente IA",
    createdByUserId: aiAppointment.createdByUserId || userId
  });

  await aiAppointment.update({
    appointmentId: createdAppointment.id,
    metadata: {
      ...(aiAppointment.metadata || {}),
      syncedFromAiPanel: true,
      syncedAt: new Date().toISOString()
    }
  });
};

const ensureAutomaticReminder = async ({
  aiAppointment,
  companyId,
  userId
}: {
  aiAppointment: AiExternalAppointment;
  companyId: number;
  userId?: number;
}): Promise<void> => {
  if (!aiAppointment.startDatetime) return;

  const existingReminder = await AiExternalReminder.findOne({
    where: {
      companyId,
      aiAppointmentId: aiAppointment.id,
      status: { [Op.ne]: "cancelled" }
    }
  });

  if (existingReminder) return;

  const config = await GetOrCreateExternalAgentConfigService({ companyId, userId });
  const settings = getReminderSettings(config.metadata);
  if (!settings.enabled) return;

  const startDatetime = new Date(aiAppointment.startDatetime);
  const scheduledAt = new Date(
    startDatetime.getTime() - settings.hoursBefore * 60 * 60 * 1000
  );
  const safeScheduledAt =
    scheduledAt.getTime() > Date.now() ? scheduledAt : new Date();
  const interactivePayload = buildReminderPayload({
    settings,
    leadName: aiAppointment.leadName,
    leadPhone: aiAppointment.leadPhone,
    appointmentDate: startDatetime
  });

  await createReminder({
    companyId,
    userId,
    aiAppointmentId: aiAppointment.id,
    contactId: aiAppointment.contactId || undefined,
    ticketId: aiAppointment.ticketId || undefined,
    leadName: aiAppointment.leadName || undefined,
    leadPhone: aiAppointment.leadPhone || undefined,
    message: interactivePayload.text,
    scheduledAt: safeScheduledAt,
    n8nSessionId: aiAppointment.n8nSessionId || undefined,
    metadata: {
      automatic: true,
      appointmentId: aiAppointment.appointmentId,
      aiAppointmentId: aiAppointment.id,
      hoursBefore: settings.hoursBefore,
      interactivePayload
    }
  });
};

const removeDuplicateAiAppointment = async ({
  duplicate,
  keepAppointmentId,
  companyId
}: {
  duplicate: AiExternalAppointment;
  keepAppointmentId?: number | null;
  companyId: number;
}): Promise<void> => {
  const duplicateAppointmentId = duplicate.appointmentId;

  await duplicate.destroy();

  if (duplicateAppointmentId && duplicateAppointmentId !== keepAppointmentId) {
    await DeleteAppointmentService(duplicateAppointmentId, companyId).catch(error => {
      logger.warn(
        `[AI External Appointments] Nao foi possivel excluir compromisso duplicado ${duplicateAppointmentId}: ${error?.message || error}`
      );
    });
  }
};

const SyncAiExternalAppointmentsService = async ({
  companyId,
  userId
}: Request): Promise<void> => {
  const aiAppointments = await AiExternalAppointment.findAll({
    where: { companyId },
    order: [["id", "ASC"]]
  });

  const groups = new Map<string, AiExternalAppointment[]>();

  for (const aiAppointment of aiAppointments) {
    const key = buildDuplicateKey(aiAppointment);
    const current = groups.get(key) || [];
    current.push(aiAppointment);
    groups.set(key, current);
  }

  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => {
      if (a.appointmentId && !b.appointmentId) return -1;
      if (!a.appointmentId && b.appointmentId) return 1;
      return a.id - b.id;
    });

    const keeper = sorted[0];

    try {
      await ensureCrmAppointment({ aiAppointment: keeper, companyId, userId });
      await keeper.reload();
      await ensureAutomaticReminder({ aiAppointment: keeper, companyId, userId });
    } catch (error) {
      logger.warn(
        `[AI External Appointments] Falha ao sincronizar agendamento IA ${keeper.id}: ${error?.message || error}`
      );
      continue;
    }

    for (const duplicate of sorted.slice(1)) {
      await removeDuplicateAiAppointment({
        duplicate,
        keepAppointmentId: keeper.appointmentId,
        companyId
      });
    }
  }
};

export default SyncAiExternalAppointmentsService;
