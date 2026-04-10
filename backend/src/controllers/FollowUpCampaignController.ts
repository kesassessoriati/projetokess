// @ts-nocheck
import { Request, Response } from "express";
import { Op } from "sequelize";
import FollowUpCampaign from "../models/FollowUpCampaign";
import FollowUpStage from "../models/FollowUpStage";
import FollowUpLog from "../models/FollowUpLog";
import FollowUpBoard from "../models/FollowUpBoard";
import Whatsapp from "../models/Whatsapp";
import { getWbot } from "../libs/wbot";
import { sendFollowUpStageMessage } from "../services/FollowUpCampaignService/FollowUpStageSender";
import {
  DEFAULT_FOLLOW_UP_COLUMNS,
  FOLLOW_UP_ALLOWED_TYPES,
  FOLLOW_UP_STARTER_BOARDS,
  FOLLOW_UP_TARGET_MODES
} from "../services/FollowUpCampaignService/followUpDefaults";

const DEFAULT_BOARD_NAME = FOLLOW_UP_STARTER_BOARDS[0].name;
const DEFAULT_FUNNEL_NAME = FOLLOW_UP_STARTER_BOARDS[0].funnelName;
const DEFAULT_COLUMNS = DEFAULT_FOLLOW_UP_COLUMNS;
const FOLLOW_UP_TRIGGER_VALUE = "message_sent";

const normalizeColumns = (columns: unknown): string[] => {
  const values = Array.isArray(columns) ? columns : [];
  const normalized = values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);

  if (!normalized.includes("Sem Categoria")) {
    normalized.unshift("Sem Categoria");
  }

  return normalized.length ? normalized : [...DEFAULT_COLUMNS];
};

const serializeBoard = (board: FollowUpBoard) => ({
  ...board.toJSON(),
  columns: normalizeColumns(board.columns),
});

const serializeCampaign = (campaign: FollowUpCampaign) => {
  const payload = campaign.toJSON() as Record<string, any>;
  payload.tagIds = Array.isArray(payload.tagIds) ? payload.tagIds.map((value) => Number(value)).filter(Boolean) : [];
  payload.successKeywords = Array.isArray(payload.successKeywords) ? payload.successKeywords : [];
  payload.stopKeywords = Array.isArray(payload.stopKeywords) ? payload.stopKeywords : [];
  payload.targetMode = payload.targetMode || FOLLOW_UP_TARGET_MODES.all;
  payload.stages = Array.isArray(payload.stages)
    ? payload.stages
      .slice()
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    : [];
  return payload;
};

const buildStats = async (where: Record<string, unknown>) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalSent, sentToday, responded] = await Promise.all([
    FollowUpLog.count({ where: { ...where, status: "sent" } }),
    FollowUpLog.count({ where: { ...where, status: "sent", sentAt: { [Op.gte]: today } } }),
    FollowUpLog.count({ where: { ...where, status: "responded" } }),
  ]);

  const responseRate = totalSent > 0 ? Math.round((responded / totalSent) * 100) : 0;

  return { totalSent, sentToday, responded, responseRate };
};

const normalizeIdArray = (values: any): number[] => {
  const source = Array.isArray(values) ? values : [];
  return source
    .map((value) => Number(value))
    .filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index);
};

const normalizeKeywords = (values: any): string[] => {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
};

const normalizeFollowUpTargetMode = (value?: string | null) =>
  Object.values(FOLLOW_UP_TARGET_MODES).includes(String(value || ""))
    ? String(value)
    : FOLLOW_UP_TARGET_MODES.all;

const normalizeFollowUpMessageType = (value?: string | null) => {
  const safeType = String(value || "text").trim().toLowerCase();
  return FOLLOW_UP_ALLOWED_TYPES.includes(safeType) ? safeType : "text";
};

