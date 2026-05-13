import { Request, Response } from "express";
import {
  listAiExternalFollowUpLeads,
  markLeadForAiExternalFollowUp,
  processAiExternalFollowUps
} from "../services/AiExternalFollowUpServices/AiExternalFollowUpService";

const scope = (req: Request) => ({
  companyId: Number(req.user.companyId)
});

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  const { pageNumber } = req.query as Record<string, string>;
  return res.json(await listAiExternalFollowUpLeads({ companyId, pageNumber }));
};

export const mark = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  return res.json(await markLeadForAiExternalFollowUp({
    companyId,
    leadId: req.body.leadId ? Number(req.body.leadId) : undefined,
    accessId: req.body.accessId,
    phone: req.body.phone
  }));
};

export const process = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = scope(req);
  return res.json(await processAiExternalFollowUps({ companyId }));
};
