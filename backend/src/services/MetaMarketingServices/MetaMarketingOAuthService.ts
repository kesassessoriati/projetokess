import axios from "axios";
import crypto from "crypto";
import { Op, Transaction } from "sequelize";
import AppError from "../../errors/AppError";
import { encryptMetaMarketingSecret, getMetaMarketingCurrentKeyVersion } from "../../helpers/metaMarketingCrypto";
import MetaMarketingAuditLog from "../../models/MetaMarketingAuditLog";
import MetaMarketingConnection from "../../models/MetaMarketingConnection";
import MetaMarketingDataDeletionRequest from "../../models/MetaMarketingDataDeletionRequest";
import MetaMarketingUserPermission from "../../models/MetaMarketingUserPermission";
import MetaOAuthState from "../../models/MetaOAuthState";
import CompaniesSettings from "../../models/CompaniesSettings";

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;
const META_SCOPES = ["ads_read", "ads_management"];

export type MetaOAuthConfig = {
  appId: string;
  appSecret: string;
  graphVersion: string;
  loginForBusinessConfigId: string;
  redirectUri: string;
};

type MetaTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

const hashValue = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const metaUserHash = (metaUserId: string): string => hashValue(`meta-user:${metaUserId}`);

export const isMetaMarketingOAuthStateValid = (
  state: { expiresAt: Date; consumedAt?: Date | null },
  now = new Date()
): boolean => !state.consumedAt && state.expiresAt.getTime() > now.getTime();

export const hasMetaMarketingReadScope = (scopes: string[]): boolean => scopes.includes("ads_read");

const parseUserId = (value: string | number | undefined): string => {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new AppError("META_MARKETING_SIGNED_REQUEST_INVALID", 400);
  }
  return String(value);
};

export const getMetaMarketingOAuthConfig = (): MetaOAuthConfig => {
  const appId = process.env.META_MARKETING_APP_ID;
  const appSecret = process.env.META_MARKETING_APP_SECRET;
  const graphVersion = process.env.META_MARKETING_GRAPH_VERSION;
  const loginForBusinessConfigId = process.env.META_MARKETING_LOGIN_FOR_BUSINESS_CONFIG_ID;
  const redirectUri = process.env.META_MARKETING_OAUTH_REDIRECT_URI;

  if (!appId || !appSecret || !graphVersion || !loginForBusinessConfigId || !redirectUri) {
    throw new AppError("META_MARKETING_OAUTH_NOT_CONFIGURED", 503);
  }
  getMetaMarketingGraphVersion();

  try {
    new URL(redirectUri);
  } catch (_) {
    throw new AppError("META_MARKETING_OAUTH_REDIRECT_URI_INVALID", 503);
  }

  return { appId, appSecret, graphVersion, loginForBusinessConfigId, redirectUri };
};

export const getMetaMarketingGraphVersion = (): string => {
  const graphVersion = process.env.META_MARKETING_GRAPH_VERSION;
  if (!graphVersion || !/^v\d+\.\d+$/.test(graphVersion)) {
    throw new AppError("META_MARKETING_GRAPH_VERSION_INVALID", 503);
  }
  return graphVersion;
};

export const assertCanManageMetaMarketingConnection = async (
  companyId: number,
  userId: number
): Promise<void> => {
  const [settings, permission] = await Promise.all([
    CompaniesSettings.findOne({ where: { companyId }, attributes: ["metaMarketingReadEnabled"] }),
    MetaMarketingUserPermission.findOne({
      where: { companyId, userId, canManageConnection: true },
      attributes: ["id"]
    })
  ]);

  if (!settings?.metaMarketingReadEnabled) {
    throw new AppError("META_MARKETING_READ_DISABLED", 403);
  }
  if (!permission) {
    throw new AppError("META_MARKETING_CONNECTION_FORBIDDEN", 403);
  }
};

export const assertCanViewMetaMarketingOperations = async (
  companyId: number,
  userId: number
): Promise<void> => {
  const permission = await MetaMarketingUserPermission.findOne({
    where: { companyId, userId, canManageConnection: true },
    attributes: ["id"]
  });
  if (!permission) {
    throw new AppError("META_MARKETING_CONNECTION_FORBIDDEN", 403);
  }
};

export const assertCanCreateMetaMarketingCampaign = async (
  companyId: number,
  userId: number
): Promise<void> => {
  const [settings, permission] = await Promise.all([
    CompaniesSettings.findOne({ where: { companyId }, attributes: ["metaMarketingWriteEnabled"] }),
    MetaMarketingUserPermission.findOne({
      where: { companyId, userId, canCreateCampaign: true },
      attributes: ["id"]
    })
  ]);

  if (!settings?.metaMarketingWriteEnabled) {
    throw new AppError("META_MARKETING_WRITE_DISABLED", 403);
  }
  if (!permission) {
    throw new AppError("META_MARKETING_CAMPAIGN_FORBIDDEN", 403);
  }
};

