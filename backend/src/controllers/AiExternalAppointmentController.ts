import { Request, Response } from "express";
import ListAiExternalAppointmentsService from "../services/AiExternalAppointmentServices/ListAiExternalAppointmentsService";
import CreateAiExternalAppointmentService from "../services/AiExternalAppointmentServices/CreateAiExternalAppointmentService";
import UpdateAiExternalAppointmentService from "../services/AiExternalAppointmentServices/UpdateAiExternalAppointmentService";
import DeleteAiExternalAppointmentService from "../services/AiExternalAppointmentServices/DeleteAiExternalAppointmentService";
import SyncAiExternalAppointmentsService from "../services/AiExternalAppointmentServices/SyncAiExternalAppointmentsService";

const getScope = (req: Request) => ({
  companyId: Number(req.user.companyId),
  userId: Number(req.user.id)
});

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, userId } = getScope(req);
  const { pageNumber, status, leadPhone, startDate, endDate } = req.query as Record<string, string>;

  await SyncAiExternalAppointmentsService({ companyId, userId });

  const result = await ListAiExternalAppointmentsService({
    companyId,
    pageNumber,
    status,
    leadPhone,
    startDate,
    endDate
  });

  return res.json(result);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, userId } = getScope(req);

  const appointment = await CreateAiExternalAppointmentService({
    companyId,
    userId,
    ...req.body
  });

  return res.status(201).json(appointment);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, userId } = getScope(req);
  const { id } = req.params;

  const appointment = await UpdateAiExternalAppointmentService({
    id: Number(id),
    companyId,
    userId,
    ...req.body
  });

  return res.json(appointment);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, userId } = getScope(req);
  const { id } = req.params;

  await DeleteAiExternalAppointmentService({
    id: Number(id),
    companyId,
    userId
  });

  return res.status(200).json({ message: "Agendamento IA excluido com sucesso." });
};
