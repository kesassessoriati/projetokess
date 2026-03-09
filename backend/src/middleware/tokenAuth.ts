import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import CompanyApiKey from "../models/CompanyApiKey";
import { runWithContext } from "../context";

const isAuthApi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const [, token] = authHeader.split(" ");
  try {
    const whatsapp = await Whatsapp.findOne({ where: { token } });

    if (whatsapp?.token === token) {
      return runWithContext({ companyId: whatsapp.companyId }, () => next());
    }

    const companyApiKey = await CompanyApiKey.findOne({
      where: { token, active: true }
    });

    if (!companyApiKey) {
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    }

    return runWithContext({ companyId: companyApiKey.companyId }, () => next());
  } catch (err) {
    throw new AppError(
      "Invalid token. We'll try to assign a new one on next request",
      403
    );
  }

};

export default isAuthApi;