const seedStarterBoards = async (companyId: number) => {
  const existingBoards = await FollowUpBoard.findAll({
    where: { companyId },
    order: [["createdAt", "ASC"]],
  });

  if (!existingBoards.length) {
    return Promise.all(
      FOLLOW_UP_STARTER_BOARDS.map((board) =>
        FollowUpBoard.create({
          companyId,
          name: board.name,
          funnelName: board.funnelName,
          columns: normalizeColumns(board.columns),
        })
      )
    );
  }

  if (
    existingBoards.length === 1 &&
    existingBoards[0].name === "Quadro Principal" &&
    existingBoards[0].funnelName === "Geral"
  ) {
    const campaignsCount = await FollowUpCampaign.count({ where: { companyId } });
    if (!campaignsCount) {
      await existingBoards[0].update({
        name: FOLLOW_UP_STARTER_BOARDS[0].name,
        funnelName: FOLLOW_UP_STARTER_BOARDS[0].funnelName,
        columns: normalizeColumns(FOLLOW_UP_STARTER_BOARDS[0].columns),
      });

      const missingTemplates = FOLLOW_UP_STARTER_BOARDS.slice(1);
      await Promise.all(
        missingTemplates.map((board) =>
          FollowUpBoard.create({
            companyId,
            name: board.name,
            funnelName: board.funnelName,
            columns: normalizeColumns(board.columns),
          })
        )
      );
    }
  }

  return FollowUpBoard.findAll({
    where: { companyId },
    order: [["createdAt", "ASC"]],
  });
};

const ensureDefaultBoard = async (companyId: number): Promise<FollowUpBoard> => {
  let boards = await seedStarterBoards(companyId);
  let board = boards[0];

  const orphanCampaigns = await FollowUpCampaign.findAll({
    where: { companyId, boardId: null },
    attributes: ["id", "boardColumn"],
  });

  const discoveredColumns = normalizeColumns(
    orphanCampaigns.map((campaign) => campaign.boardColumn).filter(Boolean)
  );

  if (!board) {
    board = await FollowUpBoard.create({
      companyId,
      name: DEFAULT_BOARD_NAME,
      funnelName: DEFAULT_FUNNEL_NAME,
      columns: discoveredColumns,
    });
  } else {
    const mergedColumns = normalizeColumns([...(board.columns || []), ...discoveredColumns]);
    if (JSON.stringify(mergedColumns) !== JSON.stringify(board.columns || [])) {
      await board.update({ columns: mergedColumns });
    }
  }

  if (orphanCampaigns.length) {
    await FollowUpCampaign.update(
      { boardId: board.id },
      { where: { companyId, boardId: null } }
    );
  }

  return board;
};

const getBoardById = async (companyId: number, boardId?: number | string | null) => {
  if (!boardId) {
    return ensureDefaultBoard(companyId);
  }

  const board = await FollowUpBoard.findOne({
    where: { id: boardId, companyId },
  });

  if (!board) {
    throw new Error("BOARD_NOT_FOUND");
  }

  return board;
};

const normalizePhone = (value: string) => String(value || "").replace(/\D/g, "");

const normalizeFollowUpStageInput = (stage: any, index: number) => ({
  order: Number(stage?.order) > 0 ? Number(stage.order) : index + 1,
  delayMinutes: Number(stage?.delayMinutes) > 0 ? Number(stage.delayMinutes) : 60,
  title: String(stage?.title || "").trim() || `Etapa ${index + 1}`,
  messageType: normalizeFollowUpMessageType(stage?.messageType),
  message: stage?.message ?? stage?.mediaCaption ?? "",
  mediaUrl: stage?.mediaUrl || null,
  mediaType: stage?.mediaType || null,
  mediaCaption: stage?.mediaCaption || null,
  mediaId: stage?.mediaId ? Number(stage.mediaId) : null,
  buttons: Array.isArray(stage?.buttons) ? stage.buttons : [],
  useAiRewrite: Boolean(stage?.useAiRewrite),
  isActive: stage?.isActive !== undefined ? stage.isActive : true,
});

const normalizeFollowUpStagesInput = (stages: any): any[] =>
  Array.isArray(stages) ? stages.map((stage, index) => normalizeFollowUpStageInput(stage, index)) : [];

const normalizeDeprecatedSourceType = (_sourceType?: string | null) => {
  // Deprecated compatibility field: the active engine now uses a single trigger
  // based on persisted outbound ticket messages and ignores manual/campaign splits.
  return FOLLOW_UP_TRIGGER_VALUE;
};

