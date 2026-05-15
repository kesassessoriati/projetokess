import { Request, Response } from "express";
import {
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder
} from "../services/AiExternalReminderServices/AiExternalReminderServices";
import AppError from "../errors/AppError";
import AiExternalReminder from "../models/AiExternalReminder";
import AiExternalAppointment from "../models/AiExternalAppointment";
import {
  notifyAiExternalGroup,
  sendAiExternalReminderNow
} from "../services/AiExternalAgentServices/AiExternalNotificationService";

const scope = (req: Request) => ({
  companyId: Number(req.user.companyId),
  userId: Number(req.user.id)
});

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const { pageNumber, status } = req.query as Record<string, string>;
  return res.json(await listReminders({ companyId, pageNumber, status }));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, userId } = scope(req);
  return res.status(201).json(await createReminder({ companyId, userId, ...req.body }));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, userId } = scope(req);
  return res.json(await updateReminder({ id: Number(req.params.id), companyId, userId, ...req.body }));
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  await deleteReminder({ id: Number(req.params.id), companyId });
  return res.status(200).json({ message: "Lembrete excluido com sucesso." });
};

export const sendNow = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const reminder = await AiExternalReminder.findOne({
    where: { id: Number(req.params.id), companyId },
    include: [{ model: AiExternalAppointment, as: "aiAppointment", required: false }]
  });

  if (!reminder) throw new AppError("Lembrete nao encontrado.", 404);

  const sentReminder = await sendAiExternalReminderNow(reminder);

  return res.json({ message: "Lembrete enviado com sucesso.", reminder: sentReminder });
};

export const sendGroup = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const reminder = await AiExternalReminder.findOne({
    where: { id: Number(req.params.id), companyId },
    include: [{ model: AiExternalAppointment, as: "aiAppointment", required: false }]
  });

  if (!reminder) throw new AppError("Lembrete nao encontrado.", 404);

  const sent = await notifyAiExternalGroup({
    companyId,
    eventType: "reminderSent",
    aiAppointment: (reminder as any).aiAppointment || null,
    reminder
  });

  if (!sent) {
    throw new AppError("Notificacao de grupo nao enviada. Verifique a configuracao do grupo.", 400);
  }

  return res.json({ message: "Notificacao enviada ao grupo com sucesso." });
};
