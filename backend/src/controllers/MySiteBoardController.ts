import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import uploadConfig from "../config/upload";
import MySiteBoardColumn from "../models/MySiteBoardColumn";
import MySiteBoardCard from "../models/MySiteBoardCard";
import MySiteBoardChecklistItem from "../models/MySiteBoardChecklistItem";
import MySiteBoardComment from "../models/MySiteBoardComment";
import MySiteBoardAttachment from "../models/MySiteBoardAttachment";
import GetMySiteBoardService from "../services/MySiteBoardServices/GetMySiteBoardService";

const normalizeSafeUrl = (url?: string): string | null => {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new AppError("URL inválida.", 400);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new AppError("Somente URLs http/https são permitidas.", 400);
  }

  return parsed.toString();
};

export const board = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { search, responsible, priority, tag, withDueDate } = req.query;

  const columns = await GetMySiteBoardService({
    companyId,
    search: search as string,
    responsible: responsible as string,
    priority: priority as string,
    tag: tag as string,
    withDueDate: withDueDate === "true"
  });

  return res.status(200).json(columns);
};

export const createColumn = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, color, description } = req.body;
  if (!name) throw new AppError("Nome da coluna é obrigatório.", 400);

  const order = await MySiteBoardColumn.count({ where: { companyId } });
  const column = await MySiteBoardColumn.create({
    companyId,
    name,
    color,
    description,
    order
  });
  return res.status(201).json(column);
};

export const updateColumn = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { name, color, description } = req.body;
  const column = await MySiteBoardColumn.findOne({ where: { id, companyId } });
  if (!column) throw new AppError("Coluna não encontrada.", 404);

  await column.update({ name, color, description });
  return res.status(200).json(column);
};

export const deleteColumn = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const column = await MySiteBoardColumn.findOne({ where: { id, companyId } });
  if (!column) throw new AppError("Coluna não encontrada.", 404);

  await column.destroy();
  return res.status(200).json({ message: "Coluna removida." });
};

export const reorderColumns = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { columns } = req.body;
  if (!Array.isArray(columns)) throw new AppError("Payload inválido.", 400);

  await Promise.all(
    columns.map((item: any, index: number) =>
      MySiteBoardColumn.update({ order: index }, { where: { id: item.id, companyId } })
    )
  );

  return res.status(200).json({ message: "Colunas reordenadas." });
};

export const createCard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    columnId,
    title,
    description,
    url,
    responsible,
    priority,
    dueDate,
    tags,
    notes,
    color
  } = req.body;

  const column = await MySiteBoardColumn.findOne({ where: { id: columnId, companyId } });
  if (!column) throw new AppError("Coluna não encontrada.", 404);
  if (!title) throw new AppError("Título é obrigatório.", 400);

  const order = await MySiteBoardCard.count({ where: { companyId, columnId } });
  const card = await MySiteBoardCard.create({
    companyId,
    columnId,
    title,
    description,
    url: normalizeSafeUrl(url),
    responsible,
    priority,
    dueDate,
    tags: Array.isArray(tags) ? tags : [],
    notes,
    color,
    order
  });

  return res.status(201).json(card);
};

export const updateCard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const card = await MySiteBoardCard.findOne({ where: { id, companyId } });
  if (!card) throw new AppError("Cartão não encontrado.", 404);

  const payload = { ...req.body };
  if (payload.url !== undefined) payload.url = normalizeSafeUrl(payload.url);
  if (payload.tags !== undefined && !Array.isArray(payload.tags)) payload.tags = [];

  if (payload.columnId) {
    const column = await MySiteBoardColumn.findOne({ where: { id: payload.columnId, companyId } });
    if (!column) throw new AppError("Coluna inválida.", 400);
  }

  await card.update(payload);
  return res.status(200).json(card);
};

export const deleteCard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const card = await MySiteBoardCard.findOne({ where: { id, companyId } });
  if (!card) throw new AppError("Cartão não encontrado.", 404);

  await card.destroy();
  return res.status(200).json({ message: "Cartão removido." });
};