const resolveWhatsappForFollowUp = async (companyId: number, whatsappId?: number | string | null) => {
  let resolvedWhatsappId = whatsappId ? Number(whatsappId) : null;

  if (!resolvedWhatsappId) {
    const fallback = await Whatsapp.findOne({
      where: { companyId, status: "CONNECTED" },
      order: [["isDefault", "DESC"], ["updatedAt", "DESC"]],
      attributes: ["id"],
    });
    resolvedWhatsappId = fallback?.id ?? null;
  }

  if (!resolvedWhatsappId) {
    throw new Error("WHATSAPP_NOT_FOUND");
  }

  const whatsapp = await Whatsapp.findOne({
    where: { id: resolvedWhatsappId, companyId, status: "CONNECTED" },
  });

  if (!whatsapp) {
    throw new Error("WHATSAPP_NOT_FOUND");
  }

  return whatsapp;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  await ensureDefaultBoard(companyId);

  const campaigns = await FollowUpCampaign.findAll({
    where: { companyId },
    include: [
      { model: FollowUpStage, as: "stages", order: [["order", "ASC"]] },
      { model: FollowUpBoard, as: "board" },
    ],
    order: [["createdAt", "DESC"]],
  });

  return res.json(campaigns.map(serializeCampaign));
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  await ensureDefaultBoard(companyId);

  const campaign = await FollowUpCampaign.findOne({
    where: { id, companyId },
    include: [
      { model: FollowUpStage, as: "stages", order: [["order", "ASC"]] },
      { model: FollowUpBoard, as: "board" },
    ],
  });

  if (!campaign) return res.status(404).json({ error: "Not found" });
  return res.json(serializeCampaign(campaign));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    name,
    description,
    whatsappId,
    isActive,
    sourceType,
    stages,
    boardColumn,
    boardId,
    targetMode,
    tagIds,
    pipelineId,
    pipelineStageId,
    smartMode,
    aiEnabled,
    recoveryInstruction,
    successKeywords,
    stopKeywords
  } = req.body;

  try {
    const board = await getBoardById(companyId, boardId);
    const normalizedColumns = normalizeColumns(board.columns);
    const safeBoardColumn = normalizedColumns.includes(boardColumn) ? boardColumn : "Sem Categoria";
    const normalizedStages = normalizeFollowUpStagesInput(stages);

    const campaign = await FollowUpCampaign.create({
      name,
      description: String(description || "").trim() || null,
      companyId,
      whatsappId: whatsappId || null,
      isActive: isActive !== undefined ? isActive : true,
      sourceType: normalizeDeprecatedSourceType(sourceType),
      boardId: board.id,
      boardColumn: safeBoardColumn,
      targetMode: normalizeFollowUpTargetMode(targetMode),
      tagIds: normalizeIdArray(tagIds),
      pipelineId: pipelineId ? Number(pipelineId) : null,
      pipelineStageId: pipelineStageId ? Number(pipelineStageId) : null,
      smartMode: Boolean(smartMode),
      aiEnabled: Boolean(aiEnabled),
      recoveryInstruction: String(recoveryInstruction || "").trim() || null,
      successKeywords: normalizeKeywords(successKeywords),
      stopKeywords: normalizeKeywords(stopKeywords),
    });

    if (normalizedStages.length) {
      await FollowUpStage.bulkCreate(
        normalizedStages.map((s) => ({
          followUpCampaignId: campaign.id,
          order: s.order,
          title: s.title,
          delayMinutes: s.delayMinutes,
          messageType: s.messageType,
          message: s.message,
          mediaUrl: s.mediaUrl,
          mediaType: s.mediaType,
          mediaCaption: s.mediaCaption,
          mediaId: s.mediaId,
          buttons: s.buttons,
          useAiRewrite: s.useAiRewrite,
          isActive: s.isActive,
        }))
      );
    }

    const created = await FollowUpCampaign.findOne({
      where: { id: campaign.id },
      include: [
        { model: FollowUpStage, as: "stages", order: [["order", "ASC"]] },
        { model: FollowUpBoard, as: "board" },
      ],
    });

    return res.status(201).json(serializeCampaign(created));
  } catch (error) {
    if (error.message === "BOARD_NOT_FOUND") {
      return res.status(404).json({ error: "Board not found" });
    }

    throw error;
  }
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const {
    name,
    description,
    whatsappId,
    isActive,
    sourceType,
    stages,
    boardId,
    boardColumn,
    targetMode,
    tagIds,
    pipelineId,
    pipelineStageId,
    smartMode,
    aiEnabled,
    recoveryInstruction,
    successKeywords,
    stopKeywords
  } = req.body;

  const campaign = await FollowUpCampaign.findOne({ where: { id, companyId } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  try {
    const board =
      boardId !== undefined || !campaign.boardId
        ? await getBoardById(companyId, boardId ?? campaign.boardId)
        : await getBoardById(companyId, campaign.boardId);
    const normalizedStages = normalizeFollowUpStagesInput(stages);

    const normalizedColumns = normalizeColumns(board.columns);
    const nextBoardColumn =
      boardColumn !== undefined
        ? (normalizedColumns.includes(boardColumn) ? boardColumn : "Sem Categoria")
        : (normalizedColumns.includes(campaign.boardColumn) ? campaign.boardColumn : "Sem Categoria");

    await campaign.update({
      name: name ?? campaign.name,
      description: description !== undefined ? String(description || "").trim() || null : campaign.description,
      whatsappId: whatsappId !== undefined ? whatsappId : campaign.whatsappId,
      isActive: isActive !== undefined ? isActive : campaign.isActive,
      sourceType: sourceType !== undefined
        ? normalizeDeprecatedSourceType(sourceType)
        : campaign.sourceType,
      boardId: board.id,
      boardColumn: nextBoardColumn,
      targetMode: targetMode !== undefined ? normalizeFollowUpTargetMode(targetMode) : campaign.targetMode,
      tagIds: tagIds !== undefined ? normalizeIdArray(tagIds) : campaign.tagIds,
      pipelineId: pipelineId !== undefined ? (pipelineId ? Number(pipelineId) : null) : campaign.pipelineId,
      pipelineStageId: pipelineStageId !== undefined ? (pipelineStageId ? Number(pipelineStageId) : null) : campaign.pipelineStageId,
      smartMode: smartMode !== undefined ? Boolean(smartMode) : campaign.smartMode,
      aiEnabled: aiEnabled !== undefined ? Boolean(aiEnabled) : campaign.aiEnabled,
      recoveryInstruction:
        recoveryInstruction !== undefined
          ? String(recoveryInstruction || "").trim() || null
          : campaign.recoveryInstruction,
      successKeywords:
        successKeywords !== undefined ? normalizeKeywords(successKeywords) : campaign.successKeywords,
      stopKeywords:
        stopKeywords !== undefined ? normalizeKeywords(stopKeywords) : campaign.stopKeywords,
    });

    if (Array.isArray(stages)) {
      await FollowUpStage.destroy({ where: { followUpCampaignId: campaign.id } });
      if (normalizedStages.length) {
        await FollowUpStage.bulkCreate(
          normalizedStages.map((s) => ({
            followUpCampaignId: campaign.id,
            order: s.order,
            title: s.title,
            delayMinutes: s.delayMinutes,
            messageType: s.messageType,
            message: s.message,
            mediaUrl: s.mediaUrl,
            mediaType: s.mediaType,
            mediaCaption: s.mediaCaption,
            mediaId: s.mediaId,
            buttons: s.buttons,
            useAiRewrite: s.useAiRewrite,
            isActive: s.isActive,
          }))
        );
      }
    }

    const updated = await FollowUpCampaign.findOne({
      where: { id: campaign.id },
      include: [
        { model: FollowUpStage, as: "stages", order: [["order", "ASC"]] },
        { model: FollowUpBoard, as: "board" },
      ],
    });

    return res.json(serializeCampaign(updated));
  } catch (error) {
    if (error.message === "BOARD_NOT_FOUND") {
      return res.status(404).json({ error: "Board not found" });
    }

    throw error;
  }
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const campaign = await FollowUpCampaign.findOne({ where: { id, companyId } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  await campaign.destroy();
  return res.status(200).json({ ok: true });
};

export const indexBoards = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  await ensureDefaultBoard(companyId);

  const boards = await FollowUpBoard.findAll({
    where: { companyId },
    order: [["funnelName", "ASC"], ["name", "ASC"]],
  });

  return res.json(boards.map(serializeBoard));
};

export const storeBoard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, funnelName, columns } = req.body;

  const board = await FollowUpBoard.create({
    companyId,
    name: String(name || "").trim() || DEFAULT_BOARD_NAME,
    funnelName: String(funnelName || "").trim() || DEFAULT_FUNNEL_NAME,
    columns: normalizeColumns(columns),
  });

  return res.status(201).json(serializeBoard(board));
};

