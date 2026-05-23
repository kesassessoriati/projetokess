import axios from "axios";
import InternalMessageSyncEvent from "../../models/InternalMessageSyncEvent";
import InternalSyncPeer from "../../models/InternalSyncPeer";
import logger from "../../utils/logger";
import { isInternalMessageSyncOutboundEnabled } from "./featureFlags";
import { InternalMessageSyncPayload } from "./types";
import {
  buildNonce,
  normalizeBaseUrl,
  resolvePeerSecret,
  signInternalSyncPayload
} from "./utils";

const SendInternalMessageSyncService = async ({
  eventId,
  peerId,
  payload
}: {
  eventId: number;
  peerId: number;
  payload: InternalMessageSyncPayload;
}): Promise<void> => {
  if (!isInternalMessageSyncOutboundEnabled()) {
    const event = await InternalMessageSyncEvent.findByPk(eventId);
    if (event) {
      await event.update({
        status: "skipped",
        lastError: "outbound disabled"
      });
    }
    return;
  }

  const event = await InternalMessageSyncEvent.findByPk(eventId);
  const peer = await InternalSyncPeer.findOne({
    where: { id: peerId, status: "active" }
  });

  if (!event || !peer) {
    return;
  }

  const secret = resolvePeerSecret(peer);
  if (!secret) {
    await event.update({
      status: "failed",
      lastError: "peer secret not configured"
    });
    throw new Error("peer secret not configured");
  }

  const rawBody = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const nonce = buildNonce();
  const signature = signInternalSyncPayload({
    secret,
    timestamp,
    nonce,
    rawBody
  });
  const startedAt = Date.now();

  await event.update({
    attempts: event.attempts + 1,
    nonce
  });

  try {
    const response = await axios.post(
      `${normalizeBaseUrl(peer.baseUrl)}/internal/message-sync/inbound`,
      rawBody,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Sync-Id": String(event.id),
          "X-Internal-Sync-Timestamp": timestamp,
          "X-Internal-Sync-Nonce": nonce,
          "X-Internal-Sync-Source": payload.source.serverId,
          "X-Internal-Sync-Signature": signature
        },
        timeout: 10000
      }
    );

    const responseStatus = response.data?.status;
    await event.update({
      status:
        responseStatus === "duplicate" || responseStatus === "skipped"
          ? responseStatus
          : "sent",
      lastError: null
    });

    logger.info(
      {
        wid: payload.message.wid,
        sourceServerId: payload.source.serverId,
        targetServerId: payload.target.serverId,
        sourceCompanyId: payload.source.companyId,
        targetCompanyId: payload.target.companyId,
        sourceWhatsappId: payload.source.whatsappId,
        targetWhatsappId: payload.target.whatsappId,
        status: "sent",
        latencyMs: Date.now() - startedAt,
        attempt: event.attempts + 1
      },
      "[InternalSync] outbound delivered"
    );
  } catch (error) {
    await event.update({
      status: "failed",
      lastError: error?.message || "delivery failed"
    });

    logger.warn(
      {
        wid: payload.message.wid,
        sourceServerId: payload.source.serverId,
        targetServerId: payload.target.serverId,
        status: "failed",
        reason: error?.message,
        latencyMs: Date.now() - startedAt,
        attempt: event.attempts + 1
      },
      "[InternalSync] outbound delivery failed"
    );

    throw error;
  }
};

export default SendInternalMessageSyncService;
