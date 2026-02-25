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
    const { companyId } = req.user;
    const { stageId, cursor, limit } = req.query;

    const pipelineBoard = await ListPipelineBoardService({
        pipelineId: parseInt(id, 10),
        companyId,
        stageId: stageId ? parseInt(stageId as string, 10) : undefined,
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string, 10) : undefined
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
