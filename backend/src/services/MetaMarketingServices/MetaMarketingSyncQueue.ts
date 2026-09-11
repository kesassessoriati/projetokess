import BullQueue from "bull";
import { randomBytes } from "crypto";
import moment from "moment-timezone";
import { Op } from "sequelize";
import cache from "../../libs/cache";
import sequelize from "../../database";
import AppError from "../../errors/AppError";
import logger from "../../utils/logger";
import CompaniesSettings from "../../models/CompaniesSettings";
import MetaAdAccount from "../../models/MetaAdAccount";
import MetaAdCampaign from "../../models/MetaAdCampaign";
import MetaCampaignDailyMetric from "../../models/MetaCampaignDailyMetric";
import MetaMarketingConnection from "../../models/MetaMarketingConnection";
import MetaSyncRun from "../../models/MetaSyncRun";
import { decryptMetaMarketingSecret } from "../../helpers/metaMarketingCrypto";
import { MetaMarketingGraphError, listMetaMarketingCampaignInsights } from "./MetaMarketingGraphClient";

const QUEUE_NAME = "MetaMarketingSync";
const LOCK_TTL_MS = 15 * 60 * 1000;
const STALE_RUN_MS = 2 * 60 * 60 * 1000;
const REPROCESS_DAYS = 7;
const INITIAL_BACKFILL_DAYS = 30;
const WORKER_HEARTBEAT_MS = 30000;
const WORKER_HEARTBEAT_TTL_MS = 90000;
const WORKER_HEARTBEAT_KEY = "meta-marketing:sync-worker-heartbeat";
const redisConnection = process.env.REDIS_URI || "";
const metaMarketingSyncQueue = new BullQueue(QUEUE_NAME, redisConnection);
let registered = false;
let workerHeartbeatTimer: NodeJS.Timeout | null = null;

type MetaMarketingSyncJob = {
  companyId: number;
  adAccountId: number;
  periodStart: string;
  periodEnd: string;
};

const syncJobId = (data: MetaMarketingSyncJob): string =>
  `meta-marketing:${data.adAccountId}:${data.periodStart}:${data.periodEnd}`;

const lockKey = (data: MetaMarketingSyncJob): string => `meta-marketing:sync-lock:${data.companyId}:${data.adAccountId}`;

export const getMetaMarketingSyncPeriod = (timezone: string, days: number): { periodStart: string; periodEnd: string } => {
  const now = moment().tz(timezone);
  return {
    periodStart: now.clone().subtract(days - 1, "day").format("YYYY-MM-DD"),
    periodEnd: now.format("YYYY-MM-DD")
  };
};

const syncConfiguration = (): { attributionWindow: string; resultActionType: string } => {
  const attributionWindow = process.env.META_MARKETING_ATTRIBUTION_WINDOW;
  const resultActionType = process.env.META_MARKETING_RESULT_ACTION_TYPE;
  if (!attributionWindow || !resultActionType) {
    throw new Error("META_MARKETING_SYNC_CONFIGURATION_MISSING");
  }
  return { attributionWindow, resultActionType };
};

const decimal = (value: unknown): string => {
  const normalized = String(value ?? "").trim();
  return /^\d+(\.\d+)?$/.test(normalized) ? normalized : "0";
};

const integer = (value: unknown): string => {
  const normalized = String(value ?? "").trim();
  return /^\d+$/.test(normalized) ? normalized : "0";
};

const actionValue = (actions: Array<{ action_type?: string; value?: string }> | undefined, actionType: string): string =>
  decimal((actions || []).find(action => action.action_type === actionType)?.value);

const acquireLock = async (key: string, owner: string): Promise<boolean> => {
  const redis = cache.getRedisInstance();
  return (await (redis as any).set(key, owner, "PX", LOCK_TTL_MS, "NX")) === "OK";
};

const releaseLock = async (key: string, owner: string): Promise<void> => {
  await cache.getRedisInstance().eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0",
    1,
    key,
    owner
  );
};

const renewLock = async (key: string, owner: string): Promise<boolean> =>
  (await cache.getRedisInstance().eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) end return 0",
    1,
    key,
    owner,
    LOCK_TTL_MS
  )) === 1;

const startLockRenewal = (key: string, owner: string): (() => void) => {
  const timer = setInterval(() => {
    void renewLock(key, owner).then(renewed => {
      if (!renewed) logger.warn(`Meta Marketing sync lock lost: ${key}`);
    }).catch(() => logger.warn(`Meta Marketing sync lock renewal failed: ${key}`));
  }, LOCK_TTL_MS / 3);
  return () => clearInterval(timer);
};

