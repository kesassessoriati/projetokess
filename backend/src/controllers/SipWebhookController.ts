import { Request, Response } from "express";
import ProcessInboundCallService from "../services/ProcessInboundCallService";
import AppError from "../errors/AppError";

const WEBHOOK_TOKEN = process.env.SIP_WEBHOOK_TOKEN || "";

const validateToken = (req: Request): void => {
  if (!WEBHOOK_TOKEN) {
    throw new AppError("SIP_WEBHOOK_TOKEN não configurado no ambiente.", 500);
  }

  const token = req.headers["x-sip-webhook-token"] as string;

  if (!token) {
    throw new AppError("Token de autenticação ausente.", 401);
  }

  if (token !== WEBHOOK_TOKEN) {
    throw new AppError("Token de autenticação inválido.", 401);
  }
};

const validatePayload = (body: any): void => {
  if (!body.event || !body.fromNumber) {
    throw new AppError("event e fromNumber são obrigatórios.", 400);
  }

  if (!body.didNumber && !body.toNumber) {
    throw new AppError("didNumber ou toNumber é obrigatório.", 400);
  }
};

export const handleEvent = async (req: Request, res: Response): Promise<Response> => {
  validateToken(req);
  validatePayload(req.body);

  const result = await ProcessInboundCallService(req.body);

  if (!result.success) {
    return res.status(404).json(result);
  }

  return res.status(200).json(result);
};