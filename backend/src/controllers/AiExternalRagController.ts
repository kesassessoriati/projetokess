import { Request, Response } from "express";
import {
  listRagDocuments,
  createRagDocument,
  deleteRagDocument,
  searchRagDocuments
} from "../services/AiExternalRagServices/AiExternalRagServices";

const scope = (req: Request) => ({
  companyId: Number(req.user.companyId),
  userId: Number(req.user.id)
});

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const { base } = req.params;
  const { pageNumber } = req.query as Record<string, string>;
  return res.json(await listRagDocuments({ companyId, base, pageNumber }));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, userId } = scope(req);
  const { base } = req.params;
  return res.status(201).json(await createRagDocument({
    companyId,
    userId,
    base,
    content: req.body.content,
    metadata: req.body.metadata
  }));
};

export const search = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const { base } = req.params;
  return res.json({ results: await searchRagDocuments({
    companyId,
    base,
    query: req.body.query,
    matchCount: Number(req.body.matchCount || 5)
  }) });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const { base, id } = req.params;
  await deleteRagDocument({ companyId, base, id: Number(id) });
  return res.status(200).json({ message: "Documento RAG excluido com sucesso." });
};