export const createMetaMarketingAuditLog = async (input: {
  companyId: number;
  actorUserId?: number | null;
  action: string;
  targetType: string;
  targetRef: string;
  metaStatus: string;
  metaRequestId?: string | null;
  transaction?: Transaction;
}): Promise<MetaMarketingAuditLog> =>
  MetaMarketingAuditLog.create({
    companyId: input.companyId,
    actorUserId: input.actorUserId || null,
    action: input.action,
    targetType: input.targetType,
    targetRef: input.targetRef,
    metaStatus: input.metaStatus,
    metaRequestId: input.metaRequestId || null,
    payloadHash: hashValue([input.action, input.targetType, input.targetRef, input.metaStatus].join(":"))
  }, { transaction: input.transaction });

const getLongLivedToken = async (code: string, config: MetaOAuthConfig): Promise<MetaTokenResponse> => {
  const tokenUrl = `https://graph.facebook.com/${config.graphVersion}/oauth/access_token`;

  try {
    const authorization = await axios.get<MetaTokenResponse>(tokenUrl, {
      timeout: 15000,
      params: {
        client_id: config.appId,
        client_secret: config.appSecret,
        redirect_uri: config.redirectUri,
        code
      }
    });
    if (!authorization.data.access_token) {
      throw new Error("missing token");
    }

    const longLived = await axios.get<MetaTokenResponse>(tokenUrl, {
      timeout: 15000,
      params: {
        grant_type: "fb_exchange_token",
        client_id: config.appId,
        client_secret: config.appSecret,
        fb_exchange_token: authorization.data.access_token
      }
    });
    if (!longLived.data.access_token) {
      throw new Error("missing long-lived token");
    }

    return longLived.data;
  } catch (_) {
    throw new AppError("META_MARKETING_TOKEN_EXCHANGE_FAILED", 502);
  }
};

const getMetaUserId = async (accessToken: string, config: MetaOAuthConfig): Promise<string> => {
  try {
    const response = await axios.get<{ id?: string }>(
      `https://graph.facebook.com/${config.graphVersion}/me`,
      { timeout: 15000, params: { fields: "id" }, headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.data.id) throw new Error("missing Meta user id");
    return String(response.data.id);
  } catch (_) {
    throw new AppError("META_MARKETING_PROFILE_FETCH_FAILED", 502);
  }
};

const getGrantedScopes = async (accessToken: string, config: MetaOAuthConfig): Promise<string[]> => {
  try {
    const response = await axios.get<{ data?: Array<{ permission?: string; status?: string }> }>(
      `https://graph.facebook.com/${config.graphVersion}/me/permissions`,
      { timeout: 15000, headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return (response.data.data || [])
      .filter(permission => permission.status === "granted" && META_SCOPES.includes(permission.permission || ""))
      .map(permission => permission.permission as string);
  } catch (_) {
    throw new AppError("META_MARKETING_PERMISSION_CHECK_FAILED", 502);
  }
};

const toTokenExpiry = (expiresIn: number | undefined): Date | null => {
  const seconds = Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  return new Date(Date.now() + seconds * 1000);
};

export const createMetaMarketingAuthorization = async (input: {
  companyId: number;
  userId: number;
}): Promise<{ authorizationUrl: string; expiresAt: Date }> => {
  await assertCanManageMetaMarketingConnection(input.companyId, input.userId);
  const config = getMetaMarketingOAuthConfig();
  const state = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);
  const oauthState = await MetaOAuthState.create({
    companyId: input.companyId,
    generatedByUserId: input.userId,
    stateHash: hashValue(state),
    expiresAt
  });

  await createMetaMarketingAuditLog({
    companyId: input.companyId,
    actorUserId: input.userId,
    action: "oauth_link_generated",
    targetType: "meta_oauth_state",
    targetRef: String(oauthState.id),
    metaStatus: "link_generated"
  });

  const authorizationUrl = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
  authorizationUrl.search = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    config_id: config.loginForBusinessConfigId,
    scope: META_SCOPES.join(","),
    state
  }).toString();

  return { authorizationUrl: authorizationUrl.toString(), expiresAt };
};

