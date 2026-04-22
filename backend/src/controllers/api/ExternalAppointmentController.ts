import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import CreateAppointmentService from "../../services/AppointmentServices/CreateAppointmentService";
import ListAppointmentsService from "../../services/AppointmentServices/ListAppointmentsService";
import ShowAppointmentService from "../../services/AppointmentServices/ShowAppointmentService";
import UpdateAppointmentService from "../../services/AppointmentServices/UpdateAppointmentService";
import DeleteAppointmentService from "../../services/AppointmentServices/DeleteAppointmentService";

const ensureExternalAuth = (req: Request) => {
  if (!req.externalAuth) {
    throw new AppError("ERR_EXTERNAL_AUTH_REQUIRED", 401);
  }
  return req.externalAuth;
};

// GET /api/external/appointments
export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const { scheduleId, status, startDate, endDate, pageNumber, leadPhone } = req.query as Record<string, string>;

  const result = await ListAppointmentsService({
    companyId,
    userId: 0,
    profile: "admin",
    scheduleId,
    status,
    startDate,
    endDate,
    pageNumber,
    leadPhone
  });

  return res.json(result);
};

// GET /api/external/appointments/:id
export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const { id } = req.params;

  const appointment = await ShowAppointmentService(id, companyId);

  return res.json(appointment);
};

// POST /api/external/appointments
export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
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
    leadName,
    leadPhone,
    participantEmails,
    meetingLink,
    operationalNote,
    createdByUserId
  } = req.body;

  if (!title) {
    throw new AppError("ERR_APPOINTMENT_TITLE_REQUIRED", 400);
  }
  if (!startDatetime) {
    throw new AppError("ERR_APPOINTMENT_DATETIME_REQUIRED", 400);
  }
  if (!scheduleId) {
    throw new AppError("ERR_APPOINTMENT_SCHEDULEID_REQUIRED", 400);
  }

  const appointment = await CreateAppointmentService({
    title,
    description,
    startDatetime,
    durationMinutes: Number(durationMinutes) || 60,
    status: status || "scheduled",
    scheduleId: Number(scheduleId),
    serviceId: serviceId ? Number(serviceId) : undefined,
    clientId: clientId ? Number(clientId) : undefined,
    contactId: contactId ? Number(contactId) : undefined,
    companyId,
    clientEmail,
    leadName: leadName || undefined,
    leadPhone: leadPhone || undefined,
    participantEmails: Array.isArray(participantEmails) ? participantEmails : undefined,
    meetingLink: meetingLink || undefined,
    operationalNote: operationalNote || undefined,
    createdByUserId: createdByUserId ? Number(createdByUserId) : undefined
  });

  return res.status(201).json(appointment);
};

// PUT /api/external/appointments/:id
export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
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
    operationalNote,
    createdByUserId
  } = req.body;

  const appointment = await UpdateAppointmentService({
    id: Number(id),
    title,
    description,
    startDatetime,
    durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
    status,
    serviceId: serviceId ? Number(serviceId) : undefined,
    clientId: clientId ? Number(clientId) : undefined,
    contactId: contactId ? Number(contactId) : undefined,
    companyId,
    leadName: leadName || undefined,
    leadPhone: leadPhone || undefined,
    participantEmails: Array.isArray(participantEmails) ? participantEmails : undefined,
    meetingLink: meetingLink || undefined,
    operationalNote: operationalNote || undefined,
    createdByUserId: createdByUserId ? Number(createdByUserId) : undefined
  });

  return res.json(appointment);
};

// DELETE /api/external/appointments/:id
export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const { id } = req.params;

  await DeleteAppointmentService(Number(id), companyId);

  return res.status(200).json({ message: "Appointment deleted successfully" });
};
