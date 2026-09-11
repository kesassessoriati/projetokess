import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
import {
  createMetaMarketingPausedAd,
  createMetaMarketingPausedAdSet,
  createMetaMarketingPausedCampaign,
  findMetaMarketingObjectByMarker,
  listMetaMarketingCampaignInsights
} from "../services/MetaMarketingServices/MetaMarketingGraphClient";

dotenv.config({ path: ".env.test" });
jest.setTimeout(90000);

const REQUIRED_VARIABLES = [
  "TEST_META_APP_ID",
  "TEST_META_APP_SECRET",
  "TEST_META_ACCOUNT_ID",
  "TEST_META_PAGE_ID",
  "TEST_META_PIXEL_ID",
  "TEST_META_CREATIVE_ID",
  "TEST_META_ACCESS_TOKEN",
  "META_MARKETING_GRAPH_VERSION",
  "TEST_META_INSIGHTS_START",
  "TEST_META_INSIGHTS_END"
] as const;

type ContractConfig = Record<typeof REQUIRED_VARIABLES[number], string> & { dailyBudgetMinor: string };

const getConfig = (): ContractConfig => {
  const missing = REQUIRED_VARIABLES.filter(name => !process.env[name]?.trim());
  if (missing.length) {
    throw new Error(`Meta contract test requires ${missing.join(", ")}. Fill .env.test locally or inject CI secrets.`);
  }
  return {
    TEST_META_APP_ID: process.env.TEST_META_APP_ID as string,
    TEST_META_APP_SECRET: process.env.TEST_META_APP_SECRET as string,
    TEST_META_ACCOUNT_ID: process.env.TEST_META_ACCOUNT_ID as string,
    TEST_META_PAGE_ID: process.env.TEST_META_PAGE_ID as string,
    TEST_META_PIXEL_ID: process.env.TEST_META_PIXEL_ID as string,
    TEST_META_CREATIVE_ID: process.env.TEST_META_CREATIVE_ID as string,
    TEST_META_ACCESS_TOKEN: process.env.TEST_META_ACCESS_TOKEN as string,
    META_MARKETING_GRAPH_VERSION: process.env.META_MARKETING_GRAPH_VERSION as string,
    TEST_META_INSIGHTS_START: process.env.TEST_META_INSIGHTS_START as string,
    TEST_META_INSIGHTS_END: process.env.TEST_META_INSIGHTS_END as string,
    dailyBudgetMinor: process.env.TEST_META_DAILY_BUDGET_MINOR || "1000"
  };
};

const marker = (): string => `kes-mm-contract-${crypto.randomUUID()}`;
const graphUrl = (config: ContractConfig, path: string): string => `https://graph.facebook.com/${config.META_MARKETING_GRAPH_VERSION}/${path}`;
const metaRequest = async <T>(operation: string, request: () => Promise<T>): Promise<T> => {
  try {
    return await request();
  } catch (_) {
    // Axios errors retain request config, including Authorization. Never expose it.
    throw new Error(`META_MARKETING_CONTRACT_${operation}_FAILED`);
  }
};

