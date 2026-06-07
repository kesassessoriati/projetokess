import { Op } from "sequelize";
import InternalAgentMemory from "../../models/InternalAgentMemory";

const getMemories = async (
  companyId: number,
  contactId: number,
  promptId?: number,
  limit: number = 5
): Promise<InternalAgentMemory[]> => {
  const where: any = {
    companyId,
    contactId,
    [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }]
  };

  if (promptId) {
    where[Op.or as any] = [{ promptId }, { promptId: null }];
  }

  return InternalAgentMemory.findAll({
    where,
    order: [["relevanceScore", "DESC"], ["createdAt", "DESC"]],
    limit
  });
};

const saveMemory = async (params: {
  companyId: number;
  contactId: number;
  promptId?: number;
  sourceTicketId?: number;
  memoryType: "summary" | "preference" | "fact" | "goal";
  content: string;
  relevanceScore?: number;
  expiresAt?: Date;
}): Promise<InternalAgentMemory> => {
  return InternalAgentMemory.create({
    companyId: params.companyId,
    contactId: params.contactId,
    promptId: params.promptId || null,
    sourceTicketId: params.sourceTicketId || null,
    memoryType: params.memoryType,
    content: params.content,
    relevanceScore: params.relevanceScore ?? 1.0,
    expiresAt: params.expiresAt || null
  });
};

const updateRelevance = async (
  memoryId: string,
  relevanceScore: number
): Promise<void> => {
  await InternalAgentMemory.update({ relevanceScore }, { where: { id: memoryId } });
};

const InternalAgentMemoryService = {
  getMemories,
  saveMemory,
  updateRelevance
};

export default InternalAgentMemoryService;