export const updateBoard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { name, funnelName, columns } = req.body;

  const board = await FollowUpBoard.findOne({ where: { id, companyId } });
  if (!board) return res.status(404).json({ error: "Board not found" });

  const nextColumns = normalizeColumns(columns ?? board.columns);

  await board.update({
    name: name !== undefined ? String(name || "").trim() || board.name : board.name,
    funnelName:
      funnelName !== undefined
        ? String(funnelName || "").trim() || DEFAULT_FUNNEL_NAME
        : board.funnelName,
    columns: nextColumns,
  });

  const fallbackColumn = nextColumns[0] || "Sem Categoria";
  const campaigns = await FollowUpCampaign.findAll({
    where: { companyId, boardId: board.id },
    attributes: ["id", "boardColumn"],
  });

  for (const campaign of campaigns) {
    if (!nextColumns.includes(campaign.boardColumn)) {
      await campaign.update({ boardColumn: fallbackColumn });
    }
  }

  return res.json(serializeBoard(board));
};

export const removeBoard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const board = await FollowUpBoard.findOne({ where: { id, companyId } });
  if (!board) return res.status(404).json({ error: "Board not found" });

  const boards = await FollowUpBoard.findAll({
    where: { companyId },
    order: [["createdAt", "ASC"]],
  });

  if (boards.length <= 1) {
    return res.status(400).json({ error: "At least one board is required" });
  }

  const fallbackBoard = boards.find((item) => item.id !== board.id);
  const fallbackColumn = normalizeColumns(fallbackBoard?.columns)[0] || "Sem Categoria";

  await FollowUpCampaign.update(
    { boardId: fallbackBoard?.id || null, boardColumn: fallbackColumn },
    { where: { companyId, boardId: board.id } }
  );

  await board.destroy();
  return res.status(200).json({ ok: true });
};