const loadExecutorWithRealGraph = (config: ContractConfig, idempotencyMarker: string) => {
  const template = {
    templateVersion: "meta-pilot-v1", campaignName: "Contract executor campaign", adSetName: "Contract executor ad set", adName: "Contract executor ad",
    objective: "OUTCOME_LEADS", dailyBudgetMinor: config.dailyBudgetMinor, pageId: config.TEST_META_PAGE_ID, creativeId: config.TEST_META_CREATIVE_ID,
    pixelId: config.TEST_META_PIXEL_ID, specialAdCategories: ["NONE"], conversionLocation: "WEBSITE", conversionEvent: "LEAD",
    targeting: { countries: ["BR"], ageMin: 18, ageMax: 65 }, placements: { publisherPlatforms: ["facebook"] }
  };
  const request = {
    id: `contract-executor-${crypto.randomUUID()}`, companyId: 1, requestedByUserId: 2, adAccountId: 10, payload: template,
    status: "requested", idempotencyMarker, externalCampaignId: null, externalAdSetId: null, externalAdId: null, errorCode: null
  };
  const requestModel = {
    findOne: jest.fn().mockResolvedValue(request),
    update: jest.fn().mockResolvedValue([1])
  };

  jest.resetModules();
  // Share the genuine Axios instance with the test; no Graph response is mocked.
  jest.doMock("axios", () => ({ __esModule: true, default: axios }));
  jest.doMock("../database", () => ({ __esModule: true, default: { transaction: async callback => callback({ id: "contract" }) } }));
  jest.doMock("../models/MetaCampaignCreationRequest", () => ({ __esModule: true, default: requestModel }));
  jest.doMock("../models/MetaAdAccount", () => ({ __esModule: true, default: {
    findOne: jest.fn().mockResolvedValue({ id: 10, connectionId: 20, externalAccountId: config.TEST_META_ACCOUNT_ID, status: "active" })
  }}));
  jest.doMock("../models/MetaMarketingConnection", () => ({ __esModule: true, default: {
    findOne: jest.fn().mockResolvedValue({ accessTokenCiphertext: "contract-token", status: "connected", update: jest.fn() })
  }}));
  jest.doMock("../helpers/metaMarketingCrypto", () => ({ decryptMetaMarketingSecret: () => config.TEST_META_ACCESS_TOKEN }));
  jest.doMock("../services/MetaMarketingServices/MetaMarketingCampaignPilotService", () => ({
    validateMetaMarketingPilotTemplate: () => template,
    preflightMetaMarketingCampaignPilot: jest.fn().mockResolvedValue(undefined)
  }));
  jest.doMock("../services/MetaMarketingServices/MetaMarketingCampaignCreationRequestService", () => ({
    transitionMetaMarketingCampaignCreationRequest: jest.fn(async input => {
      input.request.status = input.toStatus;
      if (input.errorCode !== undefined) input.request.errorCode = input.errorCode;
      return input.request;
    })
  }));
  jest.doMock("../services/MetaMarketingServices/MetaMarketingOAuthService", () => ({
    getMetaMarketingGraphVersion: () => config.META_MARKETING_GRAPH_VERSION,
    assertCanCreateMetaMarketingCampaign: jest.fn().mockResolvedValue(undefined),
    createMetaMarketingAuditLog: jest.fn().mockResolvedValue(undefined)
  }));
  jest.doMock("../services/MetaMarketingServices/MetaMarketingGraphClient", () =>
    jest.requireActual("../services/MetaMarketingServices/MetaMarketingGraphClient")
  );

  const { executeMetaMarketingCampaignCreationRequest } = require("../services/MetaMarketingServices/MetaMarketingCampaignCreationExecutorService");
  return { request, executeMetaMarketingCampaignCreationRequest };
};

/**
 * These tests deliberately call Meta. They are excluded from `npm test` and
 * run only from a protected CI job with development-mode secrets. Unit tests
 * still mock DB/cache/transport because they validate local control flow.
 */
