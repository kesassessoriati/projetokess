import { Request, Response } from "express";
import AppError from "../errors/AppError";
import { preflightMetaMarketingCampaignPilot } from "../services/MetaMarketingServices/MetaMarketingCampaignPilotService";
import { requestMetaMarketingCampaignPilot } from "../services/MetaMarketingServices/MetaMarketingCampaignCreationRequestService";
import { showMetaMarketingCampaignCreationRequest } from "../services/MetaMarketingServices/MetaMarketingCampaignCreationRequestService";
import { executeMetaMarketingCampaignCreationRequest } from "../services/MetaMarketingServices/MetaMarketingCampaignCreationExecutorService";

export const preflight = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  const adAccountId = Number(req.body?.adAccountId);
  if (!req.user.companyId || !Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(adAccountId) || adAccountId <= 0) {
    throw new AppError("META_MARKETING_AD_ACCOUNT_NOT_FOUND", 404);
  }
  return res.json(await preflightMetaMarketingCampaignPilot({ companyId: req.user.companyId, userId, adAccountId, template: req.body?.template }));
};

export const request = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  const adAccountId = Number(req.body?.adAccountId);
  const idempotencyKey = req.get("Idempotency-Key") || "";
  if (!req.user.companyId || !Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(adAccountId) || adAccountId <= 0) {
    throw new AppError("META_MARKETING_AD_ACCOUNT_NOT_FOUND", 404);
  }
  const result = await requestMetaMarketingCampaignPilot({
    companyId: req.user.companyId, userId, adAccountId, idempotencyKey, template: req.body?.template
  });
  return res.status(result.created ? 201 : 200).json({
    id: result.request.id,
    status: result.request.status,
    idempotencyMarker: result.request.idempotencyMarker,
    created: result.created
  });
};

const requestResponse = (request: { id: string; status: string; idempotencyMarker: string; externalCampaignId?: string; externalAdSetId?: string; externalAdId?: string; errorCode?: string }): object => ({
  id: request.id,
  status: request.status,
  idempotencyMarker: request.idempotencyMarker,
  externalCampaignId: request.externalCampaignId || null,
  externalAdSetId: request.externalAdSetId || null,
  externalAdId: request.externalAdId || null,
  errorCode: request.errorCode || null
});

export const show = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  if (!req.user.companyId || !Number.isSafeInteger(userId) || userId <= 0) throw new AppError("META_MARKETING_CREATION_REQUEST_NOT_FOUND", 404);
  return res.json(requestResponse(await showMetaMarketingCampaignCreationRequest({ companyId: req.user.companyId, userId, requestId: req.params.requestId })));
};

export const execute = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  if (!req.user.companyId || !Number.isSafeInteger(userId) || userId <= 0) throw new AppError("META_MARKETING_CREATION_REQUEST_NOT_FOUND", 404);
  return res.json(requestResponse(await executeMetaMarketingCampaignCreationRequest({
    companyId: req.user.companyId,
    requestId: req.params.requestId,
    actorUserId: userId
  })));
};
