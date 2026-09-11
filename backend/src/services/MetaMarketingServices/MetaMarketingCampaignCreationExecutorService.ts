import crypto from "crypto";
import { Op } from "sequelize";
import sequelize from "../../database";
import AppError from "../../errors/AppError";
import { decryptMetaMarketingSecret } from "../../helpers/metaMarketingCrypto";
import MetaAdAccount from "../../models/MetaAdAccount";
import MetaCampaignCreationRequest from "../../models/MetaCampaignCreationRequest";
import MetaMarketingConnection from "../../models/MetaMarketingConnection";
import {
  createMetaMarketingPausedAd,
  createMetaMarketingPausedAdSet,
  createMetaMarketingPausedCampaign,
  findMetaMarketingObjectByMarker,
  MetaMarketingGraphError
} from "./MetaMarketingGraphClient";
import { ValidMetaMarketingPilotTemplate, validateMetaMarketingPilotTemplate } from "./MetaMarketingCampaignPilotService";
import { transitionMetaMarketingCampaignCreationRequest } from "./MetaMarketingCampaignCreationRequestService";
import { preflightMetaMarketingCampaignPilot } from "./MetaMarketingCampaignPilotService";
import { assertCanCreateMetaMarketingCampaign, createMetaMarketingAuditLog } from "./MetaMarketingOAuthService";

const LEASE_MS = 2 * 60 * 1000;
const executableStatuses = ["requested", "validating", "creating_campaign", "creating_adset", "creating_ad", "unknown"];

const errorCode = (error: unknown): string =>
  error instanceof AppError ? error.message : error instanceof MetaMarketingGraphError ? error.message : "META_MARKETING_CREATION_EXECUTION_FAILED";

const nameWithMarker = (name: string, marker: string): string => `${name.slice(0, 255 - marker.length - 3)} [${marker}]`;

const renewLease = async (request: MetaCampaignCreationRequest, leaseToken: string): Promise<void> => {
  const [updated] = await MetaCampaignCreationRequest.update({
    executionLeaseExpiresAt: new Date(Date.now() + LEASE_MS)
  }, {
    where: {
      id: request.id,
      companyId: request.companyId,
      executionLeaseToken: leaseToken,
      executionLeaseExpiresAt: { [Op.gt]: new Date() }
    }
  });
  if (updated !== 1) throw new AppError("META_MARKETING_CREATION_LEASE_LOST", 409);
};

const persistExternalIds = async (input: {
  request: MetaCampaignCreationRequest;
  leaseToken: string;
  actorUserId: number;
  externalCampaignId?: string;
  externalAdSetId?: string;
  externalAdId?: string;
}): Promise<void> => {
  const externalId = input.externalCampaignId || input.externalAdSetId || input.externalAdId;
  const action = input.externalCampaignId
    ? "meta_campaign_creation_campaign_id_recorded"
    : input.externalAdSetId
      ? "meta_campaign_creation_adset_id_recorded"
      : "meta_campaign_creation_ad_id_recorded";
  await sequelize.transaction(async transaction => {
    const [updated] = await MetaCampaignCreationRequest.update({
      ...(input.externalCampaignId ? { externalCampaignId: input.externalCampaignId } : {}),
      ...(input.externalAdSetId ? { externalAdSetId: input.externalAdSetId } : {}),
      ...(input.externalAdId ? { externalAdId: input.externalAdId } : {})
    }, {
      where: {
        id: input.request.id,
        companyId: input.request.companyId,
        executionLeaseToken: input.leaseToken,
        executionLeaseExpiresAt: { [Op.gt]: new Date() }
      },
      transaction
    });
    if (updated !== 1) throw new AppError("META_MARKETING_CREATION_LEASE_LOST", 409);
    await createMetaMarketingAuditLog({
      companyId: input.request.companyId,
      actorUserId: input.actorUserId,
      action,
      targetType: "meta_campaign_creation_request",
      targetRef: input.request.id,
      metaStatus: input.request.status,
      metaRequestId: externalId,
      transaction
    });
  });
  Object.assign(input.request, {
    ...(input.externalCampaignId ? { externalCampaignId: input.externalCampaignId } : {}),
    ...(input.externalAdSetId ? { externalAdSetId: input.externalAdSetId } : {}),
    ...(input.externalAdId ? { externalAdId: input.externalAdId } : {})
  });
};

