import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import authConfig from "../config/auth";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import fs from "fs";
import path from "path";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

export const uploadLoadingImage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new AppError("Token não fornecido", 401);
  }

  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  if (!req.file) {
    throw new AppError("Nenhum arquivo foi enviado", 400);
  }

  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("Empresa não encontrada", 404);
  }

  // Remover imagem antiga se existir
  if (company.loadingImage) {
    const oldImagePath = path.join(
      __dirname,
      "..",
      "..",
      "public",
      `company${companyId}`,
      company.loadingImage
    );
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
  }

  // Salvar novo caminho da imagem
  const fileName = req.file.filename;
  await company.update({ loadingImage: fileName });

  return res.status(200).json({
    message: "Imagem de loading atualizada com sucesso",
    loadingImage: fileName
  });
};

export const removeLoadingImage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new AppError("Token não fornecido", 401);
  }

  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("Empresa não encontrada", 404);
  }

  // Remover imagem se existir
  if (company.loadingImage) {
    const imagePath = path.join(
      __dirname,
      "..",
      "..",
      "public",
      `company${companyId}`,
      company.loadingImage
    );
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    await company.update({ loadingImage: null });
  }

  return res.status(200).json({
    message: "Imagem de loading removida com sucesso"
  });
};
