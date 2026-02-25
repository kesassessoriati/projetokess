import { Request, Response } from "express";
import GetExecutiveDashboardService from "../services/PipelineServices/GetExecutiveDashboardService";

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;

    const data = await GetExecutiveDashboardService.execute(companyId);

    return res.status(200).json(data);
};
