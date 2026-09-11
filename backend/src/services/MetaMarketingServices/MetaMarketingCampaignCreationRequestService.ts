import crypto from "crypto";
import { Op } from "sequelize";
import sequelize from "../../database";
import AppError from "../../errors/AppError";
import MetaCampaignCreationRequest from "../../models/MetaCampaignCreationRequest";
import { assertCanCreateMetaMarketingCampaign, createMetaMarketingAuditLog } from "./MetaMarketingOAuthService";
import {
  META_MARKETING_PILOT_TEMPLATE_VERSION,
  MetaMarketingPilotTemplateInput,
  preflightMetaMarketingCampaignPilot,
  ValidMetaMarketingPilotTemplate,
  validateMetaMarketingPilotTemplate
} from "./MetaMarketingCampaignPilotService";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = ["requested", "validating", "creating_campaign", "creating_adset", "creating_ad", "completed", "unknown", "failed"] as const;
type MetaCampaignCreationStatus = typeof statuses[number];

const allowedTransitions: Record<MetaCampaignCreationStatus, MetaCampaignCreationStatus[]> = {
  requested: ["validating", "unknown", "failed"],
  validating: ["creating_campaign", "failed", "unknown"],
  creating_campaign: ["creating_adset", "failed", "unknown"],
  creating_adset: ["creating_ad", "failed", "unknown"],
  creating_ad: ["completed", "failed", "unknown"],
  completed: [],
  unknown: ["creating_campaign", "creating_adset", "creating_ad", "completed", "failed"],
  failed: []
};

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
      result[key] = canonicalize((value as Record<string, unknown>)[key]);
      return result;
    }, {});
  }
  return value;
};

export const hashMetaMarketingCampaignRequestPayload = (input: {
  adAccountId: number;
  template: ValidMetaMarketingPilotTemplate;
}): string => crypto.createHash("sha256").update(JSON.stringify(canonicalize(input))).digest("hex");

const existingOrConflict = async (companyId: number, idempotencyKey: string, payloadHash: string): Promise<MetaCampaignCreationRequest | null> => {
  const existing = await MetaCampaignCreationRequest.findOne({ where: { companyId, idempotencyKey } });
  if (!existing) return null;
  if (existing.payloadHash !== payloadHash) throw new AppError("META_MARKETING_IDEMPOTENCY_CONFLICT", 409);
  return existing;
};

export const requestMetaMarketingCampaignPilot = async (input: {
  companyId: number;
  userId: number;
  adAccountId: number;
  idempotencyKey: string;
  template: MetaMarketingPilotTemplateInput | null | undefined;
}): Promise<{ request: MetaCampaignCreationRequest; created: boolean }> => {
  if (!UUID_PATTERN.test(input.idempotencyKey)) {
    throw new AppError("META_MARKETING_IDEMPOTENCY_KEY_INVALID", 400);
  }
  await assertCanCreateMetaMarketingCampaign(input.companyId, input.userId);
  const template = validateMetaMarketingPilotTemplate(input.template);
  const payloadHash = hashMetaMarketingCampaignRequestPayload({ adAccountId: input.adAccountId, template });
  const existing = await existingOrConflict(input.companyId, input.idempotencyKey, payloadHash);
  if (existing) return { request: existing, created: false };

  await preflightMetaMarketingCampaignPilot(input);
  const values = {
    companyId: input.companyId,
    adAccountId: input.adAccountId,
    requestedByUserId: input.userId,
    templateVersion: META_MARKETING_PILOT_TEMPLATE_VERSION,
    idempotencyKey: input.idempotencyKey,
    payloadHash,
    payload: template,
    status: "requested",
    idempotencyMarker: `kes-mm-${input.idempotencyKey}`
  };
  const request = await sequelize.transaction(async transaction => {
    let created: MetaCampaignCreationRequest;
    try {
      created = await MetaCampaignCreationRequest.create(values, { transaction });
    } catch (error) {
      if ((error as { name?: string }).name === "SequelizeUniqueConstraintError") return null;
      throw error;
    }
    await createMetaMarketingAuditLog({
      companyId: input.companyId,
      actorUserId: input.userId,
      action: "meta_campaign_creation_requested",
      targetType: "meta_campaign_creation_request",
      targetRef: created.id,
      metaStatus: created.status,
      transaction
    });
    return created;
  });
  if (request) return { request, created: true };
  const racedRequest = await existingOrConflict(input.companyId, input.idempotencyKey, payloadHash);
  if (racedRequest) return { request: racedRequest, created: false };
  throw new AppError("META_MARKETING_IDEMPOTENCY_CONFLICT", 409);
};