export const moveCard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { columnId, order } = req.body;
  const card = await MySiteBoardCard.findOne({ where: { id, companyId } });
  if (!card) throw new AppError("Cartão não encontrado.", 404);

  const targetColumn = await MySiteBoardColumn.findOne({ where: { id: columnId, companyId } });
  if (!targetColumn) throw new AppError("Coluna alvo não encontrada.", 404);

  await MySiteBoardCard.increment(
    { order: 1 },
    {
      where: {
        companyId,
        columnId,
        order: { [Op.gte]: Number(order) || 0 }
      }
    }
  );

  await card.update({
    columnId,
    order: Number(order) || 0
  });

  return res.status(200).json(card);
};

export const createChecklistItem = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { cardId } = req.params;
  const { title } = req.body;
  if (!title) throw new AppError("Título do item é obrigatório.", 400);

  const card = await MySiteBoardCard.findOne({ where: { id: cardId, companyId } });
  if (!card) throw new AppError("Cartão não encontrado.", 404);

  const order = await MySiteBoardChecklistItem.count({ where: { cardId, companyId } });
  const item = await MySiteBoardChecklistItem.create({
    companyId,
    cardId: Number(cardId),
    title,
    order,
    completed: false
  });
  return res.status(201).json(item);
};

export const updateChecklistItem = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const item = await MySiteBoardChecklistItem.findOne({ where: { id, companyId } });
  if (!item) throw new AppError("Item de checklist não encontrado.", 404);

  await item.update(req.body);
  return res.status(200).json(item);
};

export const deleteChecklistItem = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const item = await MySiteBoardChecklistItem.findOne({ where: { id, companyId } });
  if (!item) throw new AppError("Item de checklist não encontrado.", 404);
  await item.destroy();
  return res.status(200).json({ message: "Item removido." });
};

export const createComment = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { cardId } = req.params;
  const { message } = req.body;
  if (!message) throw new AppError("Comentário é obrigatório.", 400);

  const card = await MySiteBoardCard.findOne({ where: { id: cardId, companyId } });
  if (!card) throw new AppError("Cartão não encontrado.", 404);

  const comment = await MySiteBoardComment.create({
    companyId,
    cardId: Number(cardId),
    userId,
    message
  });
  return res.status(201).json(comment);
};

export const deleteComment = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const comment = await MySiteBoardComment.findOne({ where: { id, companyId } });
  if (!comment) throw new AppError("Comentário não encontrado.", 404);
  await comment.destroy();
  return res.status(200).json({ message: "Comentário removido." });
};

export const uploadAttachment = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { cardId } = req.params;
  const file = req.file as Express.Multer.File;
  if (!file) throw new AppError("Arquivo não enviado.", 400);

  const card = await MySiteBoardCard.findOne({ where: { id: cardId, companyId } });
  if (!card) throw new AppError("Cartão não encontrado.", 404);

  const publicPath = `/public/company${companyId}/mysites/${cardId}/${file.filename}`;
  const attachment = await MySiteBoardAttachment.create({
    companyId,
    cardId: Number(cardId),
    userId,
    name: file.originalname,
    originalName: file.originalname,
    filename: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    url: publicPath,
    type: "file"
  });

  return res.status(201).json(attachment);
};

export const createAttachmentLink = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { cardId } = req.params;
  const { name, url } = req.body;

  const card = await MySiteBoardCard.findOne({ where: { id: cardId, companyId } });
  if (!card) throw new AppError("Cartão não encontrado.", 404);
  const safeUrl = normalizeSafeUrl(url);
  if (!safeUrl) throw new AppError("URL do anexo é obrigatória.", 400);

  const attachment = await MySiteBoardAttachment.create({
    companyId,
    cardId: Number(cardId),
    userId,
    name: name || "Link",
    url: safeUrl,
    type: "link"
  });

  return res.status(201).json(attachment);
};

export const deleteAttachment = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const attachment = await MySiteBoardAttachment.findOne({ where: { id, companyId } });
  if (!attachment) throw new AppError("Anexo não encontrado.", 404);

  if (attachment.type === "file" && attachment.filename) {
    const localPath = path.resolve(
      uploadConfig.directory,
      `company${companyId}`,
      "mysites",
      String(attachment.cardId),
      attachment.filename
    );
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  }

  await attachment.destroy();
  return res.status(200).json({ message: "Anexo removido." });
};

