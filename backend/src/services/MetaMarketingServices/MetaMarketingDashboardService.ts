import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import MetaAdAccount from "../../models/MetaAdAccount";
import MetaAdCampaign from "../../models/MetaAdCampaign";
import MetaCampaignDailyMetric from "../../models/MetaCampaignDailyMetric";
import MetaMarketingConnection from "../../models/MetaMarketingConnection";
import CrmClient from "../../models/CrmClient";
import { assertCanManageMetaMarketingConnection } from "./MetaMarketingOAuthService";

type DashboardFilters = {
  companyId: number;
  userId: number;
  periodStart: string;
  periodEnd: string;
  adAccountId?: number;
  campaignId?: number;
  crmClientId?: number;
};

const STALE_SYNC_MS = 30 * 60 * 60 * 1000;

const emptyDashboard = (periodStart: string, periodEnd: string, accounts: unknown[] = [], advertisers: unknown[] = []): Record<string, unknown> => ({
  period: { start: periodStart, end: periodEnd },
  accounts,
  advertisers,
  campaigns: [],
  metrics: [],
  summary: null,
  summaries: [],
  conventions: { currencies: [], timezones: [], attributionWindows: [], resultActionTypes: [] },
  lastSyncedAt: null
});

const validDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const daysBetween = (start: string, end: string): number =>
  (new Date(`${end}T00:00:00.000Z`).getTime() - new Date(`${start}T00:00:00.000Z`).getTime()) / 86400000;

const decimalSum = (values: Array<string | number>): string => {
  const normalized = values.map(value => String(value || "0"));
  const scale = normalized.reduce((max, value) => Math.max(max, (value.split(".")[1] || "").length), 0);
  const total = normalized.reduce((sum, value) => {
    const [whole, fraction = ""] = value.split(".");
    return sum + BigInt(`${whole}${fraction.padEnd(scale, "0")}`);
  }, BigInt(0));
  const sign = total < BigInt(0) ? "-" : "";
  const absolute = (total < BigInt(0) ? -total : total).toString().padStart(scale + 1, "0");
  if (!scale) return `${sign}${absolute}`;
  return `${sign}${absolute.slice(0, -scale)}.${absolute.slice(-scale)}`.replace(/\.?0+$/, "");
};

const scaledInteger = (value: string, scale: number): bigint => {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(`${whole}${fraction.padEnd(scale, "0").slice(0, scale)}`);
};

const fixedDecimal = (value: bigint, scale: number): string => {
  const sign = value < BigInt(0) ? "-" : "";
  const absolute = (value < BigInt(0) ? -value : value).toString().padStart(scale + 1, "0");
  return `${sign}${absolute.slice(0, -scale)}.${absolute.slice(-scale)}`.replace(/\.?0+$/, "");
};

const ratio = (numerator: string, denominator: string, multiplier = 1): string | null => {
  const scale = 6;
  const denominatorScaled = scaledInteger(denominator, scale);
  if (!denominatorScaled) return null;
  return fixedDecimal(scaledInteger(numerator, scale) * BigInt(multiplier) * (BigInt(10) ** BigInt(scale)) / denominatorScaled, scale);
};

const summaryFor = (metrics: MetaCampaignDailyMetric[]): Record<string, string | null> => {
  const spend = decimalSum(metrics.map(metric => metric.spend));
  const impressions = decimalSum(metrics.map(metric => metric.impressions));
  const clicks = decimalSum(metrics.map(metric => metric.clicks));
  const resultValue = decimalSum(metrics.map(metric => metric.resultValue));
  return { spend, impressions, clicks, resultValue, ctr: ratio(clicks, impressions, 100), cpc: ratio(spend, clicks), cpm: ratio(spend, impressions, 1000) };
};

