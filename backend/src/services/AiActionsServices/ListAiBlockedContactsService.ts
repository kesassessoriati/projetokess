import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import PipelineStage from "../../models/PipelineStage";

export interface AiBlockedContactItem {
  contactId: number;
  contactName: string;
  contactNumber: string;
  aiBlockMode: string;
  aiBlockedUntil: Date | null;
  aiBlockedByStageId: number | null;
  stageName?: string;
  ticketId?: number;
  ticketStatus?: string;
  updatedAt: Date;
}

const ListAiBlockedContactsService = async (
  companyId: number,
  filters?: { blockMode?: string; stageId?: number; search?: string }
): Promise<AiBlockedContactItem[]> => {
  const where: any = {
    companyId,
    aiBlockMode: { [Op.not]: null }
  };

  if (filters?.blockMode) {
    where.aiBlockMode = filters.blockMode;
  }

  if (filters?.stageId) {
    where.aiBlockedByStageId = filters.stageId;
  }

  if (filters?.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${filters.search}%` } },
      { number: { [Op.iLike]: `%${filters.search}%` } }
    ];
  }

  const contacts = await Contact.findAll({
    where,
    attributes: [
      "id", "name", "number",
      "aiBlockMode", "aiBlockedUntil", "aiBlockedByStageId", "updatedAt"
    ],
    order: [["updatedAt", "DESC"]],
    limit: 200
  });

  const result: AiBlockedContactItem[] = [];

  for (const c of contacts) {
    // Expirar automaticamente bloqueios pause_until vencidos
    if (c.aiBlockMode === "pause_until" && c.aiBlockedUntil && new Date(c.aiBlockedUntil) < new Date()) {
      await c.update({ aiBlockMode: null, aiBlockedUntil: null, aiBlockedByStageId: null });
      continue;
    }

    let stageName: string | undefined;
    if (c.aiBlockedByStageId) {
      const stage = await PipelineStage.findOne({
        where: { id: c.aiBlockedByStageId },
        attributes: ["id", "name"]
      });
      stageName = stage?.name;
    }

    const lastTicket = await Ticket.findOne({
      where: { contactId: c.id, companyId, status: { [Op.in]: ["open", "pending"] } },
      attributes: ["id", "status"],
      order: [["updatedAt", "DESC"]]
    });

    result.push({
      contactId: c.id,
      contactName: c.name,
      contactNumber: c.number,
      aiBlockMode: c.aiBlockMode,
      aiBlockedUntil: c.aiBlockedUntil,
      aiBlockedByStageId: c.aiBlockedByStageId,
      stageName,
      ticketId: lastTicket?.id,
      ticketStatus: lastTicket?.status,
      updatedAt: c.updatedAt
    });
  }

  return result;
};

export default ListAiBlockedContactsService;
