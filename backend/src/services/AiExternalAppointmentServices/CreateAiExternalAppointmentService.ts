import * as Yup from "yup";
import AppError from "../../errors/AppError";
import AiExternalAppointment from "../../models/AiExternalAppointment";
import CreateAppointmentService from "../AppointmentServices/CreateAppointmentService";
import GetOrCreateExternalAgentConfigService from "../AiExternalAgentServices/GetOrCreateExternalAgentConfigService";
import DispatchExternalAgentEventService from "../AiExternalAgentServices/DispatchExternalAgentEventService";
import {
  buildReminderPayload,
  createReminder,
  getReminderSettings
} from "../AiExternalReminderServices/AiExternalReminderServices";
import UpdateCrmLeadService from "../CrmLeadService/UpdateCrmLeadService";

interface Request {
  companyId: number;
  userId?: number;
  title: string;
  description?: string;
  startDatetime: Date | string;
  durationMinutes?: number;
  status?: string;
  scheduleId: number;
  serviceId?: number;
  crmLeadId?: number;
  contactId?: number;
  ticketId?: number;
  pipelineId?: number;
  stageId?: number;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  leadDocument?: string;
  reminderEnabled?: boolean;
  n8nSessionId?: string;
  source?: string;
  metadata?: Record<string, any>;
}

const schema = Yup.object().shape({
  title: Yup.string().required().max(200),
  startDatetime: Yup.date().required(),
  durationMinutes: Yup.number().min(1).default(60),
  status: Yup.string().oneOf(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).default("scheduled"),
  scheduleId: Yup.number().required()
});

const CreateAiExternalAppointmentService = async (data: Request): Promise<AiExternalAppointment> => {
  try {
    await schema.validate(data, { abortEarly: false });
  } catch (error) {
    throw new AppError(`${JSON.stringify(error, undefined, 2)}`, 400);
  }

  const config = await GetOrCreateExternalAgentConfigService({
    companyId: data.companyId,
    userId: data.userId
  });

  const appointment = await CreateAppointmentService({
    title: data.title,
    description: data.description,
    startDatetime: data.startDatetime,
    durationMinutes: data.durationMinutes || 60,
    status: data.status || "scheduled",
    scheduleId: data.scheduleId,
    serviceId: data.serviceId,
    contactId: data.contactId,
    companyId: data.companyId,
    clientEmail: data.leadEmail,
    leadName: data.leadName,
    leadPhone: data.leadPhone,
    participantEmails: data.leadEmail ? [data.leadEmail] : undefined,
    operationalNote: "Criado pelo Agente Externo N8N",
    createdByUserId: data.userId
  });

  const aiPausedUntil = new Date(Date.now() + 30 * 60 * 1000);

  const aiAppointment = await AiExternalAppointment.create({
    companyId: data.companyId,
    configId: config.id,
    appointmentId: appointment.id,
    crmLeadId: data.crmLeadId || null,
    contactId: data.contactId || null,
    ticketId: data.ticketId || null,
    pipelineId: data.pipelineId || null,
    stageId: data.stageId || null,
    scheduleId: data.scheduleId,
    serviceId: data.serviceId || null,
    title: data.title,
    description: data.description || null,
    leadName: data.leadName || null,
    leadPhone: data.leadPhone || null,
    leadEmail: data.leadEmail || null,
    leadDocument: data.leadDocument || null,
    startDatetime: new Date(data.startDatetime),
    durationMinutes: data.durationMinutes || 60,
    status: data.status || "scheduled",
    reminderEnabled: Boolean(data.reminderEnabled),
    aiPausedUntil,
    n8nSessionId: data.n8nSessionId || null,
    source: data.source || "crm",
    metadata: data.metadata || {},
    createdByUserId: data.userId || null
  } as any);

  if (data.crmLeadId) {
    await UpdateCrmLeadService({
      id: data.crmLeadId,
      companyId: data.companyId,
      status: "reuniao_agendada",
      leadStatus: "reuniao_agendada"
    }).catch(() => undefined);
  }

  const reminderSettings = getReminderSettings(config.metadata);
  if (reminderSettings.enabled) {
    const startDatetime = new Date(data.startDatetime);
    const scheduledAt = new Date(startDatetime.getTime() - reminderSettings.hoursBefore * 60 * 60 * 1000);
    const safeScheduledAt = scheduledAt.getTime() > Date.now() ? scheduledAt : new Date();
    const interactivePayload = buildReminderPayload({
      settings: reminderSettings,
      leadName: data.leadName,
      leadPhone: data.leadPhone,
      appointmentDate: startDatetime
    });

    await createReminder({
      companyId: data.companyId,
      userId: data.userId,
      aiAppointmentId: aiAppointment.id,
      contactId: data.contactId,
      ticketId: data.ticketId,
      leadName: data.leadName,
      leadPhone: data.leadPhone,
      message: interactivePayload.text,
      scheduledAt: safeScheduledAt,
      n8nSessionId: data.n8nSessionId,
      metadata: {
        automatic: true,
        appointmentId: appointment.id,
        aiAppointmentId: aiAppointment.id,
        hoursBefore: reminderSettings.hoursBefore,
        interactivePayload
      }
    });
  }

  await DispatchExternalAgentEventService({
    eventType: "external_agent.appointment.created",
    companyId: data.companyId,
    config,
    userId: data.userId,
    data: {
      aiAppointmentId: aiAppointment.id,
      appointmentId: appointment.id,
      status: aiAppointment.status,
      aiPausedUntil
    }
  });

  return aiAppointment.reload();
};

export default CreateAiExternalAppointmentService;
