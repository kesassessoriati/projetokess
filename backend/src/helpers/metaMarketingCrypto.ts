import crypto from "crypto";

const KEY_ENV = "META_MARKETING_ENCRYPTION_KEY";
const KEY_VERSION_ENV = "META_MARKETING_ENCRYPTION_KEY_VERSION";
const PREVIOUS_KEY_ENV = "META_MARKETING_ENCRYPTION_PREVIOUS_KEY";
const PREVIOUS_KEY_VERSION_ENV = "META_MARKETING_ENCRYPTION_PREVIOUS_KEY_VERSION";
const sensitiveKey = /token|authorization|secret|ciphertext|(^|_)code$/i;

type KeyMaterial = {
  version: string;
  key: Buffer;
};

const invalidCiphertext = () => new Error("Meta Marketing ciphertext is invalid.");

const readKey = (keyEnv: string, versionEnv: string, required: boolean): KeyMaterial | null => {
  const value = process.env[keyEnv];
  if (!value) {
    if (required) {
      throw new Error(keyEnv + " must be configured.");
    }
    return null;
  }

  const version = process.env[versionEnv] || "v1";
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(version)) {
    throw new Error(versionEnv + " is invalid.");
  }

  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error(keyEnv + " must decode to exactly 32 bytes.");
  }

  return { version, key };
};

const getKeyring = (): KeyMaterial[] => {
  const current = readKey(KEY_ENV, KEY_VERSION_ENV, true) as KeyMaterial;
  const previous = readKey(PREVIOUS_KEY_ENV, PREVIOUS_KEY_VERSION_ENV, false);

  if (previous && previous.version === current.version) {
    throw new Error(PREVIOUS_KEY_VERSION_ENV + " must differ from " + KEY_VERSION_ENV + ".");
  }

  return previous ? [current, previous] : [current];
};

const getCurrentKey = (): KeyMaterial => getKeyring()[0];

export const getMetaMarketingCurrentKeyVersion = (): string => getCurrentKey().version;

const getKeyForVersion = (version: string): Buffer => {
  const material = getKeyring().find(item => item.version === version);
  if (!material) {
    throw invalidCiphertext();
  }

  return material.key;
};

export const encryptMetaMarketingSecret = (value: string): string => {
  const { key, version } = getCurrentKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    version,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64")
  ].join(":");
};

export const decryptMetaMarketingSecret = (value: string): string => {
  const [version, ivValue, tagValue, ciphertextValue, extra] = value.split(":");
  if (!version || !ivValue || !tagValue || !ciphertextValue || extra) {
    throw invalidCiphertext();
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getKeyForVersion(version),
      Buffer.from(ivValue, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64")),
      decipher.final()
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof Error && error.message.includes("must be configured")) {
      throw error;
    }
    throw invalidCiphertext();
  }
};

export const redactMetaMarketingPayload = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactMetaMarketingPayload);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (result, [key, item]) => {
      result[key] = sensitiveKey.test(key) ? "[REDACTED]" : redactMetaMarketingPayload(item);
      return result;
    },
    {}
  );
};
