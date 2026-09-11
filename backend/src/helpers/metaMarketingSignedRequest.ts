import crypto from "crypto";

type MetaSignedRequestPayload = {
  user_id?: string | number;
  algorithm?: string;
  [key: string]: unknown;
};

const decodeBase64Url = (value: string): Buffer => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Meta Marketing signed request is invalid.");
  }

  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
};

export const verifyMetaMarketingSignedRequest = (
  signedRequest: unknown,
  appSecret = process.env.META_MARKETING_APP_SECRET
): MetaSignedRequestPayload => {
  if (typeof signedRequest !== "string" || !appSecret) {
    throw new Error("Meta Marketing signed request is invalid.");
  }

  const [signatureValue, payloadValue, extra] = signedRequest.split(".");
  if (!signatureValue || !payloadValue || extra) {
    throw new Error("Meta Marketing signed request is invalid.");
  }

  const signature = decodeBase64Url(signatureValue);
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(payloadValue)
    .digest();

  if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) {
    throw new Error("Meta Marketing signed request is invalid.");
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadValue).toString("utf8"));
    if (!payload || typeof payload !== "object" || payload.algorithm !== "HMAC-SHA256") {
      throw new Error("Meta Marketing signed request is invalid.");
    }
    return payload as MetaSignedRequestPayload;
  } catch (_) {
    throw new Error("Meta Marketing signed request is invalid.");
  }
};
