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

const getFolderStorageDir = (companyId: number, folderId: number) =>
  path.resolve(publicFolder, `company${companyId}`, "media-drive", String(folderId));

const getMediaTypeGroup = (mimeType: string) => {
  if (!mimeType) return "document";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
};

const buildFolderMaps = (folders: any[]) => {
  const byId = new Map<number, any>();
  const childrenMap = new Map<number, any[]>();

  folders.forEach((folder: any) => {
    const folderId = Number(folder.id);
    const parentId = Number(folder.parentId || 0);
    byId.set(folderId, folder);
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(folder);
  });

  return { byId, childrenMap };
};

const ensureDirectoryExists = (directory: string) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const safeDeleteFile = (absolutePath: string) => {
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

const safeRemoveDirectory = (directory: string) => {
  if (fs.existsSync(directory)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

const getDescendantFolderIds = (folderId: number, childrenMap: Map<number, any[]>) => {
  const descendants: number[] = [];
  const stack = [Number(folderId)];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    descendants.push(currentId);
    const children = childrenMap.get(Number(currentId)) || [];
    children.forEach((child: any) => stack.push(Number(child.id)));
  }

  return descendants;
};

const buildFolderPath = (folderId: number, folderMap: Map<number, any>) => {
  const segments: string[] = [];
  let current = folderMap.get(Number(folderId));

  while (current) {
    segments.unshift(current.name);
    current = current.parentId ? folderMap.get(Number(current.parentId)) : null;
  }

  return segments.join(" / ");
};

const buildFolderLevel = (folder: any, folderMap: Map<number, any>) => {
  let level = 0;
  let current = folder?.parentId ? folderMap.get(Number(folder.parentId)) : null;

  while (current) {
    level += 1;
    current = current.parentId ? folderMap.get(Number(current.parentId)) : null;
  }

  return level;
};

const buildAggregatedFileCountMap = (
  folders: any[],
  childrenMap: Map<number, any[]>,
  directFileCountMap: Map<number, number>
) => {
  const totals = new Map<number, number>();

  const countFiles = (folderId: number): number => {
    if (totals.has(folderId)) {
      return totals.get(folderId)!;
    }

    const directCount = directFileCountMap.get(folderId) || 0;
    const childCount = (childrenMap.get(folderId) || []).reduce(
      (sum, child) => sum + countFiles(Number(child.id)),
      0
    );

    const total = directCount + childCount;
    totals.set(folderId, total);
    return total;
  };

  folders.forEach((folder: any) => {
    countFiles(Number(folder.id));
  });

  return totals;
};

const loadCompanyFolderContext = async (companyId: number) => {
  const folders = await MediaFolder.findAll({
    where: { companyId },
    order: [["name", "ASC"]]
  });
  const folderObjects = folders.map((folder: any) => folder.toJSON());
  const { byId, childrenMap } = buildFolderMaps(folderObjects);

  return {
    folders,
    folderObjects,
    folderMap: byId,
    childrenMap
  };
};

const getAvailableStoragePath = (companyId: number, folderId: number, originalFileName: string) => {
  const folderDirectory = getFolderStorageDir(companyId, folderId);
  ensureDirectoryExists(folderDirectory);

  const parsed = path.parse(path.basename(originalFileName));
  let candidateName = `${parsed.name}${parsed.ext}`;
  let absolutePath = path.join(folderDirectory, candidateName);
  let counter = 1;

  while (fs.existsSync(absolutePath)) {
    candidateName = `${parsed.name}-${Date.now()}-${counter}${parsed.ext}`;
    absolutePath = path.join(folderDirectory, candidateName);
    counter += 1;
  }

  return {
    absolutePath,
    storagePath: path.join("media-drive", String(folderId), candidateName).replace(/\\/g, "/")
  };
};

const serializeFolder = (
  folder: any,
  allFolders: any[],
  directFileCountMap: Map<number, number>,
  totalFileCountMap: Map<number, number>,
  folderMap: Map<number, any>
) => ({
  id: folder.id,
  name: folder.name,
  description: folder.description,
  companyId: folder.companyId,
  parentId: folder.parentId,
  createdAt: folder.createdAt,
  updatedAt: folder.updatedAt,
  level: buildFolderLevel(folder, folderMap),
  path: buildFolderPath(Number(folder.id), folderMap),
  directFileCount: directFileCountMap.get(folder.id) || 0,
  fileCount: totalFileCountMap.get(folder.id) || 0,
  children: allFolders
    .filter((item) => Number(item.parentId || 0) === Number(folder.id))
    .map((item) => serializeFolder(item, allFolders, directFileCountMap, totalFileCountMap, folderMap))
});

const serializeFile = (file: any, companyId: number, folderMap?: Map<number, any>) => ({
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
  folderName: folderMap?.get(Number(file.folderId))?.name || null,
  folderPath: folderMap ? buildFolderPath(Number(file.folderId), folderMap) : null,
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

  const { folders, folderObjects, folderMap } = await loadCompanyFolderContext(companyId);

  const visibleFolderObjects = search
    ? folderObjects.filter((folder: any) => {
        const normalizedSearch = search.toLowerCase();
        return (
          String(folder.name || "").toLowerCase().includes(normalizedSearch) ||
          String(folder.description || "").toLowerCase().includes(normalizedSearch) ||
          buildFolderPath(Number(folder.id), folderMap).toLowerCase().includes(normalizedSearch)
        );
      })
    : folderObjects;

  const fileCounts = await MediaFile.findAll({
    attributes: ["folderId"],
    where: { companyId }
  });

  const directFileCountMap = fileCounts.reduce((map, item: any) => {
    map.set(item.folderId, (map.get(item.folderId) || 0) + 1);
    return map;
  }, new Map<number, number>());

  const { childrenMap } = buildFolderMaps(folderObjects);
  const totalFileCountMap = buildAggregatedFileCountMap(folderObjects, childrenMap, directFileCountMap);

  const visibleFolderIds = new Set(visibleFolderObjects.map((folder: any) => Number(folder.id)));

  const tree = visibleFolderObjects
    .filter((folder: any) => !folder.parentId || !visibleFolderIds.has(Number(folder.parentId)))
    .map((folder: any) =>
      serializeFolder(folder, visibleFolderObjects, directFileCountMap, totalFileCountMap, folderMap)
    );

  return res.json({
    folders: tree,
    flatFolders: visibleFolderObjects.map((folder: any) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      companyId: folder.companyId,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      level: buildFolderLevel(folder, folderMap),
      path: buildFolderPath(Number(folder.id), folderMap),
      directFileCount: directFileCountMap.get(folder.id) || 0,
      fileCount: totalFileCountMap.get(folder.id) || 0
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

    const { folderObjects, childrenMap } = await loadCompanyFolderContext(companyId);
    const descendants = getDescendantFolderIds(Number(folder.id), childrenMap);

    if (descendants.includes(Number(parentId))) {
      throw new AppError("Uma pasta não pode ser movida para dentro de uma subpasta dela");
    }
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
  const { childrenMap } = await loadCompanyFolderContext(companyId);
  const descendantIds = getDescendantFolderIds(Number(folder.id), childrenMap);

  const files = await MediaFile.findAll({
    where: {
      companyId,
      folderId: {
        [Op.in]: descendantIds
      }
    }
  });

  files.forEach((file: any) => {
    safeDeleteFile(getAbsoluteMediaPath(companyId, file.storagePath));
  });

  await folder.destroy();

  descendantIds.forEach((id) => {
    safeRemoveDirectory(getFolderStorageDir(companyId, Number(id)));
  });

  return res.status(204).send();
};

export const listFiles = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    folderId,
    search = "",
    mediaType = "all",
    includeDescendants = "false"
  } = req.query as {
    folderId?: string;
    search?: string;
    mediaType?: string;
    includeDescendants?: string;
  };

  const where: any = { companyId };
  const { folderObjects, folderMap, childrenMap } = await loadCompanyFolderContext(companyId);

  if (folderId) {
    const selectedFolderId = Number(folderId);
    await ensureFolderAccess(selectedFolderId, companyId);

    where.folderId =
      String(includeDescendants) === "true"
        ? { [Op.in]: getDescendantFolderIds(selectedFolderId, childrenMap) }
        : selectedFolderId;
  }
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
    .map((file: any) => serializeFile(file, companyId, folderMap))
    .filter((file: any) => mediaType === "all" || file.mediaType === mediaType);

  return res.json(serialized);
};

export const listFolderFiles = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { folderId } = req.params;

  await ensureFolderAccess(Number(folderId), companyId);
  const { folderMap } = await loadCompanyFolderContext(companyId);

  const files = await MediaFile.findAll({
    where: { folderId: Number(folderId), companyId },
    order: [["updatedAt", "DESC"]]
  });

  return res.json(files.map((file: any) => serializeFile(file, companyId, folderMap)));
};

export const uploadFiles = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const folderId = Number(req.params.folderId || req.body.folderId);
  const files = (req.files || []) as Express.Multer.File[];

  await ensureFolderAccess(folderId, companyId);
  const { folderMap } = await loadCompanyFolderContext(companyId);

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

  return res.status(201).json(createdFiles.map((file: any) => serializeFile(file, companyId, folderMap)));
};

export const updateFile = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { fileId } = req.params;
  const { customName, folderId } = req.body;

  const file = await ensureFileAccess(Number(fileId), companyId);

  if (folderId && Number(folderId) !== Number(file.folderId)) {
    await ensureFolderAccess(Number(folderId), companyId);

    const currentAbsolutePath = getAbsoluteMediaPath(companyId, file.storagePath);
    if (!fs.existsSync(currentAbsolutePath)) {
      throw new AppError("Arquivo físico não encontrado para mover", 404);
    }

    const { absolutePath, storagePath } = getAvailableStoragePath(
      companyId,
      Number(folderId),
      path.basename(file.storagePath)
    );

    ensureDirectoryExists(path.dirname(absolutePath));
    fs.renameSync(currentAbsolutePath, absolutePath);

    file.storagePath = storagePath;
  }

  await file.update({
    customName: customName?.trim() || null,
    folderId: folderId ? Number(folderId) : file.folderId,
    storagePath: file.storagePath
  });

  const { folderMap } = await loadCompanyFolderContext(companyId);

  return res.json(serializeFile(file, companyId, folderMap));
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
