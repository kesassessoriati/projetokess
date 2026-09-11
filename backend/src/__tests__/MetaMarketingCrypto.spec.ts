import fs from "fs";
import path from "path";
import {
  decryptMetaMarketingSecret,
  encryptMetaMarketingSecret,
  redactMetaMarketingPayload
} from "../helpers/metaMarketingCrypto";

const envNames = [
  "META_MARKETING_ENCRYPTION_KEY",
  "META_MARKETING_ENCRYPTION_KEY_VERSION",
  "META_MARKETING_ENCRYPTION_PREVIOUS_KEY",
  "META_MARKETING_ENCRYPTION_PREVIOUS_KEY_VERSION"
];

const restoreEnv = (original: Record<string, string | undefined>) => {
  envNames.forEach(name => {
    if (original[name] === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = original[name];
    }
  });
};

describe("Meta Marketing crypto", () => {
  const originalEnv = envNames.reduce<Record<string, string | undefined>>((result, name) => {
    result[name] = process.env[name];
    return result;
  }, {});

  beforeEach(() => {
    process.env.META_MARKETING_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    process.env.META_MARKETING_ENCRYPTION_KEY_VERSION = "test-v2";
    delete process.env.META_MARKETING_ENCRYPTION_PREVIOUS_KEY;
    delete process.env.META_MARKETING_ENCRYPTION_PREVIOUS_KEY_VERSION;
  });

  afterEach(() => restoreEnv(originalEnv));

  it("round-trips with authenticated encryption", () => {
    const encrypted = encryptMetaMarketingSecret("meta-token");

    expect(encrypted).not.toContain("meta-token");
    expect(decryptMetaMarketingSecret(encrypted)).toBe("meta-token");
  });

  it("decrypts a previous key during controlled rotation", () => {
    process.env.META_MARKETING_ENCRYPTION_KEY = Buffer.alloc(32, 6).toString("base64");
    process.env.META_MARKETING_ENCRYPTION_KEY_VERSION = "test-v1";
    const legacyCiphertext = encryptMetaMarketingSecret("previous-token");

    process.env.META_MARKETING_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    process.env.META_MARKETING_ENCRYPTION_KEY_VERSION = "test-v2";
    process.env.META_MARKETING_ENCRYPTION_PREVIOUS_KEY = Buffer.alloc(32, 6).toString("base64");
    process.env.META_MARKETING_ENCRYPTION_PREVIOUS_KEY_VERSION = "test-v1";

    expect(decryptMetaMarketingSecret(legacyCiphertext)).toBe("previous-token");
  });

  it("fails closed for plaintext, tampering and invalid key configuration", () => {
    expect(() => decryptMetaMarketingSecret("meta-token")).toThrow("ciphertext is invalid");

    const parts = encryptMetaMarketingSecret("meta-token").split(":");
    parts[2] = Buffer.alloc(16, 8).toString("base64");
    expect(() => decryptMetaMarketingSecret(parts.join(":"))).toThrow("ciphertext is invalid");

    process.env.META_MARKETING_ENCRYPTION_KEY = "not-a-valid-key";
    expect(() => encryptMetaMarketingSecret("meta-token")).toThrow("must decode to exactly 32 bytes");
  });

  it("rejects ambiguous key versions during rotation", () => {
    process.env.META_MARKETING_ENCRYPTION_PREVIOUS_KEY = Buffer.alloc(32, 6).toString("base64");
    process.env.META_MARKETING_ENCRYPTION_PREVIOUS_KEY_VERSION = "test-v2";

    expect(() => encryptMetaMarketingSecret("meta-token")).toThrow("must differ");
  });

  it("redacts secrets and never imports the legacy crypto helper", () => {
    expect(redactMetaMarketingPayload({
      accessToken: "secret",
      nested: { authorization: "Bearer token", name: "safe" }
    })).toEqual({
      accessToken: "[REDACTED]",
      nested: { authorization: "[REDACTED]", name: "safe" }
    });

    const source = fs.readFileSync(
      path.resolve(__dirname, "../helpers/metaMarketingCrypto.ts"),
      "utf8"
    );
    expect(source).not.toContain('from "./crypto"');
    expect(source).not.toContain('from "../helpers/crypto"');
  });
});
