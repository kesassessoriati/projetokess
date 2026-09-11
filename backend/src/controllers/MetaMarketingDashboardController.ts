import { Request, Response } from "express";
import AppError from "../errors/AppError";
import { getMetaMarketingDashboard } from "../services/MetaMarketingServices/MetaMarketingDashboardService";

const optionalPositiveInteger = (value: unknown): number | undefined => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new AppError("META_MARKETING_FILTER_INVALID", 400);
  return parsed;
};

const requiredDate = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) throw new AppError("META_MARKETING_PERIOD_INVALID", 400);
  return value;
};

export const dashboard = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  if (!Number.isSafeInteger(userId) || userId <= 0 || !req.user.companyId) {
    throw new AppError("META_MARKETING_CONNECTION_FORBIDDEN", 403);
  }

  const data = await getMetaMarketingDashboard({
    companyId: req.user.companyId,
    userId,
    periodStart: requiredDate(req.query.periodStart),
    periodEnd: requiredDate(req.query.periodEnd),
    adAccountId: optionalPositiveInteger(req.query.adAccountId),
    campaignId: optionalPositiveInteger(req.query.campaignId),
    crmClientId: optionalPositiveInteger(req.query.crmClientId)
  });
  return res.json(data);
};
