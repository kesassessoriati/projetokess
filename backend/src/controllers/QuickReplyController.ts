import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { Request, Response } from "express";
import QuickReply from "../models/QuickReply";
import QuickReplyGroup from "../models/QuickReplyGroup";
import MediaFile from "../models/MediaFile";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

const normalizeStoredPath = (value?: string | null) =>
  String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

const getQuickReplyAbsolutePath = (
  companyId: number,
  storedPath?: string | null
) => {
  const normalizedPath = normalizeStoredPath(storedPath);

  if (!normalizedPath) {
    return "";
  }

  if (
    normalizedPath.startsWith("media-drive/") ||
    normalizedPath.startsWith("quickReply/")
  ) {
    return path.resolve(publicFolder, `company${companyId}`, normalizedPath);
  }

  return path.resolve(
    publicFolder,
    `company${companyId}`,
    "quickReply",
    normalizedPath
  );
};

const deleteUploadedMediaIfNeeded = async (
  quickReply: QuickReply,
  companyId: number
) => {
  const storedPath = quickReply.getDataValue("mediaUrl");
  const normalizedPath = normalizeStoredPath(storedPath);

  if (
    !normalizedPath ||
    quickReply.mediaSource === "library" ||
    normalizedPath.startsWith("media-drive/")
  ) {
    return;
  }

  const absolutePath = getQuickReplyAbsolutePath(companyId, storedPath);

  if (absolutePath && fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

const buildQuickReplyPayload = (body: Request["body"]) => ({
  shortcut: String(body?.shortcut || "").trim(),
  message: String(body?.message || ""),
  groupId: body?.groupId ? Number(body.groupId) : null
});

const getNextReplySortOrder = async (
  companyId: number,
  groupId: number | null
) => {
  const lastReply = await QuickReply.findOne({
    where: {
      companyId,
      groupId
    },
    order: [
      ["sortOrder", "DESC"],
      ["id", "DESC"]
    ]
  });

  return lastReply ? Number(lastReply.sortOrder || 0) + 1 : 0;
};

const loadReplyWithGroup = async (id: number) =>
  QuickReply.findByPk(id, {
    include: [
      {
        model: QuickReplyGroup,
        as: "group",
        attributes: ["id", "name", "sortOrder"]
      }
    ]
  });

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    searchParam = "",
    pageNumber = "1",
    pageSize = "200"
  } = req.query as unknown as {
    searchParam?: string;
    pageNumber?: string;
    pageSize?: string;
  };

  const normalizedSearch = String(searchParam || "")
    .trim()
    .toLowerCase();
  const whereCondition: {
    companyId: number;
    [key: string]: unknown;
    [key: symbol]: unknown;
  } = { companyId };

  if (normalizedSearch) {
    whereCondition[Op.or] = [
      { shortcut: { [Op.iLike]: `%${normalizedSearch}%` } },
      { message: { [Op.iLike]: `%${normalizedSearch}%` } }
    ];
  }

  const limit = Math.max(Number(pageSize) || 200, 1);
  const offset = limit * (Math.max(Number(pageNumber) || 1, 1) - 1);

  const { count, rows: records } = await QuickReply.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [
      ["sortOrder", "ASC"],
      ["shortcut", "ASC"]
    ],
    include: [
      {
        model: QuickReplyGroup,
        as: "group",
        attributes: ["id", "name", "sortOrder"]
      }
    ]
  });

  return res.json({
    records,
    count,
    hasMore: count > offset + records.length
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const createdBy = req.user.id;
  const payload = buildQuickReplyPayload(req.body);

  const quickReply = await QuickReply.create({
    ...payload,
    companyId,
    createdBy,
    mediaType: null,
    mediaName: null,
    mediaSource: null,
    mediaFileId: null,
    sortOrder: await getNextReplySortOrder(companyId, payload.groupId)
  });

  const record = await loadReplyWithGroup(quickReply.id);
  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const quickReply = await QuickReply.findOne({ where: { id, companyId } });

  if (!quickReply) {
    return res.status(404).json({ error: "Quick reply not found" });
  }

  const payload = buildQuickReplyPayload(req.body);
  const currentGroupId = quickReply.groupId ? Number(quickReply.groupId) : null;
  const nextGroupId = payload.groupId ? Number(payload.groupId) : null;

  await quickReply.update({
    ...payload,
    sortOrder:
      currentGroupId !== nextGroupId
        ? await getNextReplySortOrder(companyId, nextGroupId)
        : quickReply.sortOrder
  });

  const record = await loadReplyWithGroup(quickReply.id);
  return res.status(200).json(record);
};

export const sort = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { replies = [] } = req.body as {
    replies?: Array<{ id: number; groupId?: number | null; sortOrder: number }>;
  };

  await Promise.all(
    replies.map(item =>
      QuickReply.update(
        {
          groupId: item.groupId ? Number(item.groupId) : null,
          sortOrder: Number(item.sortOrder || 0)
        },
        {
          where: {
            id: Number(item.id),
            companyId
          }
        }
      )
    )
  );

  const { rows: records } = await QuickReply.findAndCountAll({
    where: { companyId },
    order: [
      ["sortOrder", "ASC"],
      ["shortcut", "ASC"]
    ],
    include: [
      {
        model: QuickReplyGroup,
        as: "group",
        attributes: ["id", "name", "sortOrder"]
      }
    ]
  });

  return res.status(200).json(records);
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const file = req.file as Express.Multer.File;

  if (!file) {
    return res.status(400).json({ error: "Media file not provided" });
  }

  const quickReply = await QuickReply.findOne({ where: { id, companyId } });
  if (!quickReply) {
    return res.status(404).json({ error: "Quick reply not found" });
  }

  await deleteUploadedMediaIfNeeded(quickReply, companyId);

  await quickReply.update({
    mediaUrl: `quickReply/${file.filename}`,
    mediaType: file.mimetype,
    mediaName: file.originalname,
    mediaSource: "upload",
    mediaFileId: null
  });

  const record = await loadReplyWithGroup(quickReply.id);
  return res.status(200).json(record);
};

