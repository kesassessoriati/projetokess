import { Request, Response } from "express";
import CreatePipelineService from "../services/PipelineServices/CreatePipelineService";
import ListPipelineBoardService from "../services/PipelineServices/ListPipelineBoardService";
import GetPipelineMetricsService from "../services/PipelineServices/GetPipelineMetricsService";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { name, isDefault, stages } = req.body;
    const { companyId } = req.user;

    const pipeline = await CreatePipelineService({
        name,
        companyId,
        isDefault,
        stages
    });

    return res.status(200).json(pipeline);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;

    const pipelines = await Pipeline.findAll({
        where: { companyId },
        include: [{ model: PipelineStage, as: "stages" }],
        order: [["name", "ASC"]]
    });

    return res.status(200).json(pipelines);
};

export const board = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId, profile, id: userId } = req.user;
    const {
        stageId,
        cursor,
        limit,
        riskLevel,
        minProbability,
        onlyAI,
        onlyExpired,
        sort
    } = req.query;

    const pipelineBoard = await ListPipelineBoardService({
        pipelineId: parseInt(id, 10),
        companyId,
        stageId: stageId ? parseInt(stageId as string, 10) : undefined,
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        filter: {
            riskLevel: riskLevel as string,
            minProbability: minProbability ? parseFloat(minProbability as string) : undefined,
            onlyAI: onlyAI === "true",
            onlyExpired: onlyExpired === "true"
        },
        sort: sort as any,
        profile,
        userId: Number(userId)
    });

    return res.status(200).json(pipelineBoard);
};

export const metrics = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;

    const pipelineMetrics = await GetPipelineMetricsService({
        pipelineId: parseInt(id, 10),
        companyId
    });

    return res.status(200).json(pipelineMetrics);
};

export const updateStageOrder = async (req: Request, res: Response): Promise<Response> => {
    const { id: pipelineId } = req.params;
    const { stages } = req.body; // Array of { id, order }

    const updates = stages.map((s: any) =>
        PipelineStage.update({ order: s.order }, { where: { id: s.id, pipelineId } })
    );

    await Promise.all(updates);

    return res.status(200).json({ message: "Stages reordered" });
};

export const storeStage = async (req: Request, res: Response): Promise<Response> => {
    const { id: pipelineId } = req.params;
    const { companyId } = req.user;
    const { name, color, order, probability, slaDays } = req.body;

    const stage = await PipelineStage.create({
        pipelineId: parseInt(pipelineId, 10),
        companyId,
        name,
        color,
        order,
        probability,
        slaDays
    });

    return res.status(200).json(stage);
};

export const updateStage = async (req: Request, res: Response): Promise<Response> => {
    const { stageId } = req.params;
    const { companyId } = req.user;
    const { name, color, order, probability, slaDays } = req.body;

    const stage = await PipelineStage.findOne({ where: { id: stageId, companyId } });
    if (!stage) return res.status(404).json({ error: "Stage not found" });

    await stage.update({ name, color, order, probability, slaDays });

    return res.status(200).json(stage);
};

export const deleteStage = async (req: Request, res: Response): Promise<Response> => {
    const { stageId } = req.params;
    const { companyId } = req.user;

    const stage = await PipelineStage.findOne({ where: { id: stageId, companyId } });
    if (!stage) return res.status(404).json({ error: "Stage not found" });

    await stage.destroy();

    return res.status(200).json({ message: "Stage deleted" });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;

    const pipeline = await Pipeline.findOne({
        where: { id, companyId }
    });

    if (!pipeline) {
        return res.status(404).json({ error: "Pipeline not found" });
    }

    const Opportunity = (await import("../models/Opportunity")).default;
    const opportunitiesCount = await Opportunity.count({
        where: { pipelineId: id, companyId }
    });

    if (opportunitiesCount > 0) {
        return res.status(400).json({ error: "Cannot delete pipeline with existing opportunities." });
    }

    await pipeline.destroy();
    return res.status(200).json({ message: "Pipeline deleted successfully" });
};
