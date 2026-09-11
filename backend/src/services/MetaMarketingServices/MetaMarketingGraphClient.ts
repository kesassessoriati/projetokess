import axios from "axios";
import AppError from "../../errors/AppError";
import { getMetaMarketingGraphVersion } from "./MetaMarketingOAuthService";

const REQUEST_TIMEOUT_MS = 15000;
const MAX_PAGES = 100;
const CAMPAIGN_INSIGHT_FIELDS = [
  "campaign_id",
  "campaign_name",
  "date_start",
  "date_stop",
  "spend",
  "ctr",
  "cpc",
  "cpm",
  "impressions",
  "reach",
  "clicks",
  "actions",
  "action_values"
].join(",");

export type MetaRateLimitSignals = {
  appUsage?: unknown;
  adAccountUsage?: unknown;
  businessUsage?: unknown;
};

export type MetaCampaignInsight = {
  campaign_id?: string;
  campaign_name?: string;
  date_start?: string;
  date_stop?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  actions?: Array<{ action_type?: string; value?: string }>;
  action_values?: Array<{ action_type?: string; value?: string }>;
};

type MetaAdAccountControlResponse = {
  account_status?: number;
  amount_spent?: string;
  currency?: string;
  disable_reason?: number;
  spend_cap?: string;
};

type MetaMarketingCreatedObjectResponse = { id?: string };
type MetaMarketingNamedObject = { id?: string; name?: string; status?: string };

export type MetaMarketingPausedCampaignInput = {
  accessToken: string;
  externalAccountId: string;
  name: string;
  specialAdCategories: string[];
};

export type MetaMarketingPausedAdSetInput = {
  accessToken: string;
  externalAccountId: string;
  campaignId: string;
  name: string;
  dailyBudgetMinor: string;
  pageId: string;
  pixelId: string;
  countries: string[];
  ageMin: number;
  ageMax: number;
  publisherPlatforms: string[];
};

export type MetaMarketingPausedAdInput = {
  accessToken: string;
  externalAccountId: string;
  adSetId: string;
  creativeId: string;
  name: string;
};

export class MetaMarketingGraphError extends AppError {
  readonly kind: "rate_limit" | "reauthorization_required" | "upstream";
  readonly rateLimitSignals: MetaRateLimitSignals;

  constructor(
    kind: "rate_limit" | "reauthorization_required" | "upstream",
    rateLimitSignals: MetaRateLimitSignals = {}
  ) {
    super(
      kind === "rate_limit"
        ? "META_MARKETING_RATE_LIMITED"
        : kind === "reauthorization_required"
          ? "META_MARKETING_REAUTHORIZATION_REQUIRED"
          : "META_MARKETING_GRAPH_REQUEST_FAILED",
      kind === "reauthorization_required" ? 409 : 502
    );
    this.kind = kind;
    this.rateLimitSignals = rateLimitSignals;
  }
}

const parseHeader = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
};

export const getMetaRateLimitSignals = (headers: Record<string, unknown> = {}): MetaRateLimitSignals => ({
  appUsage: parseHeader(headers["x-app-usage"]),
  adAccountUsage: parseHeader(headers["x-ad-account-usage"]),
  businessUsage: parseHeader(headers["x-business-use-case-usage"])
});

export const classifyMetaMarketingGraphError = (error: unknown): MetaMarketingGraphError => {
  if (!axios.isAxiosError(error)) return new MetaMarketingGraphError("upstream");
  const status = error.response?.status || 0;
  const code = Number(error.response?.data?.error?.code);
  const signals = getMetaRateLimitSignals(error.response?.headers || {});
  if (status === 429 || [4, 17, 32, 613].includes(code)) {
    return new MetaMarketingGraphError("rate_limit", signals);
  }
  if (status === 401 || status === 403 || [190, 200].includes(code)) {
    return new MetaMarketingGraphError("reauthorization_required", signals);
  }
  return new MetaMarketingGraphError("upstream", signals);
};

const validDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const daysBetween = (start: string, end: string): number =>
  (new Date(`${end}T00:00:00.000Z`).getTime() - new Date(`${start}T00:00:00.000Z`).getTime()) / 86400000;

const VALID_ATTRIBUTION_WINDOWS = ["1d_click", "7d_click", "1d_view", "7d_view", "28d_click", "28d_view"];

const validAdAccountInput = (accessToken: string, externalAccountId: string): boolean =>
  Boolean(accessToken.trim()) && /^act_\d+$/.test(externalAccountId);

