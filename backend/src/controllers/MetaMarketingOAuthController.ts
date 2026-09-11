import { Request, Response } from "express";
import AppError from "../errors/AppError";
import {
  completeMetaMarketingAuthorization,
  createMetaMarketingAuthorization,
  deleteMetaMarketingUserData,
  getMetaMarketingDataDeletionStatus,
  getMetaMarketingPublicBaseUrl,
  getSignedRequestMetaUserId,
  revokeMetaMarketingConnections
} from "../services/MetaMarketingServices/MetaMarketingOAuthService";
import { verifyMetaMarketingSignedRequest } from "../helpers/metaMarketingSignedRequest";
import {
  confirmMetaMarketingAccounts,
  disconnectMetaMarketingConnection,
  listMetaMarketingAvailableAccounts,
  listMetaMarketingConnections
} from "../services/MetaMarketingServices/MetaMarketingAccountService";

const queryValue = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const connectionIdFromRequest = (req: Request): number => {
  const connectionId = Number(req.params.connectionId);
  if (!Number.isSafeInteger(connectionId) || connectionId <= 0) {
    throw new AppError("META_MARKETING_CONNECTION_NOT_FOUND", 404);
  }
  return connectionId;
};

const oauthResult = (res: Response, success: boolean): Response => {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    return res.status(success ? 200 : 400).json({ ok: success });
  }

  try {
    const destination = new URL("/meta-marketing", frontendUrl);
    destination.searchParams.set("oauth", success ? "connected" : "failed");
    return res.redirect(destination.toString());
  } catch (_) {
    return res.status(success ? 200 : 400).json({ ok: success });
  }
};

export const start = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  if (!Number.isSafeInteger(userId) || userId <= 0 || !req.user.companyId) {
    throw new AppError("META_MARKETING_CONNECTION_FORBIDDEN", 403);
  }

  const result = await createMetaMarketingAuthorization({
    companyId: req.user.companyId,
    userId
  });
  return res.status(201).json(result);
};

export const callback = async (req: Request, res: Response): Promise<Response> => {
  const code = queryValue(req.query.code);
  const state = queryValue(req.query.state);
  if (!code || !state) {
    return oauthResult(res, false);
  }

  try {
    await completeMetaMarketingAuthorization({ code, state });
    return oauthResult(res, true);
  } catch (_) {
    return oauthResult(res, false);
  }
};

export const deauthorize = async (req: Request, res: Response): Promise<Response> => {
  const payload = verifyMetaMarketingSignedRequest(req.body?.signed_request);
  await revokeMetaMarketingConnections(getSignedRequestMetaUserId(payload));
  return res.status(200).json({ success: true });
};

export const dataDeletion = async (req: Request, res: Response): Promise<Response> => {
  const payload = verifyMetaMarketingSignedRequest(req.body?.signed_request);
  const publicBaseUrl = getMetaMarketingPublicBaseUrl();
  const confirmationCode = await deleteMetaMarketingUserData(getSignedRequestMetaUserId(payload));
  const statusUrl = `${publicBaseUrl}/meta-marketing/data-deletion/${confirmationCode}`;
  return res.status(200).json({ url: statusUrl, confirmation_code: confirmationCode });
};

export const dataDeletionStatus = async (req: Request, res: Response): Promise<Response> => {
  const confirmationCode = queryValue(req.params.confirmationCode);
  if (!confirmationCode) {
    return res.status(404).json({ status: "not_found" });
  }

  const status = await getMetaMarketingDataDeletionStatus(confirmationCode);
  return res.status(status ? 200 : 404).json({ status: status || "not_found" });
};

export const listConnections = async (req: Request, res: Response): Promise<Response> => {
  const connections = await listMetaMarketingConnections({
    companyId: req.user.companyId,
    userId: Number(req.user.id)
  });
  return res.json(connections);
};

export const listAvailableAccounts = async (req: Request, res: Response): Promise<Response> => {
  const accounts = await listMetaMarketingAvailableAccounts({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    connectionId: connectionIdFromRequest(req)
  });
  return res.json(accounts);
};

export const confirmAccounts = async (req: Request, res: Response): Promise<Response> => {
  const accounts = await confirmMetaMarketingAccounts({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    connectionId: connectionIdFromRequest(req),
    accountIds: req.body?.accountIds
  });
  return res.status(201).json(accounts);
};

export const disconnect = async (req: Request, res: Response): Promise<Response> => {
  await disconnectMetaMarketingConnection({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    connectionId: connectionIdFromRequest(req)
  });
  return res.status(204).send();
};