export const assertMetaMarketingSyncQueueConfigured = (): void => {
  if (!redisConnection) throw new AppError("META_MARKETING_QUEUE_NOT_CONFIGURED", 503);
};

const refreshWorkerHeartbeat = async (): Promise<void> => {
  await cache.getRedisInstance().set(WORKER_HEARTBEAT_KEY, String(Date.now()), "PX", WORKER_HEARTBEAT_TTL_MS);
};

const startWorkerHeartbeat = (): void => {
  void refreshWorkerHeartbeat().catch(() => logger.warn("Meta Marketing worker heartbeat failed"));
  if (workerHeartbeatTimer) return;
  workerHeartbeatTimer = setInterval(() => {
    void refreshWorkerHeartbeat().catch(() => logger.warn("Meta Marketing worker heartbeat failed"));
  }, WORKER_HEARTBEAT_MS);
  workerHeartbeatTimer.unref();
};

export const getMetaMarketingSyncQueueStatus = async (): Promise<{
  configured: boolean;
  workerHealthy: boolean;
  workerHeartbeatAt: string | null;
}> => {
  if (!redisConnection) return { configured: false, workerHealthy: false, workerHeartbeatAt: null };
  try {
    const value = await cache.getRedisInstance().get(WORKER_HEARTBEAT_KEY);
    const timestamp = Number(value);
    const now = Date.now();
    const workerHealthy = Number.isSafeInteger(timestamp) && timestamp > 0 && timestamp <= now && now - timestamp <= WORKER_HEARTBEAT_TTL_MS;
    return { configured: true, workerHealthy, workerHeartbeatAt: workerHealthy ? new Date(timestamp).toISOString() : null };
  } catch (_) {
    return { configured: true, workerHealthy: false, workerHeartbeatAt: null };
  }
};

const errorCode = (error: unknown): string => {
  if (error instanceof MetaMarketingGraphError) return error.message;
  if (error instanceof Error && /^META_MARKETING_[A-Z_]+$/.test(error.message)) return error.message;
  return "META_MARKETING_SYNC_FAILED";
};

export const processMetaMarketingSyncJob = async (job: BullQueue.Job<MetaMarketingSyncJob>): Promise<void> => {
  const data = job.data;
  const key = lockKey(data);
  const owner = randomBytes(16).toString("hex");
  if (!await acquireLock(key, owner)) return;
  const stopLockRenewal = startLockRenewal(key, owner);

  let syncRun: MetaSyncRun | null = null;
  let connection: MetaMarketingConnection | null = null;
  try {
    const account = await MetaAdAccount.findOne({ where: { id: data.adAccountId, companyId: data.companyId, status: "active" } });
    const settings = await CompaniesSettings.findOne({ where: { companyId: data.companyId }, attributes: ["metaMarketingReadEnabled"] });
    if (!account || !settings?.metaMarketingReadEnabled) return;

    connection = await MetaMarketingConnection.findOne({ where: { id: account.connectionId, companyId: data.companyId, status: "connected" } });
    if (!connection || !connection.scopes.includes("ads_read")) return;

    const startedAt = new Date();
    await MetaSyncRun.update(
      { status: "failed", errorCode: "META_MARKETING_SYNC_INTERRUPTED", finishedAt: startedAt },
      { where: { companyId: data.companyId, adAccountId: account.id, status: "running", startedAt: { [Op.lt]: new Date(startedAt.getTime() - STALE_RUN_MS) } } }
    );
    syncRun = await MetaSyncRun.create({
      companyId: data.companyId,
      adAccountId: account.id,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      status: "running",
      attempt: job.attemptsMade + 1,
      startedAt
    });
    const { attributionWindow, resultActionType } = syncConfiguration();
    const result = await listMetaMarketingCampaignInsights({
      accessToken: decryptMetaMarketingSecret(connection.accessTokenCiphertext),
      externalAccountId: account.externalAccountId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      attributionWindow
    });

    await sequelize.transaction(async transaction => {
      const receivedMetricIds = new Set<number>();
      const collectedAt = new Date();
      for (const insight of result.insights) {
        if (!insight.campaign_id || !insight.campaign_name || !insight.date_start) continue;
        let campaign = await MetaAdCampaign.findOne({ where: { adAccountId: account.id, externalCampaignId: insight.campaign_id }, transaction });
        if (!campaign) {
          campaign = await MetaAdCampaign.create({
            companyId: data.companyId,
            adAccountId: account.id,
            crmClientId: account.crmClientId,
            externalCampaignId: insight.campaign_id,
            name: insight.campaign_name,
            status: "unknown"
          }, { transaction });
        } else {
          await campaign.update({ name: insight.campaign_name }, { transaction });
        }

        const values = {
          companyId: data.companyId,
          adAccountId: account.id,
          campaignId: campaign.id,
          statDate: insight.date_start,
          spend: decimal(insight.spend),
          ctr: decimal(insight.ctr),
          cpc: decimal(insight.cpc),
          cpm: decimal(insight.cpm),
          resultValue: actionValue(insight.actions, resultActionType),
          impressions: integer(insight.impressions),
          reach: integer(insight.reach),
          clicks: integer(insight.clicks),
          resultActionType,
          currency: account.currency,
          timezone: account.timezone,
          attributionWindow,
          apiVersion: result.apiVersion,
          collectedAt
        };
        const metric = await MetaCampaignDailyMetric.findOne({ where: { adAccountId: account.id, campaignId: campaign.id, statDate: insight.date_start }, transaction });
        if (metric) {
          await metric.update(values, { transaction });
          receivedMetricIds.add(metric.id);
        } else {
          const created = await MetaCampaignDailyMetric.create(values, { transaction });
          receivedMetricIds.add(created.id);
        }
      }

      const staleValues = {
        spend: "0", ctr: "0", cpc: "0", cpm: "0", resultValue: "0",
        impressions: "0", reach: "0", clicks: "0", resultActionType,
        attributionWindow, apiVersion: result.apiVersion, collectedAt
      };
      await MetaCampaignDailyMetric.update(staleValues, {
        where: {
          adAccountId: account.id,
          statDate: { [Op.between]: [data.periodStart, data.periodEnd] },
          ...(receivedMetricIds.size ? { id: { [Op.notIn]: Array.from(receivedMetricIds) } } : {})
        },
        transaction
      });
    });

    if (Object.keys(result.rateLimitSignals).length) logger.warn(`Meta Marketing rate-limit signal: account ${account.id}`);

    await syncRun.update({ status: "completed", finishedAt: new Date() });
  } catch (error) {
    if (error instanceof MetaMarketingGraphError && error.kind === "reauthorization_required" && connection) {
      await connection.update({ status: "reauthorization_required" });
    }
    if (syncRun) await syncRun.update({ status: "failed", errorCode: errorCode(error), finishedAt: new Date() });
    throw error;
  } finally {
    stopLockRenewal();
    try {
      await releaseLock(key, owner);
    } catch (_) {
      logger.warn(`Meta Marketing sync lock release failed: ${key}`);
    }
  }
};