export const showMetaMarketingCampaignCreationRequest = async (input: {
  companyId: number;
  userId: number;
  requestId: string;
}): Promise<MetaCampaignCreationRequest> => {
  await assertCanCreateMetaMarketingCampaign(input.companyId, input.userId);
  const request = await MetaCampaignCreationRequest.findOne({ where: { id: input.requestId, companyId: input.companyId } });
  if (!request) throw new AppError("META_MARKETING_CREATION_REQUEST_NOT_FOUND", 404);
  return request;
};

export const transitionMetaMarketingCampaignCreationRequest = async (input: {
  request: MetaCampaignCreationRequest;
  toStatus: MetaCampaignCreationStatus;
  actorUserId?: number | null;
  errorCode?: string | null;
  leaseToken?: string;
}): Promise<MetaCampaignCreationRequest> => {
  const fromStatus = input.request.status as MetaCampaignCreationStatus;
  const leaseWhere = input.leaseToken ? {
    executionLeaseToken: input.leaseToken,
    executionLeaseExpiresAt: { [Op.gt]: new Date() }
  } : {};
  if (!statuses.includes(input.toStatus)) throw new AppError("META_MARKETING_CREATION_STATE_INVALID", 400);
  if (fromStatus === input.toStatus) {
    if (input.toStatus !== "unknown" || !input.errorCode) return input.request;
    return sequelize.transaction(async transaction => {
      const [updated] = await MetaCampaignCreationRequest.update({ errorCode: input.errorCode }, {
        where: { id: input.request.id, companyId: input.request.companyId, status: "unknown", ...leaseWhere }, transaction
      });
      if (updated !== 1) throw new AppError("META_MARKETING_CREATION_STATE_TRANSITION_INVALID", 409);
      await createMetaMarketingAuditLog({
        companyId: input.request.companyId,
        actorUserId: input.actorUserId,
        action: "meta_campaign_creation_unknown_to_unknown",
        targetType: "meta_campaign_creation_request",
        targetRef: input.request.id,
        metaStatus: "unknown",
        transaction
      });
      input.request.errorCode = input.errorCode;
      return input.request;
    });
  }
  if (!allowedTransitions[fromStatus]?.includes(input.toStatus)) {
    throw new AppError("META_MARKETING_CREATION_STATE_TRANSITION_INVALID", 409);
  }
  const errorCode = input.toStatus === "failed"
    ? input.errorCode || "META_MARKETING_CREATION_FAILED"
    : input.toStatus === "unknown"
      ? input.errorCode || input.request.errorCode || "META_MARKETING_CREATION_UNKNOWN"
      : null;
  return sequelize.transaction(async transaction => {
    const [updated] = await MetaCampaignCreationRequest.update({ status: input.toStatus, errorCode }, {
      where: { id: input.request.id, companyId: input.request.companyId, status: fromStatus, ...leaseWhere },
      transaction
    });
    if (updated !== 1) throw new AppError("META_MARKETING_CREATION_STATE_TRANSITION_INVALID", 409);
    const request = await MetaCampaignCreationRequest.findOne({
      where: { id: input.request.id, companyId: input.request.companyId }, transaction
    });
    if (!request) throw new AppError("META_MARKETING_CREATION_STATE_TRANSITION_INVALID", 409);
    await createMetaMarketingAuditLog({
      companyId: request.companyId,
      actorUserId: input.actorUserId,
      action: `meta_campaign_creation_${fromStatus}_to_${input.toStatus}`,
      targetType: "meta_campaign_creation_request",
      targetRef: request.id,
      metaStatus: input.toStatus,
      transaction
    });
    return request;
  });
};