export const stats = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const campaign = await FollowUpCampaign.findOne({ where: { id, companyId } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  return res.json(await buildStats({ followUpCampaignId: campaign.id }));
};

export const overviewStats = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const stats = await buildStats({ companyId });

  const [totalCampaigns, activeCampaigns, totalBoards] = await Promise.all([
    FollowUpCampaign.count({ where: { companyId } }),
    FollowUpCampaign.count({ where: { companyId, isActive: true } }),
    FollowUpBoard.count({ where: { companyId } }),
  ]);

  return res.json({
    ...stats,
    totalCampaigns,
    activeCampaigns,
    totalBoards,
  });
};

export const uploadMedia = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const file = req.file as Express.Multer.File | undefined;

  if (!file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  return res.status(200).json({
    fileName: file.originalname,
    filePath: `/public/company${companyId}/followups/${file.filename}`,
    mediaType: file.mimetype.split("/")[0],
  });
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { whatsappId, targetNumber, stages = [] } = req.body;

  const normalizedNumber = normalizePhone(targetNumber);
  if (!normalizedNumber || normalizedNumber.length < 10 || normalizedNumber.length > 15) {
    return res.status(400).json({ error: "Numero de WhatsApp invalido" });
  }

  const activeStages = normalizeFollowUpStagesInput(stages)
    .filter((stage) => stage?.isActive !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (!activeStages.length) {
    return res.status(400).json({ error: "Adicione ao menos um estagio ativo para testar" });
  }

  try {
    const whatsapp = await resolveWhatsappForFollowUp(companyId, whatsappId);
    const wbot = getWbot(whatsapp.id);
    const jid = `${normalizedNumber}@s.whatsapp.net`;

    const results = [];
    for (const stage of activeStages) {
      try {
        const result = await sendFollowUpStageMessage({
          wbot,
          jid,
          stage,
          companyId,
        });
        results.push({
          order: stage.order ?? results.length + 1,
          messageType: stage.messageType || "text",
          status: result.status || "sent",
          resolvedPath: result.resolvedPath ?? null,
          attemptedPaths: result.attemptedPaths ?? [],
        });
      } catch (error) {
        results.push({
          order: stage.order ?? results.length + 1,
          messageType: stage.messageType || "text",
          status: "failed",
          error: error?.message || "Erro ao enviar etapa de teste",
          resolvedPath: error?.resolvedPath ?? null,
          attemptedPaths: error?.attemptedPaths ?? [],
        });
      }
    }

    return res.json({
      ok: results.some((result) => result.status === "sent"),
      results,
    });
  } catch (error) {
    if (res.headersSent) {
      return res;
    }

    if (error.message === "WHATSAPP_NOT_FOUND") {
      return res.status(404).json({ error: "Nenhuma conexao WhatsApp conectada encontrada para o teste" });
    }

    return res.status(500).json({ error: error?.message || "Erro ao executar teste do follow-up" });
  }
};
