import { Request, Response } from "express";
import { Op } from "sequelize";
import path from "path";
import fs from "fs";
import QuickReply from "../models/QuickReply";
import QuickReplyGroup from "../models/QuickReplyGroup";

const QUICK_REPLY_MEDIA_DISABLED_MESSAGE =
  "Os tipos de midia das respostas rapidas estao temporariamente desativados nesta versao.";

const validateTextOnlyPayload = (body: Request["body"]): string | null => {
  const hasMediaTypeField = body?.mediaType !== undefined && body?.mediaType !== null;
  const mediaType = typeof body?.mediaType === "string" ? body.mediaType.trim().toLowerCase() : "";
  const hasExplicitMediaReference = Boolean(body?.mediaUrl || body?.mediaFileId);

  if ((hasMediaTypeField && mediaType !== "text") || hasExplicitMediaReference) {
    return QUICK_REPLY_MEDIA_DISABLED_MESSAGE;
  }

  return null;
};

const buildTextOnlyQuickReplyPayload = (body: Request["body"]) => ({
  shortcut: body?.shortcut,
  message: body?.message,
  groupId: body?.groupId || null
});

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
  const createdBy = req.user.id;
  const validationError = validateTextOnlyPayload(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const quickReply = await QuickReply.create({
    ...buildTextOnlyQuickReplyPayload(req.body),
    companyId,
    createdBy,
    mediaType: null
  });

  return res.status(200).json(quickReply);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const validationError = validateTextOnlyPayload(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const quickReply = await QuickReply.findOne({ where: { id, companyId } });
  if (!quickReply) {
    return res.status(404).json({ error: "Quick reply not found" });
  }

  // Preserve legacy media fields already stored on older records, but keep the
  // active create/edit flow text-only until media support is re-enabled.
  await quickReply.update(buildTextOnlyQuickReplyPayload(req.body));

  return res.status(200).json(quickReply);
};

export const mediaUpload = async (_req: Request, res: Response): Promise<Response> => {
  // Keep the endpoint shape in place so the future media implementation remains
  // easy to reactivate, but block it in the current text-only release.
  return res.status(409).json({ error: QUICK_REPLY_MEDIA_DISABLED_MESSAGE });
};

export const mediaFromLibrary = async (_req: Request, res: Response): Promise<Response> => {
  // Keep the endpoint shape in place so the future media implementation remains
  // easy to reactivate, but block it in the current text-only release.
  return res.status(409).json({ error: QUICK_REPLY_MEDIA_DISABLED_MESSAGE });
};

export const mediaShow = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const quickReply = await QuickReply.findOne({ where: { id, companyId } });
  if (!quickReply) {
    return res.status(404).json({ error: "Quick reply not found" });
  }

  const mediaFileName = quickReply.getDataValue("mediaUrl");
  if (!mediaFileName) {
    return res.status(404).json({ error: "Quick reply media not found" });
  }

  const mediaPath = path.resolve(
    __dirname,
    "..",
    "..",
    "public",
    `company${companyId}`,
    "quickReply",
    mediaFileName
  );

  if (!fs.existsSync(mediaPath)) {
    return res.status(404).json({ error: "Quick reply media not found" });
  }

  if (quickReply.mediaType) {
    res.type(quickReply.mediaType);
  }

  res.sendFile(mediaPath);
  return res;
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
