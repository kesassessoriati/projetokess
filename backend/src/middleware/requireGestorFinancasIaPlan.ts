import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import Plan from "../models/Plan";

const requireGestorFinancasIaPlan = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.user.profile === "super") {
    return next();
  }

  const company = await Company.findByPk(req.user.companyId, {
    include: [{ model: Plan, as: "plan", attributes: ["id", "gestor_financeiro_ia"] }]
  });

  if (!company?.plan?.gestor_financeiro_ia) {
    throw new AppError("ERR_GESTOR_FINANCEIRO_IA_PLAN_NOT_ALLOWED", 403);
  }

  return next();
};

export default requireGestorFinancasIaPlan;