const validExternalObjectId = (value: string): boolean => /^\d{1,32}$/.test(value);
const graphHeaders = (accessToken: string): Record<string, string> => ({
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/x-www-form-urlencoded"
});
const graphForm = (input: Record<string, string | number | boolean | object>): string =>
  Object.entries(input).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(typeof value === "object" ? JSON.stringify(value) : String(value))}`).join("&");

const createPausedObject = async (input: {
  accessToken: string;
  path: string;
  payload: Record<string, string | number | boolean | object>;
}): Promise<string> => {
  const graphVersion = getMetaMarketingGraphVersion();
  try {
    const response = await axios.post<MetaMarketingCreatedObjectResponse>(
      `https://graph.facebook.com/${graphVersion}/${input.path}`,
      graphForm({ ...input.payload, status: "PAUSED" }),
      { timeout: REQUEST_TIMEOUT_MS, headers: graphHeaders(input.accessToken) }
    );
    if (!response.data?.id || !validExternalObjectId(response.data.id)) throw new Error("invalid Meta creation response");
    return response.data.id;
  } catch (error) {
    if (error instanceof AppError || error instanceof MetaMarketingGraphError) throw error;
    throw classifyMetaMarketingGraphError(error);
  }
};

export const createMetaMarketingPausedCampaign = async (input: MetaMarketingPausedCampaignInput): Promise<string> => {
  if (!validAdAccountInput(input.accessToken, input.externalAccountId) || !input.name.trim() || !input.specialAdCategories.length) {
    throw new AppError("META_MARKETING_CREATION_INPUT_INVALID", 400);
  }
  return createPausedObject({
    accessToken: input.accessToken,
    path: `${input.externalAccountId}/campaigns`,
    payload: { name: input.name, objective: "OUTCOME_LEADS", special_ad_categories: input.specialAdCategories, is_adset_budget_sharing_enabled: false }
  });
};

export const createMetaMarketingPausedAdSet = async (input: MetaMarketingPausedAdSetInput): Promise<string> => {
  if (
    !validAdAccountInput(input.accessToken, input.externalAccountId) || !validExternalObjectId(input.campaignId)
    || !validExternalObjectId(input.pageId) || !validExternalObjectId(input.pixelId) || !/^\d+$/.test(input.dailyBudgetMinor) || BigInt(input.dailyBudgetMinor) <= BigInt(0)
  ) throw new AppError("META_MARKETING_CREATION_INPUT_INVALID", 400);
  return createPausedObject({
    accessToken: input.accessToken,
    path: `${input.externalAccountId}/adsets`,
    payload: {
      name: input.name,
      campaign_id: input.campaignId,
      daily_budget: input.dailyBudgetMinor,
      billing_event: "IMPRESSIONS",
      optimization_goal: "OFFSITE_CONVERSIONS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      destination_type: "WEBSITE",
      promoted_object: { page_id: input.pageId, pixel_id: input.pixelId, custom_event_type: "LEAD" },
      targeting: {
        geo_locations: { countries: input.countries },
        age_min: input.ageMin,
        age_max: input.ageMax,
        publisher_platforms: input.publisherPlatforms
      }
    }
  });
};

export const createMetaMarketingPausedAd = async (input: MetaMarketingPausedAdInput): Promise<string> => {
  if (!validAdAccountInput(input.accessToken, input.externalAccountId) || !validExternalObjectId(input.adSetId) || !validExternalObjectId(input.creativeId)) {
    throw new AppError("META_MARKETING_CREATION_INPUT_INVALID", 400);
  }
  return createPausedObject({
    accessToken: input.accessToken,
    path: `${input.externalAccountId}/ads`,
    payload: { name: input.name, adset_id: input.adSetId, creative: { creative_id: input.creativeId } }
  });
};

