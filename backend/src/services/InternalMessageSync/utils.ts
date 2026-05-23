import crypto from "crypto";
import InternalSyncPeer from "../../models/InternalSyncPeer";

export const normalizeDigits = (value?: string | null): string =>
  String(value || "").replace(/\D/g, "");

export const normalizeBaseUrl = (value: string): string =>
  String(value || "").replace(/\/+$/, "");

export const buildPayloadHash = (payload: unknown): string =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

export const buildNonce = (): string => crypto.randomBytes(16).toString("hex");

export const resolvePeerSecret = (peer: InternalSyncPeer): string => {
  const secretRef = String(peer.secretRef || "").trim();
  if (!secretRef) {
    return "";
  }

  const direct = process.env[secretRef];
  if (direct) {
    return direct;
  }

  const normalizedPublicId = String(peer.publicId || "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toUpperCase();

  return (
    process.env[`INTERNAL_MESSAGE_SYNC_SECRET_${normalizedPublicId}`] || ""
  );
};

export const signInternalSyncPayload = ({
  secret,
  timestamp,
  nonce,
  rawBody
}: {
  secret: string;
  timestamp: string;
  nonce: string;
  rawBody: string;
}): string =>
  crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${rawBody}`)
    .digest("hex");

export const isValueAllowed = (
  values: Array<string | number> | null | undefined,
  value: string | number
): boolean => {
  if (!Array.isArray(values) || values.length === 0) {
    return false;
  }

  if (values.includes("*")) {
    return true;
  }

  const valueString = String(value);
  const valueDigits = normalizeDigits(valueString);

  return values.some(item => {
    const itemString = String(item);
    return (
      itemString === valueString ||
      (!!valueDigits && normalizeDigits(itemString) === valueDigits)
    );
  });
};

export const getSingleAllowedNumber = (
  values?: Array<string | number> | null
): string | null => {
  if (!Array.isArray(values) || values.length !== 1 || values[0] === "*") {
    return null;
  }

  return normalizeDigits(String(values[0]));
};

export const getSingleAllowedId = (
  values?: Array<string | number> | null
): number | null => {
  if (!Array.isArray(values) || values.length !== 1 || values[0] === "*") {
    return null;
  }

  const parsed = Number(values[0]);
  return Number.isInteger(parsed) ? parsed : null;
};
