import { Request, Response } from "express";
import SipDid from "../models/SipDid";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const dids = await SipDid.findAll({
    where: { companyId },
    order: [["priority", "ASC"]]
  });

  return res.json(dids);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { number } = req.body;

  if (!number) {
    throw new AppError("Número é obrigatório.", 400);
  }

  const normalized = String(number).replace(/\D/g, "");

  const existing = await SipDid.findOne({
    where: { companyId, normalizedNumber: normalized }
  });

  if (existing) {
    throw new AppError("Este número já está cadastrado como DID.", 400);
  }

  if (req.body.isDefault) {
    await SipDid.update({ isDefault: false }, { where: { companyId } });
  }

  const did = await SipDid.create({
    ...req.body,
    companyId,
    normalizedNumber: normalized
  });

  return res.status(201).json(did);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const did = await SipDid.findOne({ where: { id, companyId } });

  if (!did) {
    throw new AppError("DID não encontrado.", 404);
  }

  if (req.body.number) {
    const normalized = String(req.body.number).replace(/\D/g, "");
    const existing = await SipDid.findOne({
      where: { companyId, normalizedNumber: normalized, id: { $ne: Number(id) } }
    });
    if (existing) {
      throw new AppError("Este número já está cadastrado como DID.", 400);
    }
    req.body.normalizedNumber = normalized;
  }

  if (req.body.isDefault) {
    await SipDid.update({ isDefault: false }, { where: { companyId } });
  }

  await did.update(req.body);

  return res.json(did);
};

export const destroy = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const did = await SipDid.findOne({ where: { id, companyId } });

  if (!did) {
    throw new AppError("DID não encontrado.", 404);
  }

  await did.destroy();

  return res.status(204).send();
};