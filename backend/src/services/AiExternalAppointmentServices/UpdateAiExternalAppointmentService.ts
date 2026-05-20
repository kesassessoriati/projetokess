import AppError from "../../errors/AppError";
import { Op } from "sequelize";
import AiExternalAppointment from "../../models/AiExternalAppointment";
import AiExternalReminder from "../../models/AiExternalReminder";
import UpdateAppointmentService from "../AppointmentServices/UpdateAppointmentService";
import DispatchExternalAgentEventService from "../AiExternalAgentServices/DispatchExternalAgentEventService";
import GetOrCreateExternalAgentConfigService from "../AiExternalAgentServices/GetOrCreateExternalAgentConfigService";
import { notifyAiExternalGroup } from "../AiExternalAgentServices/AiExternalNotificationService";
import {
  syncAiAppointmentCancellationJourney,
  syncAiAppointmentRescheduleJourney
} from "../AiExternalAgentServices/AiExternalJourneyService";
import {
  buildReminderPayload,
  createReminder,
  getReminderSettings
} from "../AiExternalReminderServices/AiExternalReminderServices";

interface Request {
  id: number;
  companyId: number;
  userId?: number;
  title?: string;
  description?: string;
  startDatetime?: Date | string;
  durationMinutes?: number;
  status?: string;
  serviceId?: number | null;
  crmLeadId?: number | null;
  contactId?: number | null;
  ticketId?: number | null;
  pipelineId?: number | null;
  stageId?: number | null;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  leadDocument?: string;
  reminderEnabled?: boolean;
  cancellationReason?: string | null;
  metadata?: Record<string, any>;
}

const UpdateAiExternalAppointmentService = async (data: Request): Promise<AiExternalAppointment> => {
  const aiAppointment = await AiExternalAppointment.findOne({
    where: { id: data.id, companyId: data.companyId }
  });

  if (!aiAppointment) {
    throw new AppError("Agendamento IA nao encontrado.", 404);
  }

  const previousStatus = aiAppointment.status;
  const previousStartDatetime = aiAppointment.startDatetime
    ? new Date(aiAppointment.startDatetime)
    : null;

  if (aiAppointment.appointmentId) {
    const appointmentStatus = ["scheduled", "confirmed", "completed", "cancelled", "no_show"].includes(String(data.status || ""))
      ? data.status
      : undefined;

    await UpdateAppointmentService({
      id: aiAppointment.appointmentId,
      companyId: data.companyId,
      title: data.title,
      description: data.description,
      startDatetime: data.startDatetime,
      durationMinutes: data.durationMinutes,
      status: appointmentStatus,
      serviceId: data.serviceId,
      contactId: data.contactId,
      leadName: data.leadName,
      leadPhone: data.leadPhone,
      participantEmails: data.leadEmail ? [data.leadEmail] : undefined,
      operationalNote: "Atualizado pelo Agente Externo N8N",
      createdByUserId: data.userId
    });
  }

  await aiAppointment.update({
    title: data.title ?? aiAppointment.title,
    description: data.description !== undefined ? data.description : aiAppointment.description,
    startDatetime: data.startDatetime ? new Date(data.startDatetime) : aiAppointment.startDatetime,
    durationMinutes: data.durationMinutes ?? aiAppointment.durationMinutes,
    status: data.status ?? aiAppointment.status,
    serviceId: data.serviceId !== undefined ? data.serviceId : aiAppointment.serviceId,
    crmLeadId: data.crmLeadId !== undefined ? data.crmLeadId : aiAppointment.crmLeadId,
    contactId: data.contactId !== undefined ? data.contactId : aiAppointment.contactId,
    ticketId: data.ticketId !== undefined ? data.ticketId : aiAppointment.ticketId,
    pipelineId: data.pipelineId !== undefined ? data.pipelineId : aiAppointment.pipelineId,
    stageId: data.stageId !== undefined ? data.stageId : aiAppointment.stageId,
    leadName: data.leadName !== undefined ? data.leadName : aiAppointment.leadName,
    leadPhone: data.leadPhone !== undefined ? data.leadPhone : aiAppointment.leadPhone,
    leadEmail: data.leadEmail !== undefined ? data.leadEmail : aiAppointment.leadEmail,
    leadDocument: data.leadDocument !== undefined ? data.leadDocument : aiAppointment.leadDocument,
    reminderEnabled: data.reminderEnabled !== undefined ? data.reminderEnabled : aiAppointment.reminderEnabled,
    cancellationReason: data.cancellationReason !== undefined ? data.cancellationReason : aiAppointment.cancellationReason,
    metadata: data.metadata !== undefined ? data.metadata : aiAppointment.metadata
  });

  const startDatetimeChanged =
    data.startDatetime &&
    previousStartDatetime &&
    previousStartDatetime.getTime() !== new Date(data.startDatetime).getTime();

  if (!aiAppointment.appointmentId && previousStatus !== "cancelled" && aiAppointment.status === "cancelled") {
    notifyAiExternalGroup({
      companyId: data.companyId,
      eventType: "appointmentCancelled",
      aiAppointment,
      cancellationReason: data.cancellationReason || null
    }).catch(() => undefined);
  }

  const config = await GetOrCreateExternalAgentConfigService({
    companyId: data.companyId,
    userId: data.userId
  });

  if (previousStatus !== "cancelled" && aiAppointment.status === "cancelled") {
    await syncAiAppointmentCancellationJourney(
      aiAppointment,
      data.cancellationReason || null
    ).catch(() => undefined);
  } else if (startDatetimeChanged) {
    const reminderSettings = getReminderSettings(config.metadata);
    if (reminderSettings.enabled && aiAppointment.reminderEnabled !== false) {
      const newStartDatetime = new Date(aiAppointment.startDatetime);
      const scheduledAt = new Date(
        newStartDatetime.getTime() - reminderSettings.hoursBefore * 60 * 60 * 1000
      );
      const safeScheduledAt = scheduledAt.getTime() > Date.now() ? scheduledAt : new Date();
      const interactivePayload = buildReminderPayload({
        settings: reminderSettings,
        leadName: aiAppointment.leadName,
        leadPhone: aiAppointment.leadPhone,
        appointmentDate: newStartDatetime
      });

      const existingReminder = await AiExternalReminder.findOne({
        where: {
          companyId: data.companyId,
          aiAppointmentId: aiAppointment.id,
          status: { [Op.in]: ["pending", "processing", "sent", "reschedule_requested"] }
        },
        order: [["updatedAt", "DESC"]]
      });

      if (existingReminder) {
        await existingReminder.update({
          status: "pending",
          sentAt: null,
          scheduledAt: safeScheduledAt,
          message: interactivePayload.text,
          metadata: {
            ...(existingReminder.metadata || {}),
            rescheduledAt: new Date().toISOString(),
            interactivePayload
          }
        });
      } else {
        await createReminder({
          companyId: data.companyId,
          userId: data.userId,
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
            hoursBefore: reminderSettings.hoursBefore,
            interactivePayload
          }
        });
      }
    }

    await syncAiAppointmentRescheduleJourney(aiAppointment).catch(() => undefined);
  }

  await DispatchExternalAgentEventService({
    eventType: "external_agent.appointment.updated",
    companyId: data.companyId,
    config,
    userId: data.userId,
    data: {
      aiAppointmentId: aiAppointment.id,
      appointmentId: aiAppointment.appointmentId,
      status: aiAppointment.status
    }
  });

  return aiAppointment.reload();
};

export default UpdateAiExternalAppointmentService;
