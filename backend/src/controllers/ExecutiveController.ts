import { Request, Response } from "express";

import AppError from "../errors/AppError";
import GetExecutiveDashboardService from "../services/PipelineServices/GetExecutiveDashboardService";
import UpdateSettingService from "../services/SettingServices/UpdateSettingService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile, id } = req.user;
  const { period, dateFrom, dateTo, pipelineId, reportUserId } =
    req.query as Record<string, string>;

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

export const updateGoals = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, profile } = req.user;

  if (profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const {
    value = {},
    meetingsScheduled = {},
    meetingsCompleted = {},
    conversions = {},
    sellerTargets = []
  } = req.body as {
    value?: { global?: number | string; team?: number | string };
    meetingsScheduled?: { global?: number | string; team?: number | string };
    meetingsCompleted?: { global?: number | string; team?: number | string };
    conversions?: { global?: number | string; team?: number | string };
    sellerTargets?: Array<{
      userId: number;
      valueTarget?: number | string;
      meetingsScheduledTarget?: number | string;
      meetingsCompletedTarget?: number | string;
      conversionsTarget?: number | string;
    }>;
  };

  const upserts: Array<Promise<any>> = [];

  const registerGoal = (key: string, rawValue?: number | string) => {
    if (rawValue === undefined) return;
    upserts.push(
      UpdateSettingService({
        key,
        value: String(Number(rawValue || 0)),
        companyId
      })
    );
  };

  registerGoal("executive_goal_global", value.global);
  registerGoal("executive_goal", value.global);
  registerGoal("executive_goal_team", value.team);
  registerGoal(
    "executive_goal_meetings_scheduled_global",
    meetingsScheduled.global
  );
  registerGoal(
    "executive_goal_meetings_scheduled_team",
    meetingsScheduled.team
  );
  registerGoal(
    "executive_goal_meetings_completed_global",
    meetingsCompleted.global
  );
  registerGoal(
    "executive_goal_meetings_completed_team",
    meetingsCompleted.team
  );
  registerGoal("executive_goal_conversions_global", conversions.global);
  registerGoal("executive_goal_conversions_team", conversions.team);

  for (const sellerTarget of sellerTargets) {
    if (!sellerTarget?.userId) continue;

    registerGoal(
      `executive_goal_user_${Number(sellerTarget.userId)}`,
      sellerTarget.valueTarget
    );
    registerGoal(
      `executive_goal_value_user_${Number(sellerTarget.userId)}`,
      sellerTarget.valueTarget
    );
    registerGoal(
      `executive_goal_meetings_scheduled_user_${Number(sellerTarget.userId)}`,
      sellerTarget.meetingsScheduledTarget
    );
    registerGoal(
      `executive_goal_meetings_completed_user_${Number(sellerTarget.userId)}`,
      sellerTarget.meetingsCompletedTarget
    );
    registerGoal(
      `executive_goal_conversions_user_${Number(sellerTarget.userId)}`,
      sellerTarget.conversionsTarget
    );
  }

  await Promise.all(upserts);

  return res.status(200).json({ success: true });
};

export const updatePreferences = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id } = req.user;
  const { highlightedStageIds, pipelineId, metricVisibility } = req.body as {
    highlightedStageIds?: Array<number | string>;
    pipelineId?: number | string;
    metricVisibility?: {
      avgSalesCycle?: boolean;
      winRate?: boolean;
      stageEntries?: boolean;
      monitoredStages?: boolean;
      revenueReal?: boolean;
      revenueForecast?: boolean;
      revenueGap?: boolean;
    };
  };
  const updates: Array<Promise<any>> = [];

  if (Array.isArray(highlightedStageIds)) {
    const normalizedIds = highlightedStageIds
      .map(item => Number(item))
      .filter(item => Number.isFinite(item))
      .slice(0, 4);

    updates.push(
      UpdateSettingService({
        key: pipelineId
          ? `executive_stage_highlights_user_${Number(id)}_pipeline_${Number(pipelineId)}`
          : `executive_stage_highlights_user_${Number(id)}`,
        value: JSON.stringify(normalizedIds),
        companyId
      })
    );
  }

  if (metricVisibility) {
    updates.push(
      UpdateSettingService({
        key: `executive_dashboard_metrics_user_${Number(id)}`,
        value: JSON.stringify({
          avgSalesCycle: Boolean(metricVisibility.avgSalesCycle),
          winRate: Boolean(metricVisibility.winRate),
          stageEntries: Boolean(metricVisibility.stageEntries),
          monitoredStages: Boolean(metricVisibility.monitoredStages),
          revenueReal: Boolean(metricVisibility.revenueReal),
          revenueForecast: Boolean(metricVisibility.revenueForecast),
          revenueGap: Boolean(metricVisibility.revenueGap)
        }),
        companyId
      })
    );
  }

  await Promise.all(updates);

  return res.status(200).json({ success: true });
};