describe("Meta Marketing contract validation (real API)", () => {
  let config: ContractConfig;
  let createdObjectIds: string[] = [];
  let createdMarkers: string[] = [];

  beforeAll(() => {
    config = getConfig();
  });

  beforeEach(() => {
    createdObjectIds = [];
    createdMarkers = [];
  });

  afterEach(async () => {
    try {
      jest.restoreAllMocks();
      // Delete child-first, one request at a time. A failed cleanup is visible and
      // lists only external ids, so it can be resolved safely in Ads Manager.
      const failedCleanupIds: string[] = [];
      for (const idempotencyMarker of createdMarkers) {
        try {
          const campaignId = await findMetaMarketingObjectByMarker({
            accessToken: config.TEST_META_ACCESS_TOKEN,
            path: `${config.TEST_META_ACCOUNT_ID}/campaigns`,
            marker: idempotencyMarker
          });
          if (campaignId && !createdObjectIds.includes(campaignId)) createdObjectIds.push(campaignId);
        } catch (_) {
          failedCleanupIds.push(`marker:${idempotencyMarker}`);
        }
      }
      for (const id of [...new Set(createdObjectIds)].reverse()) {
        try {
          const response = await metaRequest("CLEANUP", () => axios.delete<{ success?: boolean }>(graphUrl(config, id), {
            timeout: 15000,
            headers: { Authorization: `Bearer ${config.TEST_META_ACCESS_TOKEN}` }
          }));
          if (response.data.success !== true) {
            const status = await metaRequest("CLEANUP_STATUS", () => axios.get<{ status?: string }>(graphUrl(config, id), {
              timeout: 15000,
              headers: { Authorization: `Bearer ${config.TEST_META_ACCESS_TOKEN}` },
              params: { fields: "status" }
            }));
            if (status.data.status !== "DELETED") failedCleanupIds.push(id);
          }
        } catch (_) {
          failedCleanupIds.push(id);
        }
      }
      if (failedCleanupIds.length) throw new Error(`META_MARKETING_CONTRACT_CLEANUP_REQUIRED:${failedCleanupIds.join(",")}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message || error.name : String(error);
      throw new Error(`META_MARKETING_CONTRACT_CLEANUP_FAILED:${detail}`);
    }
  });

  it("an OAuth-issued token is valid and grants ads_read", async () => {
    const appToken = `${config.TEST_META_APP_ID}|${config.TEST_META_APP_SECRET}`;
    const response = await metaRequest("TOKEN_DEBUG", () => axios.get<{ data?: { app_id?: string; is_valid?: boolean; scopes?: string[] } }>(
      graphUrl(config, "debug_token"), {
        timeout: 15000,
        // App token and user token stay out of URLs and test output.
        headers: { Authorization: `Bearer ${appToken}` },
        params: { input_token: config.TEST_META_ACCESS_TOKEN }
      }
    ));
    expect(response.data.data?.is_valid).toBe(true);
    expect(String(response.data.data?.app_id)).toBe(config.TEST_META_APP_ID);
    expect(response.data.data?.scopes).toContain("ads_read");
    expect(response.data.data?.scopes).toContain("ads_management");
  });

  it("Insights returns the expected campaign fields and handles Meta rate-limit headers", async () => {
    const insightRequests: Array<{ after?: string }> = [];
    const insightResponseHeaders: Array<Record<string, unknown>> = [];
    const interceptor = axios.interceptors.request.use(request => {
      if (String(request.url).endsWith(`/${config.TEST_META_ACCOUNT_ID}/insights`)) {
        insightRequests.push({ after: request.params?.after });
      }
      return request;
    });
    const responseInterceptor = axios.interceptors.response.use(response => {
      if (String(response.config.url).endsWith(`/${config.TEST_META_ACCOUNT_ID}/insights`)) {
        insightResponseHeaders.push(response.headers as Record<string, unknown>);
      }
      return response;
    });
    let result;
    try {
      result = await listMetaMarketingCampaignInsights({
        accessToken: config.TEST_META_ACCESS_TOKEN,
        externalAccountId: config.TEST_META_ACCOUNT_ID,
        periodStart: config.TEST_META_INSIGHTS_START,
        periodEnd: config.TEST_META_INSIGHTS_END,
        attributionWindow: "7d_click"
      });
    } finally {
      axios.interceptors.request.eject(interceptor);
      axios.interceptors.response.eject(responseInterceptor);
    }

    // The configured dev account must contain at least one campaign with data;
    // otherwise the API cannot prove its row-level Insights contract.
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.insights[0]).toEqual(expect.objectContaining({
      campaign_id: expect.any(String),
      spend: expect.any(String),
      reach: expect.any(String),
      date_start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    }));
    expect(insightResponseHeaders.length).toBeGreaterThan(0);
    // Meta may omit x-app-usage on successful low-volume calls. The parser is
    // unit-tested with the header; this real call verifies either API behavior.
    if (insightResponseHeaders.some(headers => Boolean(headers["x-app-usage"]))) {
      expect(result.rateLimitSignals.appUsage).toEqual(expect.objectContaining({ call_count: expect.any(Number) }));
    } else {
      expect(result.rateLimitSignals.appUsage).toBeUndefined();
    }
    expect(result.apiVersion).toBe(config.META_MARKETING_GRAPH_VERSION);
    expect(insightRequests.length).toBeGreaterThan(0);
    if (process.env.TEST_META_REQUIRE_INSIGHTS_PAGINATION === "true") {
      expect(insightRequests.length).toBeGreaterThan(1);
      expect(insightRequests.slice(1).some(request => Boolean(request.after))).toBe(true);
    }
  });

  it("creates a paused campaign, ad set and ad in Meta", async () => {
    const idempotencyMarker = marker();
    createdMarkers.push(idempotencyMarker);
    const campaignId = await createMetaMarketingPausedCampaign({
      accessToken: config.TEST_META_ACCESS_TOKEN,
      externalAccountId: config.TEST_META_ACCOUNT_ID,
      name: `Contract campaign [${idempotencyMarker}]`,
      specialAdCategories: ["NONE"]
    });
    createdObjectIds.push(campaignId);
    const adSetId = await createMetaMarketingPausedAdSet({
      accessToken: config.TEST_META_ACCESS_TOKEN,
      externalAccountId: config.TEST_META_ACCOUNT_ID,
      campaignId,
      name: `Contract ad set [${idempotencyMarker}]`,
      dailyBudgetMinor: config.dailyBudgetMinor,
      pageId: config.TEST_META_PAGE_ID,
      pixelId: config.TEST_META_PIXEL_ID,
      countries: ["BR"],
      ageMin: 18,
      ageMax: 65,
      publisherPlatforms: ["facebook"]
    });
    createdObjectIds.push(adSetId);
    const adId = await createMetaMarketingPausedAd({
      accessToken: config.TEST_META_ACCESS_TOKEN,
      externalAccountId: config.TEST_META_ACCOUNT_ID,
      adSetId,
      creativeId: config.TEST_META_CREATIVE_ID,
      name: `Contract ad [${idempotencyMarker}]`
    });
    createdObjectIds.push(adId);

    const statuses = await Promise.all([campaignId, adSetId, adId].map(async id => {
      const response = await metaRequest("STATUS", () => axios.get<{ status?: string }>(graphUrl(config, id), {
        timeout: 15000,
        headers: { Authorization: `Bearer ${config.TEST_META_ACCESS_TOKEN}` },
        params: { fields: "status" }
      }));
      return response.data.status;
    }));
    expect(statuses).toEqual(["PAUSED", "PAUSED", "PAUSED"]);
  });

  it("reconciles a campaign by marker after a local timeout following Meta acceptance", async () => {
    const idempotencyMarker = marker();
    createdMarkers.push(idempotencyMarker);
    const realPost = axios.post.bind(axios);
    jest.spyOn(axios, "post").mockImplementationOnce(async (url, data, requestConfig) => {
      const response = await realPost(url, data, requestConfig);
      const createdId = (response.data as { id?: string }).id;
      if (createdId) createdObjectIds.push(createdId);
      // This is a transport simulation only: Meta received the real POST first.
      throw new axios.AxiosError("simulated response timeout", "ECONNABORTED");
    });

    await expect(createMetaMarketingPausedCampaign({
      accessToken: config.TEST_META_ACCESS_TOKEN,
      externalAccountId: config.TEST_META_ACCOUNT_ID,
      name: `Timeout campaign [${idempotencyMarker}]`,
      specialAdCategories: ["NONE"]
    })).rejects.toMatchObject({ kind: "upstream" });

    jest.restoreAllMocks();
    await expect(findMetaMarketingObjectByMarker({
      accessToken: config.TEST_META_ACCESS_TOKEN,
      path: `${config.TEST_META_ACCOUNT_ID}/campaigns`,
      marker: idempotencyMarker
    })).resolves.toEqual(createdObjectIds[0]);
  });

  it("moves the Executor to unknown and completes its retry without a duplicate campaign", async () => {
    let phase = "initial execution";
    const idempotencyMarker = marker();
    createdMarkers.push(idempotencyMarker);
    try {
      phase = "executor setup";
      const { request, executeMetaMarketingCampaignCreationRequest } = loadExecutorWithRealGraph(config, idempotencyMarker);
      const realPost = axios.post.bind(axios);
      jest.spyOn(axios, "post").mockImplementationOnce(async (url, data, requestConfig) => {
        await realPost(url, data, requestConfig);
        // Meta has accepted the campaign, while this process loses the response.
        throw new axios.AxiosError("simulated response timeout", "ECONNABORTED");
      });

      phase = "initial execution";
      await expect(executeMetaMarketingCampaignCreationRequest({ companyId: 1, requestId: request.id })).rejects.toMatchObject({ kind: "upstream" });
      phase = "unknown state";
      expect(request.status).toBe("unknown");

      jest.restoreAllMocks();
      phase = "campaign reconciliation";
      const campaignId = await findMetaMarketingObjectByMarker({
        accessToken: config.TEST_META_ACCESS_TOKEN,
        path: `${config.TEST_META_ACCOUNT_ID}/campaigns`,
        marker: idempotencyMarker
      });
      expect(campaignId).toEqual(expect.any(String));
      createdObjectIds.push(campaignId as string);

      phase = "retry completion";
      const completed = await executeMetaMarketingCampaignCreationRequest({ companyId: 1, requestId: request.id });
      expect(completed).toMatchObject({ status: "completed", externalCampaignId: campaignId, externalAdSetId: expect.any(String), externalAdId: expect.any(String) });
      createdObjectIds.push(completed.externalAdSetId, completed.externalAdId);
    } catch (error) {
      const detail = error instanceof Error ? error.message || error.name : String(error);
      throw new Error(`META_MARKETING_CONTRACT_EXECUTOR_${phase}_FAILED:${detail}`);
    }
  });
});
