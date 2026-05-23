import { Request, Response } from "express";
import AppError from "../errors/AppError";
import ReceiveInternalMessageSyncService from "../services/InternalMessageSync/ReceiveInternalMessageSyncService";
import { isInternalMessageSyncInboundEnabled } from "../services/InternalMessageSync/featureFlags";
import { verifyInternalSyncSignature } from "../services/InternalMessageSync/InternalMessageSyncSecurity";

export const inbound = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (!isInternalMessageSyncInboundEnabled()) {
    return res.status(404).json({ status: "disabled" });
  }

  const rawBody = (req as any).rawBody || JSON.stringify(req.body || {});
  const source = String(req.headers["x-internal-sync-source"] || "");
  const timestamp = String(req.headers["x-internal-sync-timestamp"] || "");
  const nonce = String(req.headers["x-internal-sync-nonce"] || "");
  const signature = String(req.headers["x-internal-sync-signature"] || "");

  const peer = await verifyInternalSyncSignature({
    source,
    timestamp,
    nonce,
    signature,
    rawBody
  });

  if (source !== req.body?.source?.serverId) {
    throw new AppError("ERR_INTERNAL_SYNC_SOURCE_MISMATCH", 401);
  }

  const result = await ReceiveInternalMessageSyncService({
    payload: req.body,
    peer,
    nonce
  });

  return res.status(200).json(result);
};
