import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import CreateScheduledDispatcherService from "../services/ScheduledDispatcherService/CreateScheduledDispatcherService";
import ListScheduledDispatchersService from "../services/ScheduledDispatcherService/ListScheduledDispatchersService";
import ShowScheduledDispatcherService from "../services/ScheduledDispatcherService/ShowScheduledDispatcherService";
import UpdateScheduledDispatcherService from "../services/ScheduledDispatcherService/UpdateScheduledDispatcherService";
import DeleteScheduledDispatcherService from "../services/ScheduledDispatcherService/DeleteScheduledDispatcherService";
import ToggleScheduledDispatcherService from "../services/ScheduledDispatcherService/ToggleScheduledDispatcherService";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/mpeg",
  "audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav",
  "application/pdf"
];

const MAX_FILE_SIZES: Record<string, number> = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 10 * 1024 * 1024,
  application: 10 * 1024 * 1024
};

const deleteMediaFile = (mediaUrl: string | null) => {
  if (!mediaUrl) return;
  const filePath = path.resolve(publicFolder, mediaUrl);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

const resolveUploadedMedia = (req: Request) => {
  if (!req.file) return { mediaUrl: null as null, mediaType: null as null };
  return {
    mediaUrl: `company${req.user.companyId}/${req.file.filename}` as string,
    mediaType: req.file.mimetype.split("/")[0] as string
  };
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const dispatchers = await ListScheduledDispatchersService({ companyId });
  return res.json(dispatchers);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const dispatcher = await ShowScheduledDispatcherService({
    id: Number(id),
    companyId
  });

  return res.json(dispatcher);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  if (req.file) {
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      deleteMediaFile(`company${companyId}/${req.file.filename}`);
      return res.status(400).json({ error: "Tipo de arquivo não permitido." });
    }
    const type = req.file.mimetype.split("/")[0];
    const maxSize = MAX_FILE_SIZES[type] ?? MAX_FILE_SIZES.application;
    if (req.file.size > maxSize) {
      deleteMediaFile(`company${companyId}/${req.file.filename}`);
      return res.status(400).json({ error: `Arquivo muito grande. Limite: ${Math.round(maxSize / 1024 / 1024)}MB.` });
    }
  }

  const { mediaUrl, mediaType } = resolveUploadedMedia(req);

  const payload = {
    companyId,
    title: req.body.title,
    messageTemplate: req.body.messageTemplate ?? "",
    eventType: req.body.eventType,
    whatsappId: req.body.whatsappId ? Number(req.body.whatsappId) : null,
    startTime: req.body.startTime,
    sendIntervalSeconds: Number(req.body.sendIntervalSeconds),
    daysBeforeDue: req.body.daysBeforeDue != null ? Number(req.body.daysBeforeDue) : null,
    daysAfterDue: req.body.daysAfterDue != null ? Number(req.body.daysAfterDue) : null,
    active: req.body.active === "false" ? false : req.body.active === "true" ? true : Boolean(req.body.active ?? true),
    mediaUrl,
    mediaType,
    mediaCaption: req.body.mediaCaption ?? null
  };

  const dispatcher = await CreateScheduledDispatcherService(payload);
  return res.status(201).json(dispatcher);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  if (req.file) {
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      deleteMediaFile(`company${companyId}/${req.file.filename}`);
      return res.status(400).json({ error: "Tipo de arquivo não permitido." });
    }
    const type = req.file.mimetype.split("/")[0];
    const maxSize = MAX_FILE_SIZES[type] ?? MAX_FILE_SIZES.application;
    if (req.file.size > maxSize) {
      deleteMediaFile(`company${companyId}/${req.file.filename}`);
      return res.status(400).json({ error: `Arquivo muito grande. Limite: ${Math.round(maxSize / 1024 / 1024)}MB.` });
    }
  }

  const removeMedia = req.body.removeMedia === "true";

  let mediaUrl: string | null | undefined = undefined;
  let mediaType: string | null | undefined = undefined;
  let mediaCaption: string | null | undefined = undefined;

  if (req.file) {
    const existing = await ShowScheduledDispatcherService({ id: Number(id), companyId });
    if (existing?.mediaUrl) deleteMediaFile(existing.mediaUrl);
    const resolved = resolveUploadedMedia(req);
    mediaUrl = resolved.mediaUrl;
    mediaType = resolved.mediaType;
    mediaCaption = req.body.mediaCaption !== undefined ? (req.body.mediaCaption ?? null) : undefined;
  } else if (removeMedia) {
    const existing = await ShowScheduledDispatcherService({ id: Number(id), companyId });
    if (existing?.mediaUrl) deleteMediaFile(existing.mediaUrl);
    mediaUrl = null;
    mediaType = null;
    mediaCaption = null;
  } else if (req.body.mediaCaption !== undefined) {
    mediaCaption = req.body.mediaCaption ?? null;
  }

  const dispatcher = await UpdateScheduledDispatcherService({
    dispatcherId: Number(id),
    companyId,
    title: req.body.title,
    messageTemplate: req.body.messageTemplate,
    eventType: req.body.eventType,
    whatsappId: req.body.whatsappId !== undefined
      ? (req.body.whatsappId ? Number(req.body.whatsappId) : null)
      : undefined,
    startTime: req.body.startTime,
    sendIntervalSeconds: req.body.sendIntervalSeconds !== undefined
      ? Number(req.body.sendIntervalSeconds)
      : undefined,
    daysBeforeDue: req.body.daysBeforeDue != null ? Number(req.body.daysBeforeDue) : undefined,
    daysAfterDue: req.body.daysAfterDue != null ? Number(req.body.daysAfterDue) : undefined,
    active: req.body.active === "false" ? false : req.body.active === "true" ? true : req.body.active,
    mediaUrl,
    mediaType,
    mediaCaption
  });

  return res.json(dispatcher);
};

export const toggle = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { active } = req.body;

  const dispatcher = await ToggleScheduledDispatcherService({
    dispatcherId: Number(id),
    companyId,
    active
  });

  return res.json(dispatcher);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  await DeleteScheduledDispatcherService({
    dispatcherId: Number(id),
    companyId
  });

  return res.status(204).send();
};