const releaseLease = async (request: MetaCampaignCreationRequest, leaseToken: string): Promise<void> => {
  await MetaCampaignCreationRequest.update({ executionLeaseToken: null, executionLeaseExpiresAt: null }, {
    where: { id: request.id, companyId: request.companyId, executionLeaseToken: leaseToken }
  });
};

const reconcileKnownIds = async (input: {
  request: MetaCampaignCreationRequest;
  leaseToken: string;
  actorUserId: number;
  accessToken: string;
  externalAccountId: string;
}): Promise<void> => {
  let campaignId = input.request.externalCampaignId;
  if (!campaignId) {
    await renewLease(input.request, input.leaseToken);
    campaignId = await findMetaMarketingObjectByMarker({ accessToken: input.accessToken, path: `${input.externalAccountId}/campaigns`, marker: input.request.idempotencyMarker });
    if (campaignId) await persistExternalIds({ ...input, externalCampaignId: campaignId });
  }
  let adSetId = input.request.externalAdSetId;
  if (campaignId && !adSetId) {
    await renewLease(input.request, input.leaseToken);
    adSetId = await findMetaMarketingObjectByMarker({ accessToken: input.accessToken, path: `${campaignId}/adsets`, marker: input.request.idempotencyMarker });
    if (adSetId) await persistExternalIds({ ...input, externalAdSetId: adSetId });
  }
  if (adSetId && !input.request.externalAdId) {
    await renewLease(input.request, input.leaseToken);
    const adId = await findMetaMarketingObjectByMarker({ accessToken: input.accessToken, path: `${adSetId}/ads`, marker: input.request.idempotencyMarker });
    if (adId) await persistExternalIds({ ...input, externalAdId: adId });
  }
};

const recoverState = async (request: MetaCampaignCreationRequest, leaseToken: string, actorUserId: number): Promise<MetaCampaignCreationRequest> => {
  if (request.status !== "unknown") return request;
  if (request.externalAdId) return transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "completed", actorUserId, leaseToken });
  if (request.externalAdSetId) return transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "creating_ad", actorUserId, leaseToken });
  if (request.externalCampaignId) return transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "creating_adset", actorUserId, leaseToken });
  return transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "creating_campaign", actorUserId, leaseToken });
};