export const findMetaMarketingObjectByMarker = async (input: {
  accessToken: string;
  path: string;
  marker: string;
}): Promise<string | null> => {
  if (!input.accessToken.trim() || !input.path || !input.marker) throw new AppError("META_MARKETING_CREATION_INPUT_INVALID", 400);
  const graphVersion = getMetaMarketingGraphVersion();
  try {
    const matches: MetaMarketingNamedObject[] = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const response = await axios.get<{ data?: MetaMarketingNamedObject[]; paging?: { cursors?: { after?: string } } }>(
        `https://graph.facebook.com/${graphVersion}/${input.path}`,
        {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${input.accessToken}` },
        params: {
          fields: "id,name,status",
          filtering: JSON.stringify([{ field: "name", operator: "CONTAIN", value: input.marker }]),
          limit: "100",
          ...(after ? { after } : {})
        }
        }
      );
      matches.push(...(response.data.data || []).filter(item => item.name?.includes(input.marker)));
      const next = response.data.paging?.cursors?.after;
      if (!next) break;
      if (after === next) throw new Error("repeated Meta marker paging cursor");
      after = next;
    }
    if (!matches.length) return null;
    if (matches.length !== 1 || matches[0].status !== "PAUSED" || !matches[0].id || !validExternalObjectId(matches[0].id)) {
      throw new AppError("META_MARKETING_RECONCILIATION_REQUIRES_MANUAL_REVIEW", 409);
    }
    return matches[0].id;
  } catch (error) {
    if (error instanceof AppError || error instanceof MetaMarketingGraphError) throw error;
    throw classifyMetaMarketingGraphError(error);
  }
};

export const getMetaMarketingAdAccountControl = async (input: {
  accessToken: string;
  externalAccountId: string;
}): Promise<Required<MetaAdAccountControlResponse>> => {
  if (!validAdAccountInput(input.accessToken, input.externalAccountId)) {
    throw new AppError("META_MARKETING_AD_ACCOUNT_INPUT_INVALID", 400);
  }
  const graphVersion = getMetaMarketingGraphVersion();
  try {
    const response = await axios.get<MetaAdAccountControlResponse>(
      `https://graph.facebook.com/${graphVersion}/${input.externalAccountId}`,
      {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${input.accessToken}` },
        params: { fields: "account_status,amount_spent,currency,disable_reason,spend_cap" }
      }
    );
    const data = response.data;
    if (
      typeof data.account_status !== "number"
      || typeof data.amount_spent !== "string"
      || typeof data.currency !== "string"
      || typeof data.disable_reason !== "number"
      || typeof data.spend_cap !== "string"
    ) {
      throw new Error("invalid account control response");
    }
    return data as Required<MetaAdAccountControlResponse>;
  } catch (error) {
    if (error instanceof AppError || error instanceof MetaMarketingGraphError) throw error;
    throw classifyMetaMarketingGraphError(error);
  }
};

export const listMetaMarketingCampaignInsights = async (input: {
  accessToken: string;
  externalAccountId: string;
  periodStart: string;
  periodEnd: string;
  attributionWindow: string;
}): Promise<{ insights: MetaCampaignInsight[]; rateLimitSignals: MetaRateLimitSignals; apiVersion: string }> => {
  if (
    !validAdAccountInput(input.accessToken, input.externalAccountId)
    || !validDate(input.periodStart)
    || !validDate(input.periodEnd)
    || daysBetween(input.periodStart, input.periodEnd) < 0
    || daysBetween(input.periodStart, input.periodEnd) > 29
    || !VALID_ATTRIBUTION_WINDOWS.includes(input.attributionWindow)
  ) {
    throw new AppError("META_MARKETING_INSIGHTS_INPUT_INVALID", 400);
  }

  const graphVersion = getMetaMarketingGraphVersion();
  const url = `https://graph.facebook.com/${graphVersion}/${input.externalAccountId}/insights`;
  const insights: MetaCampaignInsight[] = [];
  const seenCursors = new Set<string>();
  let after: string | undefined;
  let rateLimitSignals: MetaRateLimitSignals = {};

  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const response = await axios.get<{ data?: MetaCampaignInsight[]; paging?: { cursors?: { after?: string } } }>(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${input.accessToken}` },
        params: {
          level: "campaign",
          time_increment: "1",
          fields: CAMPAIGN_INSIGHT_FIELDS,
          time_range: JSON.stringify({ since: input.periodStart, until: input.periodEnd }),
          action_attribution_windows: JSON.stringify([input.attributionWindow]),
          limit: "500",
          ...(after ? { after } : {})
        }
      });
      rateLimitSignals = getMetaRateLimitSignals(response.headers || {});
      insights.push(...(response.data.data || []));
      const next = response.data.paging?.cursors?.after;
      if (!next) return { insights, rateLimitSignals, apiVersion: graphVersion };
      if (seenCursors.has(next)) throw new Error("repeated Meta paging cursor");
      seenCursors.add(next);
      after = next;
    }
  } catch (error) {
    if (error instanceof MetaMarketingGraphError) throw error;
    throw classifyMetaMarketingGraphError(error);
  }

  throw new MetaMarketingGraphError("upstream");
};