export const getMetaMarketingDashboard = async (filters: DashboardFilters): Promise<Record<string, unknown>> => {
  if (!validDate(filters.periodStart) || !validDate(filters.periodEnd) || daysBetween(filters.periodStart, filters.periodEnd) < 0 || daysBetween(filters.periodStart, filters.periodEnd) > 30) {
    throw new AppError("META_MARKETING_PERIOD_INVALID", 400);
  }
  await assertCanManageMetaMarketingConnection(filters.companyId, filters.userId);

  const accountWhere = {
    companyId: filters.companyId,
    status: "active",
    ...(filters.adAccountId ? { id: filters.adAccountId } : {}),
    ...(filters.crmClientId ? { crmClientId: filters.crmClientId } : {})
  };
  const accounts = await MetaAdAccount.findAll({
    where: accountWhere,
    attributes: ["id", "connectionId", "crmClientId", "externalAccountId", "name", "currency", "timezone"]
  });
  const accountIds = accounts.map(account => account.id);
  if (!accountIds.length) return emptyDashboard(filters.periodStart, filters.periodEnd);
  const crmClientIds = accounts.map(account => account.crmClientId).filter((id): id is number => Boolean(id));
  const advertisers = crmClientIds.length ? await CrmClient.findAll({
    where: { companyId: filters.companyId, id: { [Op.in]: crmClientIds } },
    attributes: ["id", "name", "companyName"]
  }) : [];
  const connections = await MetaMarketingConnection.findAll({
    where: { companyId: filters.companyId, id: { [Op.in]: accounts.map(account => account.connectionId) } },
    attributes: ["id", "status"]
  });
  const connectionStatus = new Map(connections.map(connection => [connection.id, connection.status]));
  const serializedAccounts = accounts.map(account => ({ ...account.toJSON(), connectionStatus: connectionStatus.get(account.connectionId) || "unknown" }));

  const campaigns = await MetaAdCampaign.findAll({
    where: {
      companyId: filters.companyId,
      adAccountId: { [Op.in]: accountIds },
      ...(filters.campaignId ? { id: filters.campaignId } : {})
    },
    attributes: ["id", "adAccountId", "externalCampaignId", "name", "status"]
  });
  const campaignIds = campaigns.map(campaign => campaign.id);
  if (!campaignIds.length) return emptyDashboard(filters.periodStart, filters.periodEnd, serializedAccounts, advertisers);

  const metrics = await MetaCampaignDailyMetric.findAll({
    where: {
      companyId: filters.companyId,
      adAccountId: { [Op.in]: accountIds },
      campaignId: { [Op.in]: campaignIds },
      statDate: { [Op.between]: [filters.periodStart, filters.periodEnd] } as any
    },
    attributes: ["id", "adAccountId", "campaignId", "statDate", "spend", "ctr", "cpc", "cpm", "resultValue", "impressions", "reach", "clicks", "resultActionType", "currency", "timezone", "attributionWindow", "collectedAt"],
    order: [["statDate", "ASC"], ["campaignId", "ASC"]]
  });
  if (!metrics.length) return { ...emptyDashboard(filters.periodStart, filters.periodEnd, serializedAccounts, advertisers), campaigns };

  const groupedMetrics = new Map<string, MetaCampaignDailyMetric[]>();
  metrics.forEach(metric => {
    const key = [metric.currency, metric.timezone, metric.attributionWindow, metric.resultActionType || ""].join("\u0000");
    groupedMetrics.set(key, [...(groupedMetrics.get(key) || []), metric]);
  });
  const summaries = Array.from(groupedMetrics.values()).map(group => ({
    currency: group[0].currency,
    timezone: group[0].timezone,
    attributionWindow: group[0].attributionWindow,
    resultActionType: group[0].resultActionType,
    ...summaryFor(group)
  }));
  const lastSyncedAt = metrics.reduce<Date>((latest, metric) => metric.collectedAt > latest ? metric.collectedAt : latest, metrics[0].collectedAt);
  const conventions = {
    currencies: Array.from(new Set(metrics.map(metric => metric.currency))),
    timezones: Array.from(new Set(metrics.map(metric => metric.timezone))),
    attributionWindows: Array.from(new Set(metrics.map(metric => metric.attributionWindow))),
    resultActionTypes: Array.from(new Set(metrics.map(metric => metric.resultActionType).filter(Boolean)))
  };

  return {
    period: { start: filters.periodStart, end: filters.periodEnd },
    accounts: serializedAccounts,
    advertisers,
    campaigns,
    metrics,
    summary: summaries.length === 1 ? summaries[0] : null,
    summaries,
    conventions,
    lastSyncedAt,
    isStale: Date.now() - lastSyncedAt.getTime() > STALE_SYNC_MS
  };
};
