import { Request, Response } from "express";
import SipExtension from "../models/SipExtension";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const extensions = await SipExtension.findAll({
    where: { companyId },
    attributes: { exclude: ["secret"] }
  });

  return res.json(extensions);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { extension } = req.body;

  if (!extension) {
    throw new AppError("Ramal é obrigatório.", 400);
  }

  const existing = await SipExtension.findOne({
    where: { companyId, extension }
  });

  if (existing) {
    throw new AppError("Este ramal já está cadastrado.", 400);
  }

  const ext = await SipExtension.create({
    ...req.body,
    companyId
  });

  const result = ext.toJSON();
  delete (result as any).secret;

  return res.status(201).json(result);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const extension = await SipExtension.findOne({ where: { id, companyId } });

  if (!extension) {
    throw new AppError("Ramal não encontrado.", 404);
  }

  const payload = { ...req.body };
  if (!payload.secret) {
    delete payload.secret;
  }

  await extension.update(payload);

  const result = extension.toJSON();
  delete (result as any).secret;

  return res.json(result);
};

export const destroy = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const extension = await SipExtension.findOne({ where: { id, companyId } });

  if (!extension) {
    throw new AppError("Ramal não encontrado.", 404);
  }

  await extension.destroy();

  return res.status(204).send();
};