export const executeMetaMarketingCampaignCreationRequest = async (input: {
  companyId: number;
  requestId: string;
  actorUserId?: number;
}): Promise<MetaCampaignCreationRequest> => {
  let request = await MetaCampaignCreationRequest.findOne({ where: { id: input.requestId, companyId: input.companyId } });
  if (!request) throw new AppError("META_MARKETING_CREATION_REQUEST_NOT_FOUND", 404);
  const actorUserId = input.actorUserId || request.requestedByUserId;
  await assertCanCreateMetaMarketingCampaign(input.companyId, actorUserId);
  if (request.status === "completed") return request;
  if (!executableStatuses.includes(request.status)) throw new AppError("META_MARKETING_CREATION_REQUEST_NOT_EXECUTABLE", 409);

  const leaseToken = crypto.randomBytes(24).toString("hex");
  const now = new Date();
  const [claimed] = await MetaCampaignCreationRequest.update({
    executionLeaseToken: leaseToken,
    executionLeaseExpiresAt: new Date(now.getTime() + LEASE_MS)
  }, {
    where: {
      id: request.id,
      companyId: input.companyId,
      status: { [Op.in]: executableStatuses },
      [Op.or]: [{ executionLeaseExpiresAt: null }, { executionLeaseExpiresAt: { [Op.lt]: now } }]
    }
  });
  if (claimed !== 1) throw new AppError("META_MARKETING_CREATION_IN_PROGRESS", 409);

  let writeStarted = false;
  let connection: MetaMarketingConnection | null = null;
  try {
    request = await MetaCampaignCreationRequest.findOne({ where: { id: request.id, companyId: input.companyId } });
    if (!request) throw new AppError("META_MARKETING_CREATION_REQUEST_NOT_FOUND", 404);
    const template = validateMetaMarketingPilotTemplate(request.payload as ValidMetaMarketingPilotTemplate);
    await renewLease(request, leaseToken);
    await preflightMetaMarketingCampaignPilot({
      companyId: input.companyId,
      userId: actorUserId,
      adAccountId: request.adAccountId,
      template
    });
    const account = await MetaAdAccount.findOne({ where: { id: request.adAccountId, companyId: input.companyId, status: "active" } });
    if (!account) throw new AppError("META_MARKETING_AD_ACCOUNT_NOT_FOUND", 404);
    connection = await MetaMarketingConnection.findOne({ where: { id: account.connectionId, companyId: input.companyId, status: "connected" } });
    if (!connection) throw new AppError("META_MARKETING_ADS_MANAGEMENT_REQUIRED", 409);
    let accessToken: string;
    try {
      accessToken = decryptMetaMarketingSecret(connection.accessTokenCiphertext);
    } catch (_) {
      await connection.update({ status: "reauthorization_required" });
      throw new AppError("META_MARKETING_REAUTHORIZATION_REQUIRED", 409);
    }

    await reconcileKnownIds({ request, leaseToken, actorUserId, accessToken, externalAccountId: account.externalAccountId });
    request = await recoverState(request, leaseToken, actorUserId);
    if (request.status === "completed") return request;
    if (request.status === "requested") request = await transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "validating", actorUserId, leaseToken });
    if (request.status === "validating") request = await transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "creating_campaign", actorUserId, leaseToken });

    if (!request.externalCampaignId) {
      await renewLease(request, leaseToken);
      writeStarted = true;
      const externalCampaignId = await createMetaMarketingPausedCampaign({
        accessToken, externalAccountId: account.externalAccountId,
        name: nameWithMarker(template.campaignName, request.idempotencyMarker), specialAdCategories: template.specialAdCategories
      });
      await persistExternalIds({ request, leaseToken, actorUserId, externalCampaignId });
    }
    if (request.status !== "creating_adset") request = await transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "creating_adset", actorUserId, leaseToken });

    if (!request.externalAdSetId) {
      await renewLease(request, leaseToken);
      writeStarted = true;
      const externalAdSetId = await createMetaMarketingPausedAdSet({
        accessToken, externalAccountId: account.externalAccountId, campaignId: request.externalCampaignId,
        name: nameWithMarker(template.adSetName, request.idempotencyMarker), dailyBudgetMinor: template.dailyBudgetMinor,
        pageId: template.pageId, pixelId: template.pixelId, countries: template.targeting.countries,
        ageMin: template.targeting.ageMin, ageMax: template.targeting.ageMax, publisherPlatforms: template.placements.publisherPlatforms
      });
      await persistExternalIds({ request, leaseToken, actorUserId, externalAdSetId });
    }
    if (request.status !== "creating_ad") request = await transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "creating_ad", actorUserId, leaseToken });

    if (!request.externalAdId) {
      await renewLease(request, leaseToken);
      writeStarted = true;
      const externalAdId = await createMetaMarketingPausedAd({
        accessToken, externalAccountId: account.externalAccountId, adSetId: request.externalAdSetId,
        creativeId: template.creativeId, name: nameWithMarker(template.adName, request.idempotencyMarker)
      });
      await persistExternalIds({ request, leaseToken, actorUserId, externalAdId });
    }
    return transitionMetaMarketingCampaignCreationRequest({ request, toStatus: "completed", actorUserId, leaseToken });
  } catch (error) {
    if (error instanceof MetaMarketingGraphError && error.kind === "reauthorization_required" && connection) {
      await connection.update({ status: "reauthorization_required" });
    }
    if (request.status !== "failed" && request.status !== "completed") {
      const toStatus = writeStarted || error instanceof MetaMarketingGraphError ? "unknown" : "failed";
      try {
        request = await transitionMetaMarketingCampaignCreationRequest({ request, toStatus, actorUserId: input.actorUserId || request.requestedByUserId, errorCode: errorCode(error), leaseToken });
      } catch (_) {
        // The original execution error remains the useful signal; lease expiry permits reconciliation.
      }
    }
    throw error;
  } finally {
    try {
      await releaseLease(request, leaseToken);
    } catch (_) {
      // Lease expiry remains the recovery path; never mask the creation outcome.
    }
  }
};
