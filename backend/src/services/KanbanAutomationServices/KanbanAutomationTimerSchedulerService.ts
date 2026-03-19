import Cron from "node-cron";
import { Op } from "sequelize";
import EventBus from "../../libs/EventBus";
import KanbanAutomationTimer from "../../models/KanbanAutomationTimer";
import KanbanAutomationRunAction from "../../models/KanbanAutomationRunAction";
import KanbanAutomationRun from "../../models/KanbanAutomationRun";
import Opportunity from "../../models/Opportunity";
import User from "../../models/User";
import MoveOpportunityService from "../OpportunityServices/MoveOpportunityService";
import logger from "../../utils/logger";
import { trackMetric } from "../SystemMetricService";

const RETRY_BACKOFF_MINUTES = [1, 5, 15];

const isRetryableError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  const name = String(error?.name || "").toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("temporar") ||
    message.includes("deadlock") ||
    message.includes("econnreset") ||
    name.includes("timeout") ||
    name.includes("deadlock")
  );
};

const classifyError = (error: any) =>
  isRetryableError(error)
    ? error?.name?.toLowerCase().includes("deadlock")
      ? "RETRYABLE_DB_ERROR"
      : "RETRYABLE_PROVIDER_ERROR"
    : "NON_RETRYABLE_ACTION_ERROR";

export const refreshKanbanAutomationRunStatus = async (runId: number) => {
  const run = await KanbanAutomationRun.findByPk(runId);
  if (!run) return;

  const actions = await KanbanAutomationRunAction.findAll({ where: { runId } });
  if (!actions.length) return;

  const statuses = actions.map(action => action.status);
  let nextStatus = run.status;

  if (statuses.some(status => status === "running" || status === "scheduled")) {
    nextStatus = "running";
  } else if (statuses.some(status => status === "failed")) {
    nextStatus = "failed";
  } else if (statuses.every(status => status === "cancelled")) {
    nextStatus = "cancelled";
  } else {
    nextStatus = "completed";
  }

  await run.update({
    status: nextStatus,
    completedAt: nextStatus === "completed" || nextStatus === "failed" || nextStatus === "cancelled"
      ? new Date()
      : run.completedAt
  });
};

export const executeKanbanAutomationAction = async (action: KanbanAutomationRunAction) => {
  if (action.status !== "scheduled" && action.status !== "running") {
    return;
  }

  const nextAttempts = (action.attempts || 0) + 1;
  await action.update({
    status: "running",
    attempts: nextAttempts,
    lastAttemptAt: new Date(),
    errorClass: null,
    errorMessage: null
  });

  try {
    const payload = action.payloadSnapshot || {};

    switch (action.actionKind) {
      case "move_card":
        await MoveOpportunityService({
          opportunityId: action.opportunityId,
          toStageId: payload?.config?.stageId,
          companyId: action.companyId,
          movedBy: "AUTOMATION",
          reason: `Kanban automation action ${action.actionNodeId}`
        });
        break;

      case "assign_user": {
        const targetUserId = Number(payload?.config?.userId);
        const user = await User.findOne({ where: { id: targetUserId, companyId: action.companyId } });
        if (!user) {
          throw new Error(`Target user ${targetUserId} not found for assign_user action.`);
        }
        await Opportunity.update(
          { assignedUserId: targetUserId },
          { where: { id: action.opportunityId, companyId: action.companyId } }
        );
        break;
      }

      default:
        throw new Error(`Action kind ${action.actionKind} is not supported in active mode.`);
    }

    await action.update({
      status: "completed",
      completedAt: new Date(),
      resultSnapshot: {
        actionKind: action.actionKind,
        completedAt: new Date().toISOString()
      }
    });

    await trackMetric("PRODUCT_EVENT", "KANBAN_AUTOMATION_ACTION_COMPLETED", {
      companyId: action.companyId,
      metadata: {
        actionId: action.id,
        actionKind: action.actionKind
      }
    });
  } catch (error) {
    const errorClass = classifyError(error);
    const shouldRetry = isRetryableError(error) && nextAttempts < 3;

    await action.update({
      status: shouldRetry ? "scheduled" : "failed",
      scheduledFor: shouldRetry
        ? new Date(Date.now() + RETRY_BACKOFF_MINUTES[nextAttempts - 1] * 60 * 1000)
        : action.scheduledFor,
      errorClass,
      errorMessage: String(error?.message || error),
      completedAt: shouldRetry ? null : new Date()
    });

    await trackMetric("PRODUCT_EVENT", "KANBAN_AUTOMATION_ACTION_FAILED", {
      companyId: action.companyId,
      metadata: {
        actionId: action.id,
        actionKind: action.actionKind,
        errorClass,
        retryScheduled: shouldRetry
      }
    });

    logger.error({
      actionId: action.id,
      runId: action.runId,
      companyId: action.companyId,
      errorClass,
      err: error
    }, "[KanbanAutomation] Action execution failed");
  } finally {
    await refreshKanbanAutomationRunStatus(action.runId);
  }
};

