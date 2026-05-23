import { Request, Response } from "express";
import SipChannelBinding from "../models/SipChannelBinding";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const bindings = await SipChannelBinding.findAll({
    where: { companyId }
  });

  return res.json(bindings);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const binding = await SipChannelBinding.create({
    ...req.body,
    companyId
  });

  return res.status(201).json(binding);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const binding = await SipChannelBinding.findOne({ where: { id, companyId } });

  if (!binding) {
    throw new AppError("Vínculo não encontrado.", 404);
  }

  await binding.update(req.body);

  return res.json(binding);
};

export const destroy = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const binding = await SipChannelBinding.findOne({ where: { id, companyId } });

  if (!binding) {
    throw new AppError("Vínculo não encontrado.", 404);
  }

  await binding.destroy();

  return res.status(204).send();
};