export const mediaFromLibrary = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { mediaFileId } = req.body as { mediaFileId?: number };

  if (!mediaFileId) {
    return res.status(400).json({ error: "Media file id is required" });
  }

  const quickReply = await QuickReply.findOne({ where: { id, companyId } });
  if (!quickReply) {
    return res.status(404).json({ error: "Quick reply not found" });
  }

  const mediaFile = await MediaFile.findOne({
    where: {
      id: Number(mediaFileId),
      companyId
    }
  });

  if (!mediaFile) {
    return res.status(404).json({ error: "Library media not found" });
  }

  await deleteUploadedMediaIfNeeded(quickReply, companyId);

  await quickReply.update({
    mediaUrl: mediaFile.storagePath,
    mediaType: mediaFile.mimeType,
    mediaName: mediaFile.customName || mediaFile.originalName,
    mediaSource: "library",
    mediaFileId: mediaFile.id
  });

  const record = await loadReplyWithGroup(quickReply.id);
  return res.status(200).json(record);
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const quickReply = await QuickReply.findOne({ where: { id, companyId } });

  if (!quickReply) {
    return res.status(404).json({ error: "Quick reply not found" });
  }

  await deleteUploadedMediaIfNeeded(quickReply, companyId);

  await quickReply.update({
    mediaUrl: null,
    mediaType: null,
    mediaName: null,
    mediaSource: null,
    mediaFileId: null
  });

  const record = await loadReplyWithGroup(quickReply.id);
  return res.status(200).json(record);
};

export const mediaShow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const quickReply = await QuickReply.findOne({ where: { id, companyId } });
  if (!quickReply) {
    return res.status(404).json({ error: "Quick reply not found" });
  }

  const storedPath = quickReply.getDataValue("mediaUrl");
  if (!storedPath) {
    return res.status(404).json({ error: "Quick reply media not found" });
  }

  const mediaPath = getQuickReplyAbsolutePath(companyId, storedPath);
  if (!mediaPath || !fs.existsSync(mediaPath)) {
    return res.status(404).json({ error: "Quick reply media not found" });
  }

  if (quickReply.mediaType) {
    res.type(quickReply.mediaType);
  }

  res.sendFile(mediaPath);
  return res;
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const quickReply = await QuickReply.findOne({ where: { id, companyId } });
  if (!quickReply) {
    return res.status(404).json({ error: "Quick reply not found" });
  }

  await deleteUploadedMediaIfNeeded(quickReply, companyId);
  await quickReply.destroy();

  return res.status(200).json({ message: "Quick reply deleted" });
};
