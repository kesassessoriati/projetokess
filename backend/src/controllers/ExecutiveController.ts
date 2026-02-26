import { Request, Response } from "express";
import GetExecutiveDashboardService from "../services/PipelineServices/GetExecutiveDashboardService";

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, profile, id } = req.user;

    const data = await GetExecutiveDashboardService.execute(companyId, profile, Number(id));

    return res.status(200).json(data);
};
