import { Request, Response } from "express";
import {
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder
} from "../services/AiExternalReminderServices/AiExternalReminderServices";

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
