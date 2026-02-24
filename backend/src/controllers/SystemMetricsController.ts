import { Request, Response } from "express";
import GetSystemMetricsService from "../services/SystemMetricsServices/GetSystemMetricsService";

export const index = async (req: Request, res: Response): Promise<Response> => {
    if (!(req as any).user || !(req as any).user.super) {
        return res.status(403).json({ error: "Permissão negada" });
    }

    const metrics = await GetSystemMetricsService();

    return res.json(metrics);
};
