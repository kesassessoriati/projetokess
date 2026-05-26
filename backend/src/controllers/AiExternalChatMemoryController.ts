import { Request, Response } from "express";
import AppError from "../errors/AppError";
import {
  deleteChatMemoryById,
  deleteChatMemoryByLead,
  deleteChatMemoryBySession,
  deleteCompanyChatMemory,
  listChatMemory,
  showChatMemory
} from "../services/AiExternalChatMemoryServices/AiExternalChatMemoryService";

const scope = (req: Request) => ({
  companyId: Number(req.user.companyId),
  userId: Number(req.user.id),
  profile: String(req.user.profile || "")
});

const assertCanDelete = (profile: string) => {
  if (!["admin", "super"].includes(profile)) {
    throw new AppError("Usuario sem permissao para excluir Chat Memory.", 403);
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const { search, leadId, sessionId, range, page, limit } = req.query as Record<string, string>;

  const result = await listChatMemory({
    companyId,
    search,
    leadId,
    sessionId,
    range,
    page,
    limit
  });

  return res.json(result);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const { id } = req.params;

  const result = await showChatMemory({
    companyId,
    id: Number(id)
  });

  return res.json(result);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile } = scope(req);
  assertCanDelete(profile);

  const result = await deleteChatMemoryById({
    companyId,
    id: Number(req.params.id)
  });

  return res.status(200).json({ message: "Chat Memory excluido com sucesso.", ...result });
};

export const removeByLead = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile } = scope(req);
  assertCanDelete(profile);

  const result = await deleteChatMemoryByLead({
    companyId,
    leadId: Number(req.params.leadId)
  });

  return res.status(200).json({ message: "Chat Memory do lead excluido com sucesso.", ...result });
};

export const removeBySession = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile } = scope(req);
  assertCanDelete(profile);

  const result = await deleteChatMemoryBySession({
    companyId,
    sessionId: String(req.params.sessionId || "")
  });

  return res.status(200).json({ message: "Chat Memory da sessao excluido com sucesso.", ...result });
};

export const removeCompany = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile } = scope(req);
  assertCanDelete(profile);

  const result = await deleteCompanyChatMemory({
    companyId,
    confirmation: req.body?.confirmation
  });

  return res.status(200).json({ message: "Chat Memory da empresa excluido com sucesso.", ...result });
};
