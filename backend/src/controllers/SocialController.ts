import { Request, Response } from "express";
import { Op } from "sequelize";
import SocialBoard from "../models/SocialBoard";
import SocialStage from "../models/SocialStage";
import SocialContent from "../models/SocialContent";
import CreateSocialBoardService from "../services/SocialServices/CreateSocialBoardService";
import ListSocialBoardsService from "../services/SocialServices/ListSocialBoardsService";
import GetSocialBoardOverviewService from "../services/SocialServices/GetSocialBoardOverviewService";

export const indexBoards = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const boards = await ListSocialBoardsService({ companyId });
  return res.status(200).json(boards);
};

export const showBoard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { search, stageId, platform, contentType, startDate, endDate } = req.query;

  const overview = await GetSocialBoardOverviewService({
    companyId,
    boardId: Number(id),
    search: search as string,
    stageId: stageId ? Number(stageId) : undefined,
    platform: platform as string,
    contentType: contentType as string,
    startDate: startDate as string,
    endDate: endDate as string
  });

  if (!overview) {
    return res.status(404).json({ error: "Board not found" });
  }

  return res.status(200).json(overview);
};

export const storeBoard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, description, color, relatedType, relatedId, relatedName } = req.body;

  const board = await CreateSocialBoardService({
    companyId,
    name,
    description,
    color,
    relatedType,
    relatedId,
    relatedName
  });

  return res.status(200).json(board);
};

export const updateBoard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { name, description, color, relatedType, relatedId, relatedName } = req.body;

  const board = await SocialBoard.findOne({
    where: { id, companyId }
  });

  if (!board) {
    return res.status(404).json({ error: "Board not found" });
  }

  await board.update({ name, description, color, relatedType, relatedId, relatedName });

  return res.status(200).json(board);
};

export const deleteBoard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const board = await SocialBoard.findOne({
    where: { id, companyId }
  });

  if (!board) {
    return res.status(404).json({ error: "Board not found" });
  }

  await board.destroy();
  return res.status(200).json({ message: "Board deleted" });
};

export const duplicateBoard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const board = await SocialBoard.findOne({
    where: { id, companyId }
  });

  if (!board) {
    return res.status(404).json({ error: "Board not found" });
  }

  const newBoard = await CreateSocialBoardService({
    companyId,
    name: `${board.name} (Cópia)`,
    description: board.description,
    color: board.color,
    relatedType: board.relatedType,
    relatedId: board.relatedId,
    relatedName: board.relatedName
  });

  const originalStages = await SocialStage.findAll({
    where: { companyId, boardId: board.id },
    order: [["order", "ASC"]]
  });
  const createdStages = await SocialStage.findAll({
    where: { companyId, boardId: newBoard.id },
    order: [["order", "ASC"]]
  });

  const stageMap = new Map<number, number>();
  originalStages.forEach((oldStage, idx) => {
    stageMap.set(oldStage.id, createdStages[idx]?.id);
  });

  const oldContents = await SocialContent.findAll({
    where: { companyId, boardId: board.id }
  });

  await Promise.all(
    oldContents.map(content =>
      SocialContent.create({
        companyId,
        boardId: newBoard.id,
        stageId: stageMap.get(content.stageId) || createdStages[0].id,
        title: content.title,
        entityName: content.entityName,
        platform: content.platform,
        contentType: content.contentType,
        description: content.description,
        copyText: content.copyText,
        scriptText: content.scriptText,
        publishDate: content.publishDate,
        publishTime: content.publishTime,
        driveLink: content.driveLink,
        siteUrl: content.siteUrl,
        notes: content.notes,
        responsibleId: content.responsibleId,
        priority: content.priority,
        tags: content.tags,
        order: content.order
      })
    )
  );

  return res.status(200).json(newBoard);
};

export const storeContent = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    boardId,
    stageId,
    title,
    entityName,
    platform,
    contentType,
    description,
    copyText,
    scriptText,
    publishDate,
    publishTime,
    driveLink,
    siteUrl,
    notes,
    responsibleId,
    priority,
    tags
  } = req.body;

  const board = await SocialBoard.findOne({ where: { id: boardId, companyId } });
  if (!board) return res.status(404).json({ error: "Board not found" });

  const stage = await SocialStage.findOne({ where: { id: stageId, boardId, companyId } });
  if (!stage) return res.status(404).json({ error: "Stage not found" });

  const order =
    (await SocialContent.count({
      where: { companyId, boardId, stageId }
    })) || 0;

  const content = await SocialContent.create({
    companyId,
    boardId,
    stageId,
    title,
    entityName,
    platform,
    contentType,
    description,
    copyText,
    scriptText,
    publishDate,
    publishTime,
    driveLink,
    siteUrl,
    notes,
    responsibleId,
    priority,
    tags,
    order
  });

  return res.status(200).json(content);
};

export const updateContent = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const content = await SocialContent.findOne({
    where: { id, companyId }
  });

  if (!content) {
    return res.status(404).json({ error: "Content not found" });
  }

  const updateData = { ...req.body };

  if (updateData.boardId || updateData.stageId) {
    const boardId = updateData.boardId || content.boardId;
    const stageId = updateData.stageId || content.stageId;
    const stage = await SocialStage.findOne({
      where: { id: stageId, boardId, companyId }
    });
    if (!stage) return res.status(400).json({ error: "Invalid stage for board" });
  }

  await content.update(updateData);

  return res.status(200).json(content);
};

export const deleteContent = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const content = await SocialContent.findOne({
    where: { id, companyId }
  });

  if (!content) {
    return res.status(404).json({ error: "Content not found" });
  }

  await content.destroy();
  return res.status(200).json({ message: "Content deleted" });
};

export const moveContent = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { stageId, order } = req.body;

  const content = await SocialContent.findOne({
    where: { id, companyId }
  });
  if (!content) return res.status(404).json({ error: "Content not found" });

  const targetStage = await SocialStage.findOne({
    where: { id: stageId, companyId, boardId: content.boardId }
  });
  if (!targetStage) return res.status(404).json({ error: "Target stage not found" });

  await SocialContent.increment(
    { order: 1 },
    {
      where: {
        companyId,
        boardId: content.boardId,
        stageId,
        order: { [Op.gte]: Number(order) || 0 }
      }
    }
  );

  await content.update({
    stageId,
    order: Number(order) || 0
  });

  return res.status(200).json(content);
};

