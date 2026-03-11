import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import authConfig from "../config/auth";

import { getIO } from "../libs/socket";
import ShowUserService from "../services/UserServices/ShowUserService";
import { updateUser } from "../helpers/updateUser";
import { runWithContext } from "../context";
import moment from "moment";
import Company from "../models/Company";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

const isAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  // const check = await verifyHelper();

  // if (!check) {
  //   throw new AppError("ERR_SYSTEM_INVALID", 401);
  // }

  const [, token] = authHeader.split(" ");

  let tokenDecoded: TokenPayload;
  try {
    tokenDecoded = verify(token, authConfig.secret) as TokenPayload;
  } catch (err: any) {
    console.error("Auth error:", err.name, err.message);
    if (err.name === "TokenExpiredError") {
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    } else if (err.name === "JsonWebTokenError") {
      throw new AppError("ERR_INVALID_TOKEN", 401);
    } else {
      throw new AppError(
        "Invalid token. We'll try to assign a new one on next request",
        403
      );
    }
  }

  const { id, profile, companyId } = tokenDecoded;

  updateUser(id, companyId);

  req.user = {
    id,
    profile,
    companyId
  };

  // Verificação de expiração: ignorada para super admins
  if (profile !== "super" && companyId) {
    const company = await Company.findByPk(companyId);
    if (company && company.billing_cycle !== "unlimited" && company.expiration_date) {
      const today = moment().startOf("day");
      const expirationDate = moment(company.expiration_date).startOf("day");

      if (expirationDate.isBefore(today)) {
        throw new AppError("Plano expirado. Entre em contato com o suporte.", 403);
      }
    }
  }

  return runWithContext({ companyId }, () => next());
};

export default isAuth;