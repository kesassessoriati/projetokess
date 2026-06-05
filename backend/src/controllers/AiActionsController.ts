import { Request, Response } from "express";
import ListAiBlockedContactsService from "../services/AiActionsServices/ListAiBlockedContactsService";
import PauseAiForContactService from "../services/AiActionsServices/PauseAiForContactService";
import ResumeAiForContactService from "../services/AiActionsServices/ResumeAiForContactService";
import Contact from "../models/Contact";

const AiActionsController = {
  async status(req: Request, res: Response): Promise<Response> {
    const { companyId } = req.user;
    const { Op } = await import("sequelize");

    const [total, byMode] = await Promise.all([
      Contact.count({
        where: { companyId, aiBlockMode: { [Op.not]: null } }
      }),
      Contact.findAll({
        where: { companyId, aiBlockMode: { [Op.not]: null } },
        attributes: ["aiBlockMode"],
        group: ["aiBlockMode"],
        raw: true
      }) as unknown as Promise<any[]>
    ]);

    const counts: Record<string, number> = {};
    for (const row of byMode as any[]) {
      counts[row.aiBlockMode] = parseInt(row.count || "0", 10);
    }

    return res.json({
      totalBlocked: total,
      byMode: {
        disabled_in_stage: counts["disabled_in_stage"] || 0,
        manual: counts["manual"] || 0,
        manual_until: counts["manual_until"] || 0,
        pause_until: counts["pause_until"] || 0
      }
    });
  },

  async blockedContacts(req: Request, res: Response): Promise<Response> {
    const { companyId } = req.user;
    const { blockMode, stageId, search } = req.query as Record<string, string>;

    const contacts = await ListAiBlockedContactsService(companyId, {
      blockMode: blockMode || undefined,
      stageId: stageId ? Number(stageId) : undefined,
      search: search || undefined
    });

    return res.json(contacts);
  },

  async pause(req: Request, res: Response): Promise<Response> {
    const { companyId } = req.user;
    const { contactId } = req.params;
    const { reason } = req.body;

    await PauseAiForContactService({
      contactId: Number(contactId),
      companyId,
      mode: "manual",
      reason
    });

    return res.json({ success: true });
  },

  async pauseUntil(req: Request, res: Response): Promise<Response> {
    const { companyId } = req.user;
    const { contactId } = req.params;
    const { pauseUntil, reason } = req.body;

    if (!pauseUntil) {
      return res.status(400).json({ error: "pauseUntil obrigatório" });
    }

    await PauseAiForContactService({
      contactId: Number(contactId),
      companyId,
      mode: "manual_until",
      pauseUntil: new Date(pauseUntil),
      reason
    });

    return res.json({ success: true });
  },

  async resume(req: Request, res: Response): Promise<Response> {
    const { companyId } = req.user;
    const { contactId } = req.params;

    await ResumeAiForContactService(Number(contactId), companyId);

    return res.json({ success: true });
  }
};

export default AiActionsController;
