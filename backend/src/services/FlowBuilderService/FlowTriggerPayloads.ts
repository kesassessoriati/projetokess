import Appointment from "../../models/Appointment";
import AiExternalReminder from "../../models/AiExternalReminder";
import CallRecord from "../../models/CallRecord";
import CrmClient from "../../models/CrmClient";
import { dispatchFlowTrigger, TriggerDispatchData } from "./FlowTriggerDispatchService";

const safeDispatch = (eventType: string, companyId?: number, data: TriggerDispatchData = {}) => {
  if (!companyId) return;
  dispatchFlowTrigger(eventType, companyId, data).catch(() => null);
};

export const dispatchAppointmentFlowTrigger = (
  eventType: string,
  appointment: Appointment,
  extraMetadata: Record<string, any> = {}
) => {
  safeDispatch(eventType, appointment.companyId, {
    contactNumber: appointment.leadPhone || undefined,
    contactName: appointment.leadName || appointment.title || undefined,
    contactEmail: Array.isArray(appointment.participantEmails) ? appointment.participantEmails[0] : undefined,
    metadata: {
      appointmentId: appointment.id,
      scheduleId: appointment.scheduleId,
      serviceId: appointment.serviceId,
      clientId: appointment.clientId,
      contactId: appointment.contactId,
      status: appointment.status,
      title: appointment.title,
      startDatetime: appointment.startDatetime,
      durationMinutes: appointment.durationMinutes,
      ...extraMetadata
    }
  });
};

export const dispatchReminderFlowTrigger = (
  eventType: string,
  reminder: AiExternalReminder,
  extraMetadata: Record<string, any> = {}
) => {
  safeDispatch(eventType, reminder.companyId, {
    ticketId: reminder.ticketId || undefined,
    contactNumber: reminder.leadPhone || undefined,
    contactName: reminder.leadName || undefined,
    metadata: {
      reminderId: reminder.id,
      aiAppointmentId: reminder.aiAppointmentId,
      contactId: reminder.contactId,
      status: reminder.status,
      scheduledAt: reminder.scheduledAt,
      sentAt: reminder.sentAt,
      ...extraMetadata
    }
  });
};

export const dispatchClientFlowTrigger = (
  eventType: string,
  client: CrmClient,
  extraMetadata: Record<string, any> = {}
) => {
  safeDispatch(eventType, client.companyId, {
    ticketId: client.primaryTicketId || undefined,
    contactNumber: client.phone || client.decisorPhone || undefined,
    contactName: client.name || client.companyName || undefined,
    contactEmail: client.email || undefined,
    metadata: {
      clientId: client.id,
      contactId: client.contactId,
      ownerUserId: client.ownerUserId,
      status: client.status,
      type: client.type,
      companyName: client.companyName,
      ...extraMetadata
    }
  });
};

export const dispatchCallFlowTrigger = (
  eventType: string,
  callRecord: CallRecord,
  extraMetadata: Record<string, any> = {}
) => {
  safeDispatch(eventType, callRecord.companyId, {
    ticketId: callRecord.ticketId || undefined,
    whatsappId: callRecord.whatsappId || undefined,
    contactNumber: callRecord.type === "incoming" ? callRecord.fromNumber : callRecord.toNumber,
    metadata: {
      callRecordId: callRecord.id,
      callId: callRecord.callId,
      type: callRecord.type,
      status: callRecord.status,
      fromNumber: callRecord.fromNumber,
      toNumber: callRecord.toNumber,
      duration: callRecord.duration,
      contactId: callRecord.contactId,
      leadId: callRecord.leadId,
      opportunityId: callRecord.opportunityId,
      pipelineId: callRecord.pipelineId,
      stageId: callRecord.stageId,
      ...extraMetadata
    }
  });
};

export const dispatchGroupFlowTrigger = (
  eventType: string,
  params: {
    companyId: number;
    whatsappId?: number;
    groupJid?: string;
    subject?: string;
    message?: string;
    metadata?: Record<string, any>;
  }
) => {
  safeDispatch(eventType, params.companyId, {
    whatsappId: params.whatsappId,
    contactNumber: params.groupJid,
    contactName: params.subject || params.groupJid,
    message: params.message,
    metadata: {
      groupJid: params.groupJid,
      subject: params.subject,
      ...(params.metadata || {})
    }
  });
};
