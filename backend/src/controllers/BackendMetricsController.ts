import { Request, Response } from "express";
import GetPerformanceMetricsService from "../services/BackendMetricsServices/GetPerformanceMetricsService";

export const index = async (req: Request, res: Response): Promise<Response> => {
    if (!(req as any).user || !(req as any).user.super) {
        return res.status(403).json({ error: "Permissão negada" });
    }

    const { companyId } = req.query;

    const metrics = await GetPerformanceMetricsService(companyId as string);

    return res.json(metrics);
};
