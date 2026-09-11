import MetaSyncRun from "../../models/MetaSyncRun";
import { assertCanViewMetaMarketingOperations } from "./MetaMarketingOAuthService";
import { getMetaMarketingSyncQueueStatus } from "./MetaMarketingSyncQueue";

const runJson = (run: MetaSyncRun): Record<string, unknown> =>
  typeof (run as any).toJSON === "function" ? (run as any).toJSON() : run as any;

export const getMetaMarketingOperations = async (input: {
  companyId: number;
  userId: number;
}): Promise<Record<string, unknown>> => {
  await assertCanViewMetaMarketingOperations(input.companyId, input.userId);
  const [recentRows, lastCompleted, queue] = await Promise.all([
    MetaSyncRun.findAll({
      where: { companyId: input.companyId },
      attributes: ["id", "adAccountId", "periodStart", "periodEnd", "status", "attempt", "errorCode", "startedAt", "finishedAt"],
      order: [["startedAt", "DESC"]],
      limit: 20
    }),
    MetaSyncRun.findOne({
      where: { companyId: input.companyId, status: "completed" },
      attributes: ["finishedAt"],
      order: [["finishedAt", "DESC"]]
    }),
    getMetaMarketingSyncQueueStatus()
  ]);
  const recentRuns = recentRows.map(runJson);
  const lastCompletedAt = lastCompleted?.finishedAt || null;

  return {
    queue,
    recentJobs: {
      recent: recentRuns.length,
      running: recentRuns.filter(run => run.status === "running").length,
      failed: recentRuns.filter(run => run.status === "failed").length,
      highestAttempt: recentRuns.reduce((highest, run) => Math.max(highest, Number(run.attempt) || 0), 0)
    },
    lastCompletedAt,
    lastSyncAgeSeconds: lastCompletedAt ? Math.floor((Date.now() - new Date(lastCompletedAt).getTime()) / 1000) : null,
    recentRuns
  };
};