export const completeMetaMarketingAuthorization = async (input: {
  code: string;
  state: string;
}): Promise<void> => {
  const stateHash = hashValue(input.state);
  const oauthState = await MetaOAuthState.findOne({
    where: { stateHash, consumedAt: null, expiresAt: { [Op.gt]: new Date() } }
  });
  if (!oauthState) {
    throw new AppError("META_MARKETING_OAUTH_STATE_INVALID", 400);
  }
  if (!isMetaMarketingOAuthStateValid(oauthState)) {
    throw new AppError("META_MARKETING_OAUTH_STATE_INVALID", 400);
  }

  const [claimedStates] = await MetaOAuthState.update(
    { consumedAt: new Date() },
    { where: { id: oauthState.id, stateHash, consumedAt: null, expiresAt: { [Op.gt]: new Date() } } }
  );
  if (claimedStates !== 1) {
    throw new AppError("META_MARKETING_OAUTH_STATE_INVALID", 400);
  }

  await assertCanManageMetaMarketingConnection(oauthState.companyId, oauthState.generatedByUserId);
  const config = getMetaMarketingOAuthConfig();
  const token = await getLongLivedToken(input.code, config);
  const [metaUserId, scopes] = await Promise.all([
    getMetaUserId(token.access_token as string, config),
    getGrantedScopes(token.access_token as string, config)
  ]);
  if (!hasMetaMarketingReadScope(scopes)) {
    throw new AppError("META_MARKETING_ADS_READ_NOT_GRANTED", 403);
  }
  const connectionValues = {
    companyId: oauthState.companyId,
    authorizedByUserId: oauthState.generatedByUserId,
    metaUserIdHash: metaUserHash(metaUserId),
    accessTokenCiphertext: encryptMetaMarketingSecret(token.access_token as string),
    keyVersion: getMetaMarketingCurrentKeyVersion(),
    tokenExpiresAt: toTokenExpiry(token.expires_in),
    status: "connected",
    scopes
  };
  const existing = await MetaMarketingConnection.findOne({
    where: { companyId: oauthState.companyId, metaUserIdHash: connectionValues.metaUserIdHash }
  });
  const connection = existing
    ? await existing.update(connectionValues)
    : await MetaMarketingConnection.create(connectionValues);

  await createMetaMarketingAuditLog({
    companyId: oauthState.companyId,
    actorUserId: oauthState.generatedByUserId,
    action: "oauth_connection_created",
    targetType: "meta_marketing_connection",
    targetRef: String(connection.id),
    metaStatus: "connected"
  });
};

export const revokeMetaMarketingConnections = async (metaUserId: string): Promise<void> => {
  const metaUserIdHash = metaUserHash(metaUserId);
  const connections = await MetaMarketingConnection.findAll({
    where: { metaUserIdHash, status: { [Op.ne]: "revoked" } },
    attributes: ["id", "companyId"]
  });
  if (!connections.length) {
    return;
  }

  await MetaMarketingConnection.update(
    { status: "revoked", accessTokenCiphertext: encryptMetaMarketingSecret("") },
    { where: { metaUserIdHash, status: { [Op.ne]: "revoked" } } }
  );
  await Promise.all(connections.map(connection => createMetaMarketingAuditLog({
    companyId: connection.companyId,
    action: "meta_deauthorized",
    targetType: "meta_marketing_connection",
    targetRef: String(connection.id),
    metaStatus: "revoked"
  })));
};

export const deleteMetaMarketingUserData = async (metaUserId: string): Promise<string> => {
  const metaUserIdHash = metaUserHash(metaUserId);
  const confirmationCode = crypto
    .createHmac("sha256", process.env.META_MARKETING_APP_SECRET || "")
    .update(`data-deletion:${metaUserId}`)
    .digest("hex")
    .slice(0, 48);
  const existingRequest = await MetaMarketingDataDeletionRequest.findOne({
    where: { confirmationCodeHash: hashValue(confirmationCode) }
  });
  if (existingRequest) return confirmationCode;
  const connections = await MetaMarketingConnection.findAll({
    where: { metaUserIdHash },
    attributes: ["id", "companyId"]
  });
  await MetaMarketingConnection.destroy({ where: { metaUserIdHash } });
  await MetaMarketingDataDeletionRequest.create({
    companyId: connections.length === 1 ? connections[0].companyId : null,
    metaUserIdHash,
    confirmationCodeHash: hashValue(confirmationCode),
    status: "completed"
  });
  await Promise.all(connections.map(connection => createMetaMarketingAuditLog({
    companyId: connection.companyId,
    action: "meta_data_deleted",
    targetType: "meta_marketing_connection",
    targetRef: String(connection.id),
    metaStatus: "completed"
  })));

  return confirmationCode;
};

export const getMetaMarketingDataDeletionStatus = async (confirmationCode: string): Promise<string | null> => {
  const request = await MetaMarketingDataDeletionRequest.findOne({
    where: { confirmationCodeHash: hashValue(confirmationCode) },
    attributes: ["status"]
  });
  return request?.status || null;
};

export const getMetaMarketingPublicBaseUrl = (): string => {
  const value = process.env.META_MARKETING_PUBLIC_BASE_URL || process.env.BACKEND_URL;
  if (!value) {
    throw new AppError("META_MARKETING_PUBLIC_BASE_URL_NOT_CONFIGURED", 503);
  }
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch (_) {
    throw new AppError("META_MARKETING_PUBLIC_BASE_URL_INVALID", 503);
  }
};

export const getSignedRequestMetaUserId = (payload: { user_id?: string | number }): string =>
  parseUserId(payload.user_id);
