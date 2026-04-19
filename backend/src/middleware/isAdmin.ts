import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";

const isAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  const profile = req.user?.profile;

  if (profile !== "admin" && profile !== "super") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  next();
};

export default isAdmin;
