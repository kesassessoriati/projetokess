import { Request, Response } from "express";
import CreateAppointmentService from "../services/AppointmentServices/CreateAppointmentService";
import ListAppointmentsService from "../services/AppointmentServices/ListAppointmentsService";
import ShowAppointmentService from "../services/AppointmentServices/ShowAppointmentService";
import UpdateAppointmentService from "../services/AppointmentServices/UpdateAppointmentService";
import DeleteAppointmentService from "../services/AppointmentServices/DeleteAppointmentService";
import SyncGoogleCalendarService from "../services/AppointmentServices/SyncGoogleCalendarService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId, profile } = req.user;
  const { scheduleId, status, startDate, endDate, pageNumber } = req.query as Record<string, string>;

  const result = await ListAppointmentsService({
    companyId: Number(companyId),
    userId: Number(userId),
    profile,
    scheduleId,
    status,
    startDate,
    endDate,
    pageNumber
  });

  return res.json(result);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const appointment = await ShowAppointmentService(id, Number(companyId));

  return res.json(appointment);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const {
    title,
    description,
    startDatetime,
    durationMinutes,
    status,
    scheduleId,
    serviceId,
    clientId,
    contactId,
    clientEmail,
    organizerEmail,
    leadName,
    leadPhone,
    participantEmails,
    meetingLink,
    operationalNote
  } = req.body;

  console.log("Creating appointment:", {
    title,
    startDatetime,
    durationMinutes,
    scheduleId,
    companyId
  });

  try {
    const appointment = await CreateAppointmentService({
      title,
      description,
      startDatetime,
      durationMinutes: Number(durationMinutes),
      status,
      scheduleId: Number(scheduleId),
      serviceId: serviceId ? Number(serviceId) : undefined,
      clientId: clientId ? Number(clientId) : undefined,
      contactId: contactId ? Number(contactId) : undefined,
      companyId: Number(companyId),
      clientEmail,
      organizerEmail,
      leadName: leadName || undefined,
      leadPhone: leadPhone || undefined,
      participantEmails: Array.isArray(participantEmails) ? participantEmails : undefined,
      meetingLink: meetingLink || undefined,
      operationalNote: operationalNote || undefined,
      createdByUserId: userId ? Number(userId) : undefined
    });

    return res.status(201).json(appointment);
  } catch (err: any) {
    console.error("Error creating appointment:", err);
    throw err;
  }
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const {
    title,
    description,
    startDatetime,
    durationMinutes,
    status,
    serviceId,
    clientId,
    contactId,
    leadName,
    leadPhone,
    participantEmails,
    meetingLink,
    operationalNote
  } = req.body;

  const appointment = await UpdateAppointmentService({
    id,
    title,
    description,
    startDatetime,
    durationMinutes,
    status,
    serviceId,
    clientId,
    contactId,
    companyId: Number(companyId),
    leadName: leadName !== undefined ? leadName : undefined,
    leadPhone: leadPhone !== undefined ? leadPhone : undefined,
    participantEmails: Array.isArray(participantEmails) ? participantEmails : undefined,
    meetingLink: meetingLink !== undefined ? meetingLink : undefined,
    operationalNote: operationalNote !== undefined ? operationalNote : undefined
  });

  return res.json(appointment);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  await DeleteAppointmentService(id, Number(companyId));

  return res.status(204).send();
};

export const syncGoogleCalendar = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId, profile } = req.user;

  // Admins sincronizam todas as agendas da empresa; usuários comuns apenas as próprias
  const targetUserId = profile === "admin" ? undefined : Number(userId);

  const result = await SyncGoogleCalendarService(Number(companyId), targetUserId);

  return res.json({
    message: "Sincronização concluída",
    ...result
  });
};
