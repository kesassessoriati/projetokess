import { Request, Response } from "express";
import QuickReplyGroup from "../models/QuickReplyGroup";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const groups = await QuickReplyGroup.findAll({ where: { companyId } });
  return res.status(200).json(groups);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, description } = req.body;
  const group = await QuickReplyGroup.create({ name, description, companyId });
  return res.status(200).json(group);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { name, description } = req.body;
  const group = await QuickReplyGroup.findOne({ where: { id, companyId } });
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }
  await group.update({ name, description });
  return res.status(200).json(group);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const group = await QuickReplyGroup.findOne({ where: { id, companyId } });
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }
  await group.destroy();
  return res.status(200).json({ message: "Group deleted" });
};
