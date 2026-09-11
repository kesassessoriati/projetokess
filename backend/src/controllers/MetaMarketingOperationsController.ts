import { Request, Response } from "express";
import AppError from "../errors/AppError";
import { getMetaMarketingOperations } from "../services/MetaMarketingServices/MetaMarketingOperationsService";

export const show = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  if (!Number.isSafeInteger(userId) || userId <= 0 || !req.user.companyId) {
    throw new AppError("META_MARKETING_CONNECTION_FORBIDDEN", 403);
  }
  return res.json(await getMetaMarketingOperations({ companyId: req.user.companyId, userId }));
};
