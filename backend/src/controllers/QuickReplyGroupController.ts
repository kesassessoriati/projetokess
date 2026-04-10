import { Request, Response } from "express";
import QuickReplyGroup from "../models/QuickReplyGroup";
import QuickReply from "../models/QuickReply";

const getNextGroupSortOrder = async (companyId: number) => {
  const lastGroup = await QuickReplyGroup.findOne({
    where: { companyId },
    order: [
      ["sortOrder", "DESC"],
      ["id", "DESC"]
    ]
  });

  return lastGroup ? Number(lastGroup.sortOrder || 0) + 1 : 0;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const groups = await QuickReplyGroup.findAll({
    where: { companyId },
    order: [
      ["sortOrder", "ASC"],
      ["name", "ASC"]
    ]
  });
  return res.status(200).json(groups);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, description } = req.body;
  const sortOrder = await getNextGroupSortOrder(companyId);
  const group = await QuickReplyGroup.create({
    name,
    description,
    companyId,
    sortOrder
  });
  return res.status(200).json(group);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
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

export const sort = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { groups = [] } = req.body as {
    groups?: Array<{ id: number; sortOrder: number }>;
  };

  await Promise.all(
    groups.map(item =>
      QuickReplyGroup.update(
        { sortOrder: Number(item.sortOrder || 0) },
        { where: { id: item.id, companyId } }
      )
    )
  );

  const orderedGroups = await QuickReplyGroup.findAll({
    where: { companyId },
    order: [
      ["sortOrder", "ASC"],
      ["name", "ASC"]
    ]
  });

  return res.status(200).json(orderedGroups);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const group = await QuickReplyGroup.findOne({ where: { id, companyId } });
  if (!group) {
    return res.status(404).json({ error: "Group not found" });
  }

  await QuickReply.update(
    { groupId: null },
    { where: { groupId: Number(id), companyId } }
  );
  await group.destroy();
  return res.status(200).json({ message: "Group deleted" });
};
