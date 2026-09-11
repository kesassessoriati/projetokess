import crypto from "crypto";
const mockCompaniesSettings = { findOne: jest.fn() };
const mockPermissions = { findOne: jest.fn() };

jest.mock("../models/CompaniesSettings", () => ({ __esModule: true, default: mockCompaniesSettings }));
jest.mock("../models/MetaMarketingUserPermission", () => ({ __esModule: true, default: mockPermissions }));
jest.mock("../errors/AppError", () => ({ __esModule: true, default: class mockAppError extends Error {} }));

import { verifyMetaMarketingSignedRequest } from "../helpers/metaMarketingSignedRequest";
import {
  assertCanCreateMetaMarketingCampaign,
  assertCanManageMetaMarketingConnection,
  assertCanViewMetaMarketingOperations,
  hasMetaMarketingReadScope,
  isMetaMarketingOAuthStateValid
} from "../services/MetaMarketingServices/MetaMarketingOAuthService";

const base64Url = (value: Buffer | string): string =>
  Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

const signedRequest = (payload: Record<string, unknown>, secret = "test-secret"): string => {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest();
  return `${base64Url(signature)}.${encodedPayload}`;
};

describe("Meta Marketing OAuth security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompaniesSettings.findOne.mockResolvedValue({ metaMarketingReadEnabled: true, metaMarketingWriteEnabled: true });
    mockPermissions.findOne.mockResolvedValue({ id: 1 });
  });

  it("accepts only a valid HMAC-signed Meta callback", () => {
    const value = signedRequest({ algorithm: "HMAC-SHA256", user_id: "123" });

    expect(verifyMetaMarketingSignedRequest(value, "test-secret").user_id).toBe("123");
    expect(() => verifyMetaMarketingSignedRequest(`${value}x`, "test-secret")).toThrow("invalid");
    expect(() => verifyMetaMarketingSignedRequest(
      signedRequest({ algorithm: "none", user_id: "123" }),
      "test-secret"
    )).toThrow("invalid");
  });

  it("rejects used and expired OAuth states", () => {
    const now = new Date("2026-09-08T12:00:00.000Z");

    expect(isMetaMarketingOAuthStateValid({ expiresAt: new Date("2026-09-08T12:15:00.000Z") }, now)).toBe(true);
    expect(isMetaMarketingOAuthStateValid({ expiresAt: now }, now)).toBe(false);
    expect(isMetaMarketingOAuthStateValid({ expiresAt: new Date("2026-09-08T12:15:00.000Z"), consumedAt: now }, now)).toBe(false);
  });

  it("requires granted ads_read before a connection can be used", () => {
    expect(hasMetaMarketingReadScope(["ads_read"])).toBe(true);
    expect(hasMetaMarketingReadScope(["ads_management"])).toBe(false);
  });

  it("keeps read and write flags independent and closed by default", async () => {
    mockCompaniesSettings.findOne.mockResolvedValueOnce({ metaMarketingReadEnabled: false });
    await expect(assertCanManageMetaMarketingConnection(1, 2)).rejects.toThrow("META_MARKETING_READ_DISABLED");

    mockCompaniesSettings.findOne.mockResolvedValueOnce({ metaMarketingWriteEnabled: false });
    await expect(assertCanCreateMetaMarketingCampaign(1, 2)).rejects.toThrow("META_MARKETING_WRITE_DISABLED");
    expect(mockPermissions.findOne).toHaveBeenCalledTimes(2);
  });

  it("allows operational diagnostics to the allowlist even with read disabled", async () => {
    mockCompaniesSettings.findOne.mockResolvedValue({ metaMarketingReadEnabled: false });

    await expect(assertCanViewMetaMarketingOperations(1, 2)).resolves.toBeUndefined();
    expect(mockCompaniesSettings.findOne).not.toHaveBeenCalled();
  });
});
