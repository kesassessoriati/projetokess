import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { Request, Response } from "express";
import MediaFolder from "../models/MediaFolder";
import MediaFile from "../models/MediaFile";
import AppError from "../errors/AppError";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

const normalizePath = (value: string) => value.replace(/\\/g, "/").replace(/^\/+/, "");

const getAbsoluteMediaPath = (companyId: number, storagePath: string) =>
  path.resolve(publicFolder, `company${companyId}`, normalizePath(storagePath));

const getMediaTypeGroup = (mimeType: string) => {
  if (!mimeType) return "document";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
};

const serializeFolder = (folder: any, allFolders: any[], fileCountMap: Map<number, number>) => ({
  id: folder.id,
  name: folder.name,
  description: folder.description,
  companyId: folder.companyId,
  parentId: folder.parentId,
  createdAt: folder.createdAt,
  updatedAt: folder.updatedAt,
  fileCount: fileCountMap.get(folder.id) || 0,
  children: allFolders
    .filter((item) => Number(item.parentId || 0) === Number(folder.id))
    .map((item) => serializeFolder(item, allFolders, fileCountMap))
});

const serializeFile = (file: any, companyId: number) => ({
  id: file.id,
  folderId: file.folderId,
  companyId: file.companyId,
  originalName: file.originalName,
  customName: file.customName,
  displayName: file.customName || file.originalName,
  mimeType: file.mimeType,
  mediaType: getMediaTypeGroup(file.mimeType),
  size: Number(file.size || 0),
  storagePath: file.storagePath,
  url: `${process.env.BACKEND_URL}${process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""}/public/company${companyId}/${normalizePath(file.storagePath)}`,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt
});

const ensureFolderAccess = async (folderId: number, companyId: number) => {
  const folder = await MediaFolder.findOne({ where: { id: folderId, companyId } });
  if (!folder) {
    throw new AppError("Pasta de mídia não encontrada", 404);
  }
  return folder;
};

const ensureFileAccess = async (fileId: number, companyId: number) => {
  const file = await MediaFile.findOne({ where: { id: fileId, companyId } });
  if (!file) {
    throw new AppError("Arquivo de mídia não encontrado", 404);
  }
  return file;
};

export const listFolders = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { search = "" } = req.query as { search?: string };

  const folders = await MediaFolder.findAll({
    where: {
      companyId,
      ...(search
        ? {
            [Op.or]: [
              { name: { [Op.iLike]: `%${search}%` } },
              { description: { [Op.iLike]: `%${search}%` } }
            ]
          }
        : {})
    },
    order: [["name", "ASC"]]
  });

  const fileCounts = await MediaFile.findAll({
    attributes: ["folderId"],
    where: { companyId }
  });

  const fileCountMap = fileCounts.reduce((map, item: any) => {
    map.set(item.folderId, (map.get(item.folderId) || 0) + 1);
    return map;
  }, new Map<number, number>());

  const tree = folders
    .filter((folder: any) => !folder.parentId)
    .map((folder: any) => serializeFolder(folder, folders.map((item) => item.toJSON()), fileCountMap));

  return res.json({
    folders: tree,
    flatFolders: folders.map((folder: any) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      companyId: folder.companyId,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      fileCount: fileCountMap.get(folder.id) || 0
    }))
  });
};

export const createFolder = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, description, parentId } = req.body;

  if (!name?.trim()) {
    throw new AppError("Nome da pasta é obrigatório");
  }

  if (parentId) {
    await ensureFolderAccess(Number(parentId), companyId);
  }

  const folder = await MediaFolder.create({
    name: name.trim(),
    description: description?.trim() || null,
    companyId,
    parentId: parentId || null
  });

  return res.status(201).json(folder);
};

export const updateFolder = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { folderId } = req.params;
  const { name, description, parentId } = req.body;

  const folder = await ensureFolderAccess(Number(folderId), companyId);

  if (parentId && Number(parentId) === Number(folder.id)) {
    throw new AppError("Uma pasta não pode ser filha dela mesma");
  }

  if (parentId) {
    await ensureFolderAccess(Number(parentId), companyId);
  }

  await folder.update({
    name: name?.trim() || folder.name,
    description: description?.trim() || null,
    parentId: parentId || null
  });

  return res.json(folder);
};

export const deleteFolder = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { folderId } = req.params;

  const folder = await ensureFolderAccess(Number(folderId), companyId);
  const files = await MediaFile.findAll({ where: { companyId } });

  files
    .filter((file: any) => Number(file.folderId) === Number(folder.id))
    .forEach((file: any) => {
      const absolutePath = getAbsoluteMediaPath(companyId, file.storagePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    });

  await folder.destroy();

  return res.status(204).send();
};

export const listFiles = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    folderId,
    search = "",
    mediaType = "all"
  } = req.query as { folderId?: string; search?: string; mediaType?: string };

  const where: any = { companyId };
  if (folderId) where.folderId = Number(folderId);
  if (search) {
    where[Op.or] = [
      { originalName: { [Op.iLike]: `%${search}%` } },
      { customName: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const files = await MediaFile.findAll({
    where,
    order: [["updatedAt", "DESC"]]
  });

  const serialized = files
    .map((file: any) => serializeFile(file, companyId))
    .filter((file: any) => mediaType === "all" || file.mediaType === mediaType);

  return res.json(serialized);
};

export const listFolderFiles = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { folderId } = req.params;

  await ensureFolderAccess(Number(folderId), companyId);

  const files = await MediaFile.findAll({
    where: { folderId: Number(folderId), companyId },
    order: [["updatedAt", "DESC"]]
  });

  return res.json(files.map((file: any) => serializeFile(file, companyId)));
};

export const uploadFiles = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const folderId = Number(req.params.folderId || req.body.folderId);
  const files = (req.files || []) as Express.Multer.File[];

  await ensureFolderAccess(folderId, companyId);

  if (!files.length) {
    throw new AppError("Nenhum arquivo enviado");
  }

  const createdFiles = await Promise.all(
    files.map(async (file) => {
      const storagePath = path.join("media-drive", String(folderId), file.filename).replace(/\\/g, "/");

      return MediaFile.create({
        folderId,
        companyId,
        originalName: file.originalname,
        customName: req.body.customName || null,
        mimeType: file.mimetype,
        size: file.size,
        storagePath
      });
    })
  );

  return res.status(201).json(createdFiles.map((file: any) => serializeFile(file, companyId)));
};

export const updateFile = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { fileId } = req.params;
  const { customName, folderId } = req.body;

  const file = await ensureFileAccess(Number(fileId), companyId);

  if (folderId && Number(folderId) !== Number(file.folderId)) {
    await ensureFolderAccess(Number(folderId), companyId);
  }

  await file.update({
    customName: customName?.trim() || null,
    folderId: folderId ? Number(folderId) : file.folderId
  });

  return res.json(serializeFile(file, companyId));
};

export const deleteFile = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { fileId } = req.params;

  const file = await ensureFileAccess(Number(fileId), companyId);
  const absolutePath = getAbsoluteMediaPath(companyId, file.storagePath);

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }

  await file.destroy();

  return res.status(204).send();
};

export const downloadFile = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { fileId } = req.params;

  const file = await ensureFileAccess(Number(fileId), companyId);
  const absolutePath = getAbsoluteMediaPath(companyId, file.storagePath);

  if (!fs.existsSync(absolutePath)) {
    throw new AppError("Arquivo não encontrado", 404);
  }

  res.type(file.mimeType);
  res.download(absolutePath, file.customName || file.originalName);
  return res;
};
