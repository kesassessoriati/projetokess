import { Request, Response } from "express";
import InternalAgentMemoryService from "../services/InternalAgentServices/InternalAgentMemoryService";
import InternalAgentConversationStateService from "../services/InternalAgentServices/InternalAgentConversationStateService";
import InternalAgentMemory from "../models/InternalAgentMemory";
import InternalAgentConversationState from "../models/InternalAgentConversationState";

export const getContext = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, ticketId, promptId } = req.query;
  const companyId = req.user.companyId;

  if (!contactId) {
    return res.status(400).json({ error: "contactId é obrigatório" });
  }

  const [memories, state] = await Promise.all([
    InternalAgentMemoryService.getMemories(
      companyId,
      Number(contactId),
      promptId ? Number(promptId) : undefined,
      20
    ),
    ticketId
      ? InternalAgentConversationStateService.getActiveState(
          companyId,
          Number(contactId),
          Number(ticketId)
        )
      : Promise.resolve(null)
  ]);

  return res.json({ memories, state });
};

export const saveMemory = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { contactId, promptId, sourceTicketId, memoryType, content, relevanceScore } = req.body;

  if (!contactId || !content || !memoryType) {
    return res.status(400).json({ error: "contactId, memoryType e content são obrigatórios" });
  }

  const memory = await InternalAgentMemoryService.saveMemory({
    companyId,
    contactId: Number(contactId),
    promptId: promptId ? Number(promptId) : undefined,
    sourceTicketId: sourceTicketId ? Number(sourceTicketId) : undefined,
    memoryType,
    content,
    relevanceScore: relevanceScore ? Number(relevanceScore) : 1.0
  });

  return res.status(201).json(memory);
};

export const deleteMemory = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { id } = req.params;

  const memory = await InternalAgentMemory.findOne({ where: { id, companyId } });
  if (!memory) {
    return res.status(404).json({ error: "Memória não encontrada" });
  }

  await memory.destroy();
  return res.json({ ok: true });
};
