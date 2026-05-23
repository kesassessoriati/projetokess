import { Request, Response } from "express";
import SipDidRoute from "../models/SipDidRoute";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const routes = await SipDidRoute.findAll({
    where: { companyId },
    order: [["priority", "ASC"]]
  });

  return res.json(routes);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  if (!req.body.routeType) {
    throw new AppError("Tipo de rota é obrigatório.", 400);
  }

  const route = await SipDidRoute.create({
    ...req.body,
    companyId
  });

  return res.status(201).json(route);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const route = await SipDidRoute.findOne({ where: { id, companyId } });

  if (!route) {
    throw new AppError("Rota não encontrada.", 404);
  }

  await route.update(req.body);

  return res.json(route);
};

export const destroy = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const route = await SipDidRoute.findOne({ where: { id, companyId } });

  if (!route) {
    throw new AppError("Rota não encontrada.", 404);
  }

  await route.destroy();

  return res.status(204).send();
};