class KanbanAutomationTimerSchedulerService {
  private static initialized = false;

  public static init() {
    if (this.initialized) return;
    this.initialized = true;

    Cron.schedule("* * * * *", () => {
      this.processDueTimers().catch(error => {
        logger.error({ err: error }, "[KanbanAutomation] Failed to process due timers");
      });
      this.processDueActions().catch(error => {
        logger.error({ err: error }, "[KanbanAutomation] Failed to process due actions");
      });
    });

    Cron.schedule("10 3 * * *", () => {
      this.cleanupExpiredRows().catch(error => {
        logger.error({ err: error }, "[KanbanAutomation] Failed to cleanup Kanban automation runtime rows");
      });
    });

    this.recoverStuckActions().catch(error => {
      logger.error({ err: error }, "[KanbanAutomation] Failed to recover stuck actions");
    });
  }

  private static async processDueTimers() {
    const dueTimers = await KanbanAutomationTimer.findAll({
      where: {
        status: "scheduled",
        dueAt: {
          [Op.lte]: new Date()
        }
      },
      order: [["dueAt", "ASC"]],
      limit: 200
    });

    for (const timer of dueTimers) {
      const [affectedRows] = await KanbanAutomationTimer.update({
        status: "fired",
        firedAt: new Date()
      }, {
        where: {
          id: timer.id,
          status: "scheduled"
        }
      });

      if (!affectedRows) continue;

      const eventType = timer.triggerKind === "card.in_stage_for"
        ? "OPPORTUNITY_STAGE_TIMEOUT"
        : "OPPORTUNITY_INACTIVITY_TIMEOUT";

      await EventBus.publish(eventType, {
        automationId: timer.automationId,
        opportunityId: timer.opportunityId,
        pipelineId: timer.pipelineId,
        stageId: timer.stageId,
        baselineAt: timer.baselineAt,
        dueAt: timer.dueAt,
        thresholdMinutes: timer.thresholdMinutes,
        timerId: timer.id,
        mode: timer.mode,
        sourceEventId: timer.sourceEventId,
        sourceIdempotencyKey: timer.sourceIdempotencyKey,
        correlationId: timer.correlationId,
        triggerKind: timer.triggerKind
      }, timer.companyId);
    }
  }

  private static async processDueActions() {
    const dueActions = await KanbanAutomationRunAction.findAll({
      where: {
        status: "scheduled",
        scheduledFor: {
          [Op.lte]: new Date()
        }
      },
      order: [["scheduledFor", "ASC"]],
      limit: 200
    });

    for (const action of dueActions) {
      await executeKanbanAutomationAction(action);
    }
  }

  private static async recoverStuckActions() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    await KanbanAutomationRunAction.update({
      status: "scheduled"
    }, {
      where: {
        status: "running",
        updatedAt: {
          [Op.lte]: fifteenMinutesAgo
        }
      }
    });
  }

  private static async cleanupExpiredRows() {
    const now = Date.now();
    const shadowRunCutoff = new Date(now - 45 * 24 * 60 * 60 * 1000);
    const activeRunCutoff = new Date(now - 180 * 24 * 60 * 60 * 1000);
    const timerCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const shadowRunIds = (await KanbanAutomationRun.findAll({
      where: {
        mode: "shadow",
        status: { [Op.in]: ["completed", "failed", "cancelled", "skipped"] },
        createdAt: { [Op.lte]: shadowRunCutoff }
      },
      limit: 1000,
      order: [["id", "ASC"]]
    })).map(run => run.id);

    const activeRunIds = (await KanbanAutomationRun.findAll({
      where: {
        mode: "active",
        status: { [Op.in]: ["completed", "failed", "cancelled", "skipped"] },
        createdAt: { [Op.lte]: activeRunCutoff }
      },
      limit: 1000,
      order: [["id", "ASC"]]
    })).map(run => run.id);

    const timerIds = (await KanbanAutomationTimer.findAll({
      where: {
        status: { [Op.in]: ["fired", "cancelled"] },
        updatedAt: { [Op.lte]: timerCutoff }
      },
      limit: 1000,
      order: [["id", "ASC"]]
    })).map(timer => timer.id);

    const deletedShadowRuns = shadowRunIds.length
      ? await KanbanAutomationRun.destroy({ where: { id: shadowRunIds } })
      : 0;
    const deletedActiveRuns = activeRunIds.length
      ? await KanbanAutomationRun.destroy({ where: { id: activeRunIds } })
      : 0;
    const deletedTimers = timerIds.length
      ? await KanbanAutomationTimer.destroy({ where: { id: timerIds } })
      : 0;

    logger.info({
      deletedShadowRuns,
      deletedActiveRuns,
      deletedTimers
    }, "[KanbanAutomation] Cleanup finished");
  }
}

export default KanbanAutomationTimerSchedulerService;
