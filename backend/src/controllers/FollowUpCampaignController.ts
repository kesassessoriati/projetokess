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

const DEFAULT_BOARD_NAME = "Quadro Principal";
const DEFAULT_FUNNEL_NAME = "Geral";
const DEFAULT_COLUMNS = ["Sem Categoria"];

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

const ensureDefaultBoard = async (companyId: number): Promise<FollowUpBoard> => {
  let board = await FollowUpBoard.findOne({
    where: { companyId },
    order: [["createdAt", "ASC"]],
  });

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

  return res.json(campaigns);
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
  return res.json(campaign);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, whatsappId, isActive, sourceType, stages, boardColumn, boardId } = req.body;

  try {
    const board = await getBoardById(companyId, boardId);
    const normalizedColumns = normalizeColumns(board.columns);
    const safeBoardColumn = normalizedColumns.includes(boardColumn) ? boardColumn : "Sem Categoria";

    const campaign = await FollowUpCampaign.create({
      name,
      companyId,
      whatsappId: whatsappId || null,
      isActive: isActive !== undefined ? isActive : true,
      sourceType: sourceType || "manual",
      boardId: board.id,
      boardColumn: safeBoardColumn,
    });

    if (Array.isArray(stages) && stages.length) {
      await FollowUpStage.bulkCreate(
        stages.map((s, idx) => ({
          followUpCampaignId: campaign.id,
          order: s.order ?? idx + 1,
          delayMinutes: s.delayMinutes ?? 60,
          messageType: s.messageType ?? "text",
          message: s.message ?? "",
          mediaUrl: s.mediaUrl ?? null,
          mediaType: s.mediaType ?? null,
          mediaCaption: s.mediaCaption ?? null,
          buttons: s.buttons ?? null,
          isActive: s.isActive !== undefined ? s.isActive : true,
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

    return res.status(201).json(created);
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
  const { name, whatsappId, isActive, sourceType, stages, boardId, boardColumn } = req.body;

  const campaign = await FollowUpCampaign.findOne({ where: { id, companyId } });
  if (!campaign) return res.status(404).json({ error: "Not found" });

  try {
    const board =
      boardId !== undefined || !campaign.boardId
        ? await getBoardById(companyId, boardId ?? campaign.boardId)
        : await getBoardById(companyId, campaign.boardId);

    const normalizedColumns = normalizeColumns(board.columns);
    const nextBoardColumn =
      boardColumn !== undefined
        ? (normalizedColumns.includes(boardColumn) ? boardColumn : "Sem Categoria")
        : (normalizedColumns.includes(campaign.boardColumn) ? campaign.boardColumn : "Sem Categoria");

    await campaign.update({
      name: name ?? campaign.name,
      whatsappId: whatsappId !== undefined ? whatsappId : campaign.whatsappId,
      isActive: isActive !== undefined ? isActive : campaign.isActive,
      sourceType: sourceType ?? campaign.sourceType,
      boardId: board.id,
      boardColumn: nextBoardColumn,
    });

    if (Array.isArray(stages)) {
      await FollowUpStage.destroy({ where: { followUpCampaignId: campaign.id } });
      if (stages.length) {
        await FollowUpStage.bulkCreate(
          stages.map((s, idx) => ({
            followUpCampaignId: campaign.id,
            order: s.order ?? idx + 1,
            delayMinutes: s.delayMinutes ?? 60,
            messageType: s.messageType ?? "text",
            message: s.message ?? "",
            mediaUrl: s.mediaUrl ?? null,
            mediaType: s.mediaType ?? null,
            mediaCaption: s.mediaCaption ?? null,
            buttons: s.buttons ?? null,
            isActive: s.isActive !== undefined ? s.isActive : true,
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

    return res.json(updated);
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

  const activeStages = Array.isArray(stages)
    ? [...stages]
        .filter((stage) => stage?.isActive !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

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
