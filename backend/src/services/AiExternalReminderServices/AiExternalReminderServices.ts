import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import AiExternalReminder from "../../models/AiExternalReminder";
import AiExternalAppointment from "../../models/AiExternalAppointment";
import GetOrCreateExternalAgentConfigService from "../AiExternalAgentServices/GetOrCreateExternalAgentConfigService";
import DispatchExternalAgentEventService from "../AiExternalAgentServices/DispatchExternalAgentEventService";

export const listReminders = async ({
  companyId,
  pageNumber = 1,
  status
}: {
  companyId: number;
  pageNumber?: string | number;
  status?: string;
}) => {
  const limit = 50;
  const offset = limit * (Number(pageNumber) - 1);
  const where: Record<string, any> = { companyId };
  if (status) where.status = status;

  const { rows, count } = await AiExternalReminder.findAndCountAll({
    where,
    include: [{ model: AiExternalAppointment, as: "aiAppointment", required: false }],
    limit,
    offset,
    order: [["scheduledAt", "ASC"]]
  });

  return { reminders: rows, count, hasMore: count > offset + rows.length };
};

export const createReminder = async (data: {
  companyId: number;
  userId?: number;
  aiAppointmentId?: number;
  contactId?: number;
  ticketId?: number;
  leadName?: string;
  leadPhone?: string;
  message?: string;
  scheduledAt: Date | string;
  n8nSessionId?: string;
  metadata?: Record<string, any>;
}) => {
  if (!data.scheduledAt) throw new AppError("Data do lembrete obrigatoria.", 400);

  const aiPausedUntil = new Date(Date.now() + 30 * 60 * 1000);
  const reminder = await AiExternalReminder.create({
    companyId: data.companyId,
    aiAppointmentId: data.aiAppointmentId || null,
    contactId: data.contactId || null,
    ticketId: data.ticketId || null,
    leadName: data.leadName || null,
    leadPhone: data.leadPhone || null,
    message: data.message || null,
    scheduledAt: new Date(data.scheduledAt),
    status: "pending",
    aiPausedUntil,
    n8nSessionId: data.n8nSessionId || null,
    metadata: data.metadata || {},
    createdByUserId: data.userId || null
  } as any);

  const config = await GetOrCreateExternalAgentConfigService({
    companyId: data.companyId,
    userId: data.userId
  });
  await DispatchExternalAgentEventService({
    eventType: "external_agent.reminder.created",
    companyId: data.companyId,
    config,
    userId: data.userId,
    data: { reminderId: reminder.id, aiPausedUntil }
  });

  return reminder.reload();
};

export const updateReminder = async (data: {
  id: number;
  companyId: number;
  userId?: number;
  status?: string;
  sentAt?: Date | string | null;
  message?: string;
  scheduledAt?: Date | string;
  metadata?: Record<string, any>;
}) => {
  const reminder = await AiExternalReminder.findOne({ where: { id: data.id, companyId: data.companyId } });
  if (!reminder) throw new AppError("Lembrete nao encontrado.", 404);

  await reminder.update({
    status: data.status ?? reminder.status,
    sentAt: data.sentAt ? new Date(data.sentAt) : reminder.sentAt,
    message: data.message !== undefined ? data.message : reminder.message,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : reminder.scheduledAt,
    metadata: data.metadata !== undefined ? data.metadata : reminder.metadata
  });

  const config = await GetOrCreateExternalAgentConfigService({ companyId: data.companyId, userId: data.userId });
  await DispatchExternalAgentEventService({
    eventType: "external_agent.reminder.updated",
    companyId: data.companyId,
    config,
    userId: data.userId,
    data: { reminderId: reminder.id, status: reminder.status }
  });

  return reminder.reload();
};

export const deleteReminder = async ({ id, companyId }: { id: number; companyId: number }) => {
  const deleted = await AiExternalReminder.destroy({ where: { id, companyId } });
  if (!deleted) throw new AppError("Lembrete nao encontrado.", 404);
};
