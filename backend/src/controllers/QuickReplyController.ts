import { Request, Response } from "express";
import { Op } from "sequelize";
import QuickReply from "../models/QuickReply";
import QuickReplyGroup from "../models/QuickReplyGroup";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam = "", pageNumber = "1" } = req.query as unknown as any;

  const whereCondition = {
    companyId,
    shortcut: {
      [Op.iLike]: `%${searchParam.toLowerCase()}%`
    }
  };

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: records } = await QuickReply.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["shortcut", "ASC"]],
    include: [{ model: QuickReplyGroup, as: "group", attributes: ["id", "name"] }]
  });

  const hasMore = count > offset + records.length;

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { shortcut, message, groupId, mediaType } = req.body;
  const createdBy = req.user.id;

  const quickReply = await QuickReply.create({
    shortcut,
    message,
    groupId,
    mediaType,
    companyId,
    createdBy
  });

  return res.status(200).json(quickReply);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { shortcut, message, groupId, mediaType } = req.body;

  const quickReply = await QuickReply.findOne({ where: { id, companyId } });
  if (!quickReply) {
    return res.status(404).json({ error: "Quick reply not found" });
  }

  await quickReply.update({
    shortcut,
    message,
    groupId,
    mediaType
  });

  return res.status(200).json(quickReply);
};

export const mediaUpload = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const quickReply = await QuickReply.findOne({ where: { id, companyId } });
  if (!quickReply) {
    return res.status(404).json({ error: "Quick reply not found" });
  }

  const media = req.file as Express.Multer.File;
  if (!media) {
    return res.status(400).json({ error: "No media uploaded" });
  }

  await quickReply.update({
    mediaUrl: media.filename,
    mediaType: media.mimetype
  });

  return res.status(200).json(quickReply);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const quickReply = await QuickReply.findOne({ where: { id, companyId } });
  if (!quickReply) {
    return res.status(404).json({ error: "Quick reply not found" });
  }

  await quickReply.destroy();
  return res.status(200).json({ message: "Quick reply deleted" });
};