const enqueue = async (data: MetaMarketingSyncJob): Promise<void> => {
  assertMetaMarketingSyncQueueConfigured();
  await metaMarketingSyncQueue.add("sync-account", data, {
    jobId: syncJobId(data),
    attempts: 3,
    backoff: { type: "exponential", delay: 60000 },
    removeOnComplete: true,
    removeOnFail: true
  });
};

export const enqueueMetaMarketingInitialBackfill = async (companyId: number, adAccountId: number): Promise<void> => {
  const account = await MetaAdAccount.findOne({ where: { id: adAccountId, companyId, status: "active" } });
  if (!account) return;
  await enqueue({ companyId, adAccountId, ...getMetaMarketingSyncPeriod(account.timezone, INITIAL_BACKFILL_DAYS) });
};

const enqueueRecentAccountSyncs = async (): Promise<void> => {
  const accounts = await MetaAdAccount.findAll({ where: { status: "active" }, attributes: ["id", "companyId", "timezone"] });
  await Promise.all(accounts.map(account => enqueue({
    companyId: account.companyId,
    adAccountId: account.id,
    ...getMetaMarketingSyncPeriod(account.timezone, REPROCESS_DAYS)
  })));
};

export const registerMetaMarketingSyncQueue = async (): Promise<void> => {
  if (registered) return;
  if (!redisConnection) {
    logger.warn("Meta Marketing sync disabled: META_MARKETING_QUEUE_NOT_CONFIGURED");
    return;
  }
  metaMarketingSyncQueue.process("sync-account", 2, processMetaMarketingSyncJob);
  metaMarketingSyncQueue.process("enqueue-recent", 1, enqueueRecentAccountSyncs);
  registered = true;
  startWorkerHeartbeat();
  try {
    await metaMarketingSyncQueue.add("enqueue-recent", {}, {
      jobId: "meta-marketing:daily-reprocess",
      repeat: { cron: "0 15 2 * * *" },
      removeOnComplete: true
    });
  } catch (error) {
    logger.error(`Meta Marketing scheduler registration failed: ${errorCode(error)}`);
  }
  metaMarketingSyncQueue.on("failed", (job, error) => {
    logger.error(`Meta Marketing sync failed: ${job.id} ${errorCode(error)}`);
  });
};
