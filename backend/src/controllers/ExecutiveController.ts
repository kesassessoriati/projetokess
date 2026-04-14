import { Request, Response } from "express";

import AppError from "../errors/AppError";
import GetExecutiveDashboardService from "../services/PipelineServices/GetExecutiveDashboardService";
import UpdateSettingService from "../services/SettingServices/UpdateSettingService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile, id } = req.user;
  const { period, dateFrom, dateTo, pipelineId, reportUserId } = req.query as Record<string, string>;

  const data = await GetExecutiveDashboardService.execute({
    companyId,
    profile,
    userId: Number(id),
    period,
    dateFrom,
    dateTo,
    pipelineId: pipelineId ? Number(pipelineId) : undefined,
    reportUserId: reportUserId ? Number(reportUserId) : undefined
  });

  return res.status(200).json(data);
};

export const updateGoals = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile } = req.user;

  if (profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { globalTarget, teamTarget, sellerTargets = [] } = req.body as {
    globalTarget?: number | string;
    teamTarget?: number | string;
    sellerTargets?: Array<{ userId: number; target: number | string }>;
  };

  if (globalTarget !== undefined) {
    const normalizedGlobal = String(Number(globalTarget || 0));
    await UpdateSettingService({ key: "executive_goal_global", value: normalizedGlobal, companyId });
    await UpdateSettingService({ key: "executive_goal", value: normalizedGlobal, companyId });
  }

  if (teamTarget !== undefined) {
    await UpdateSettingService({
      key: "executive_goal_team",
      value: String(Number(teamTarget || 0)),
      companyId
    });
  }

  for (const sellerTarget of sellerTargets) {
    if (!sellerTarget?.userId) continue;

    await UpdateSettingService({
      key: `executive_goal_user_${Number(sellerTarget.userId)}`,
      value: String(Number(sellerTarget.target || 0)),
      companyId
    });
  }

  return res.status(200).json({ success: true });
};
