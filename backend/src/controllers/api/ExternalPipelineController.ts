import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Opportunity from "../../models/Opportunity";
import Contact from "../../models/Contact";
import User from "../../models/User";
import CrmLead from "../../models/CrmLead";
import ListPipelineBoardService from "../../services/PipelineServices/ListPipelineBoardService";
import CreateOpportunityService from "../../services/OpportunityServices/CreateOpportunityService";
import ListOpportunitiesService from "../../services/OpportunityServices/ListOpportunitiesService";
import MoveOpportunityService from "../../services/OpportunityServices/MoveOpportunityService";
import triggerExternalWebhook from "../../services/ExternalWebhook/triggerExternalWebhook";

const ensureExternalAuth = (req: Request) => {
  if (!req.externalAuth) {
    throw new AppError("ERR_EXTERNAL_AUTH_REQUIRED", 401);
  }
  return req.externalAuth;
};

// GET /api/external/pipelines
export const listPipelines = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);

  const pipelines = await Pipeline.findAll({
    where: { companyId },
    attributes: ["id", "name", "isDefault", "createdAt", "updatedAt"],
    include: [
      {
        model: PipelineStage,
        as: "stages",
        attributes: ["id", "name", "order", "color"],
        order: [["order", "ASC"]]
      }
    ],
    order: [["name", "ASC"]]
  });

  return res.json({ pipelines });
};

// GET /api/external/pipelines/:id/board
export const getPipelineBoard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const { id } = req.params;
  const { stageId, cursor, limit, sort } = req.query as any;

  const board = await ListPipelineBoardService({
    pipelineId: Number(id),
    companyId,
    stageId: stageId ? Number(stageId) : undefined,
    cursor,
    limit: limit ? Number(limit) : 50,
    sort: sort || "CREATED_AT"
  });

  return res.json(board);
};

// GET /api/external/opportunities
export const listOpportunities = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const { pipelineId, stageId, contactId } = req.query as any;

  const opportunities = await ListOpportunitiesService({
    companyId,
    pipelineId: pipelineId ? Number(pipelineId) : undefined,
    contactId: contactId ? Number(contactId) : undefined
  });

  // Filter by stageId if provided (ListOpportunitiesService doesn't support it natively)
  const result = stageId
    ? opportunities.filter(o => o.stageId === Number(stageId))
    : opportunities;

  return res.json({ opportunities: result, count: result.length });
};

// GET /api/external/opportunities/:id
export const showOpportunity = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = ensureExternalAuth(req);
  const { id } = req.params;

  const opportunity = await Opportunity.findOne({
    where: { id: Number(id), companyId },
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name", "number", "profilePicUrl"] },
      { model: User, as: "assignedUser", attributes: ["id", "name"] },
      { model: PipelineStage, as: "stage", attributes: ["id", "name", "color"] },
      { model: CrmLead, as: "lead", attributes: ["id", "name", "status", "temperature"] }
    ]
  });

  if (!opportunity) {
    throw new AppError("ERR_OPPORTUNITY_NOT_FOUND", 404);
  }

  return res.json(opportunity);
};

// POST /api/external/opportunities
export const createOpportunity = async (req: Request, res: Response): Promise<Response> => {
  const externalAuth = ensureExternalAuth(req);
  const { pipelineId, stageId, title, value, contactId, leadId, assignedUserId } = req.body;

  if (!pipelineId || !stageId || !title) {
    throw new AppError("ERR_OPPORTUNITY_FIELDS_REQUIRED", 400);
  }

  const opportunity = await CreateOpportunityService({
    companyId: externalAuth.companyId,
    pipelineId: Number(pipelineId),
    stageId: Number(stageId),
    title,
    value: value ? Number(value) : 0,
    contactId: contactId ? Number(contactId) : undefined,
    leadId: leadId ? Number(leadId) : undefined,
    assignedUserId: assignedUserId ? Number(assignedUserId) : undefined
  });

  await triggerExternalWebhook({
    url: externalAuth.webhookUrl,
    secret: externalAuth.webhookSecret,
    event: "opportunity.created",
    data: { apiKeyId: externalAuth.apiKeyId, opportunity }
  });

  return res.status(201).json(opportunity);
};

// PUT /api/external/opportunities/:id
export const updateOpportunity = async (req: Request, res: Response): Promise<Response> => {
  const externalAuth = ensureExternalAuth(req);
  const { id } = req.params;
  const { title, value, assignedUserId, stageId } = req.body;

  const opportunity = await Opportunity.findOne({
    where: { id: Number(id), companyId: externalAuth.companyId }
  });

  if (!opportunity) {
    throw new AppError("ERR_OPPORTUNITY_NOT_FOUND", 404);
  }

  const updatePayload: Record<string, any> = {};
  if (title !== undefined) updatePayload.title = title;
  if (value !== undefined) updatePayload.value = Number(value);
  if (assignedUserId !== undefined) updatePayload.assignedUserId = assignedUserId ? Number(assignedUserId) : null;

  if (Object.keys(updatePayload).length > 0) {
    await opportunity.update(updatePayload);
  }

  // Use MoveOpportunityService if stageId changed
  if (stageId !== undefined && Number(stageId) !== opportunity.stageId) {
    await MoveOpportunityService({
      opportunityId: opportunity.id,
      toStageId: Number(stageId),
      companyId: externalAuth.companyId,
      movedBy: "USER"
    });
  }

  await opportunity.reload();

  await triggerExternalWebhook({
    url: externalAuth.webhookUrl,
    secret: externalAuth.webhookSecret,
    event: "opportunity.updated",
    data: { apiKeyId: externalAuth.apiKeyId, opportunity }
  });

  return res.json(opportunity);
};

// POST /api/external/opportunities/:id/move
export const moveOpportunity = async (req: Request, res: Response): Promise<Response> => {
  const externalAuth = ensureExternalAuth(req);
  const { id } = req.params;
  const { toStageId, reason } = req.body;

  if (!toStageId) {
    throw new AppError("ERR_STAGE_REQUIRED", 400);
  }

  const opportunity = await MoveOpportunityService({
    opportunityId: Number(id),
    toStageId: Number(toStageId),
    companyId: externalAuth.companyId,
    movedBy: "USER",
    reason
  });

  await triggerExternalWebhook({
    url: externalAuth.webhookUrl,
    secret: externalAuth.webhookSecret,
    event: "opportunity.moved",
    data: { apiKeyId: externalAuth.apiKeyId, opportunity }
  });

  return res.json(opportunity);
};
