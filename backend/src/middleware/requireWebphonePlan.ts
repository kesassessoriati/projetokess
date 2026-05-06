import { Request, Response, NextFunction } from "express";
import Company from "../models/Company";
import Plan from "../models/Plan";
import AppError from "../errors/AppError";

const requireWebphonePlan = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const { companyId } = req.user;

  if (req.user.profile === "super") {
    return next();
  }

  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan", attributes: ["id", "useWebphone"] }]
  });

  if (!company?.plan?.useWebphone) {
    throw new AppError("ERR_WEBPHONE_PLAN_NOT_ALLOWED", 403);
  }

  return next();
};

export default requireWebphonePlan;
