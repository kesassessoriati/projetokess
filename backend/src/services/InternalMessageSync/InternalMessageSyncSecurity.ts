import crypto from "crypto";
import AppError from "../../errors/AppError";
import InternalMessageSyncEvent from "../../models/InternalMessageSyncEvent";
import InternalSyncPeer from "../../models/InternalSyncPeer";
import { resolvePeerSecret, signInternalSyncPayload } from "./utils";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export const verifyInternalSyncSignature = async ({
  source,
  timestamp,
  nonce,
  signature,
  rawBody
}: {
  source: string;
  timestamp: string;
  nonce: string;
  signature: string;
  rawBody: string;
}): Promise<InternalSyncPeer> => {
  if (!source || !timestamp || !nonce || !signature || !rawBody) {
    throw new AppError("ERR_INTERNAL_SYNC_AUTH_REQUIRED", 401);
  }

  const requestTime = new Date(timestamp).getTime();
  if (
    !Number.isFinite(requestTime) ||
    Math.abs(Date.now() - requestTime) > MAX_CLOCK_SKEW_MS
  ) {
    throw new AppError("ERR_INTERNAL_SYNC_TIMESTAMP_INVALID", 401);
  }

  const peer = await InternalSyncPeer.findOne({
    where: { publicId: source, status: "active" }
  });

  if (!peer) {
    throw new AppError("ERR_INTERNAL_SYNC_SOURCE_NOT_ALLOWED", 401);
  }

  const replay = await InternalMessageSyncEvent.findOne({
    where: {
      sourceServerId: source,
      nonce,
      direction: "inbound"
    }
  });

  if (replay) {
    throw new AppError("ERR_INTERNAL_SYNC_REPLAY_DETECTED", 409);
  }

  const secret = resolvePeerSecret(peer);
  if (!secret) {
    throw new AppError("ERR_INTERNAL_SYNC_SECRET_NOT_CONFIGURED", 401);
  }

  if (peer.secretHash) {
    const hash = crypto.createHash("sha256").update(secret).digest("hex");
    if (hash !== peer.secretHash) {
      throw new AppError("ERR_INTERNAL_SYNC_SECRET_HASH_MISMATCH", 401);
    }
  }

  const expected = signInternalSyncPayload({
    secret,
    timestamp,
    nonce,
    rawBody
  });
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    throw new AppError("ERR_INTERNAL_SYNC_SIGNATURE_INVALID", 401);
  }

  return peer;
};
