import AppError from "../../errors/AppError";
import AiExternalAppointment from "../../models/AiExternalAppointment";
import UpdateAppointmentService from "../AppointmentServices/UpdateAppointmentService";
import DispatchExternalAgentEventService from "../AiExternalAgentServices/DispatchExternalAgentEventService";
import GetOrCreateExternalAgentConfigService from "../AiExternalAgentServices/GetOrCreateExternalAgentConfigService";

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

  if (aiAppointment.appointmentId) {
    await UpdateAppointmentService({
      id: aiAppointment.appointmentId,
      companyId: data.companyId,
      title: data.title,
      description: data.description,
      startDatetime: data.startDatetime,
      durationMinutes: data.durationMinutes,
      status: data.status,
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

  const config = await GetOrCreateExternalAgentConfigService({
    companyId: data.companyId,
    userId: data.userId
  });

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
