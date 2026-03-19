import { Op } from "sequelize";
import EventBus, { EventData } from "../../libs/EventBus";
import CompaniesSettings from "../../models/CompaniesSettings";
import KanbanAutomation from "../../models/KanbanAutomation";
import KanbanAutomationRun from "../../models/KanbanAutomationRun";
import KanbanAutomationRunAction from "../../models/KanbanAutomationRunAction";
import KanbanAutomationTimer from "../../models/KanbanAutomationTimer";
import Opportunity from "../../models/Opportunity";
import OpportunityMovement from "../../models/OpportunityMovement";
import OpportunityEvent from "../../models/OpportunityEvent";
import TicketTag from "../../models/TicketTag";
import LeadTag from "../../models/LeadTag";
import logger from "../../utils/logger";
import { trackMetric } from "../SystemMetricService";
import {
  buildEmptyRunSummary,
  ensureKanbanAutomationRuntimePlanFresh,
  isPlanActiveModeSafe
} from "./CompileKanbanAutomationPlanService";
import { executeKanbanAutomationAction, refreshKanbanAutomationRunStatus } from "./KanbanAutomationTimerSchedulerService";

const SHADOW_EVENT_TYPES = [
  "OPPORTUNITY_CREATED",
  "OPPORTUNITY_MOVED",
  "OPPORTUNITY_UPDATED",
  "OPPORTUNITY_STAGE_TIMEOUT",
  "OPPORTUNITY_INACTIVITY_TIMEOUT"
];

const ACTIVE_ACTION_KINDS = new Set(["move_card"]);

class KanbanAutomationShadowRouterService {
  private static initialized = false;

  public static init() {
    if (this.initialized) return;
    this.initialized = true;

    SHADOW_EVENT_TYPES.forEach(eventType => {
      EventBus.subscribe(eventType, this.handleEvent.bind(this));
    });
  }

  private static async handleEvent(event: EventData) {
    await trackMetric("PRODUCT_EVENT", "KANBAN_AUTOMATION_EVENT_INGESTED", {
      companyId: event.companyId,
      metadata: {
        eventType: event.type,
        eventId: event.id
      }
    });

    const settings = await this.getCompanySettings(event.companyId);
    if (!settings.kanbanAutomationCompilerEnabled) {
      return;
    }
    if (!settings.kanbanAutomationShadowMode && !settings.kanbanAutomationActiveMode) {
      return;
    }

    const canonicalEvent = await this.normalizeEvent(event);
    if (!canonicalEvent) return;

    const automationWhere: Record<string, any> = {
      company_id: event.companyId,
      status: true
    };
    if (canonicalEvent.payload?.automationId) {
      automationWhere.id = canonicalEvent.payload.automationId;
    }

    const automations = await KanbanAutomation.findAll({
      where: automationWhere,
      order: [["id", "ASC"]]
    });

    for (const automation of automations) {
      const { runtimePlan, compilerStatus } = await ensureKanbanAutomationRuntimePlanFresh(automation, {
        legacyFallbackEnabled: settings.kanbanAutomationLegacyFallbackEnabled
      });

      if (compilerStatus !== "VALID" || !runtimePlan) {
        continue;
      }

      if (runtimePlan?.trigger?.kind === "card.in_stage_for" || runtimePlan?.trigger?.kind === "card.inactive_for") {
        if (canonicalEvent.isBaseEvent) {
          await this.reconcileTimersForPlan(automation, runtimePlan, canonicalEvent, settings);
          continue;
        }

        if (!this.timeoutEventMatchesPlan(runtimePlan, canonicalEvent)) {
          continue;
        }

        const timeoutStillValid = await this.validateTimeoutEvent(automation, runtimePlan, canonicalEvent);
        if (!timeoutStillValid) {
          continue;
        }
      }

      if (!this.eventMatchesTrigger(runtimePlan, canonicalEvent)) {
        continue;
      }

      const modes: Array<"shadow" | "active"> = [];
      if (settings.kanbanAutomationShadowMode) {
        modes.push("shadow");
      }
      if (settings.kanbanAutomationActiveMode && isPlanActiveModeSafe(runtimePlan)) {
        modes.push("active");
      }

      for (const mode of modes) {
        await this.executePlanForMode({
          automation,
          runtimePlan,
          event: canonicalEvent,
          mode
        });
      }

      if (settings.kanbanAutomationActiveMode && !isPlanActiveModeSafe(runtimePlan) && settings.kanbanAutomationShadowMode) {
        logger.warn({
          automationId: automation.id,
          companyId: automation.company_id,
          actionKinds: (runtimePlan.actions || []).map((action: any) => action.kind)
        }, "[KanbanAutomation] Active mode skipped because plan contains compile-only actions");
      }
    }
  }

  private static async getCompanySettings(companyId: number) {
    const [settings] = await CompaniesSettings.findOrCreate({
      where: { companyId },
      defaults: { companyId }
    });
    return settings;
  }

  private static async normalizeEvent(event: EventData) {
    const opportunityId = Number(event.payload?.opportunityId);
    if (!opportunityId) return null;

    const opportunity = await Opportunity.findOne({
      where: { id: opportunityId, companyId: event.companyId }
    });
    if (!opportunity) return null;

    const tagIds = await this.loadTagIds(opportunity);
    const occurredAt = event.payload?.updatedAt || event.payload?.movedAt || event.payload?.createdAt || event.payload?.dueAt || event.createdAt;

    let idempotencyKey = `${event.type}:${opportunityId}:${String(occurredAt)}`;
    if (event.type === "OPPORTUNITY_CREATED") {
      idempotencyKey = `OPPORTUNITY_CREATED:${opportunityId}:${new Date(event.payload?.createdAt || occurredAt).toISOString()}`;
    } else if (event.type === "OPPORTUNITY_MOVED") {
      idempotencyKey = `OPPORTUNITY_MOVED:${opportunityId}:${event.payload?.movementId}`;
    } else if (event.type === "OPPORTUNITY_UPDATED") {
      idempotencyKey = `OPPORTUNITY_UPDATED:${opportunityId}:${event.payload?.version}`;
    } else if (event.type === "OPPORTUNITY_STAGE_TIMEOUT") {
      idempotencyKey = `OPPORTUNITY_STAGE_TIMEOUT:${event.payload?.automationId}:${event.payload?.mode}:${opportunityId}:${event.payload?.stageId}:${new Date(event.payload?.baselineAt).toISOString()}:${event.payload?.thresholdMinutes}`;
    } else if (event.type === "OPPORTUNITY_INACTIVITY_TIMEOUT") {
      idempotencyKey = `OPPORTUNITY_INACTIVITY_TIMEOUT:${event.payload?.automationId}:${event.payload?.mode}:${opportunityId}:${new Date(event.payload?.baselineAt).toISOString()}:${event.payload?.thresholdMinutes}`;
    }

    return {
      schemaVersion: 1,
      eventType: event.type,
      eventId: event.id,
      idempotencyKey,
      correlationId: String(event.payload?.correlationId || event.id),
      causationId: event.payload?.sourceEventId || null,
      companyId: event.companyId,
      aggregateType: "opportunity",
      aggregateId: opportunityId,
      occurredAt: new Date(occurredAt).toISOString(),
      publishedAt: new Date(event.createdAt).toISOString(),
      source: this.mapEventSource(event.type),
      payload: event.payload,
      opportunity,
      tagIds,
      isBaseEvent: ["OPPORTUNITY_CREATED", "OPPORTUNITY_MOVED", "OPPORTUNITY_UPDATED"].includes(event.type)
    };
  }

  private static async loadTagIds(opportunity: Opportunity) {
    const ticketTagRows = opportunity.ticketId
      ? await TicketTag.findAll({ where: { ticketId: opportunity.ticketId } })
      : [];
    const leadTagRows = opportunity.leadId
      ? await LeadTag.findAll({ where: { leadId: opportunity.leadId } })
      : [];
    return Array.from(new Set([
      ...ticketTagRows.map(tag => Number(tag.tagId)),
      ...leadTagRows.map(tag => Number(tag.tagId))
    ]));
  }

  private static mapEventSource(eventType: string) {
    switch (eventType) {
      case "OPPORTUNITY_CREATED":
        return "opportunity-service.create";
      case "OPPORTUNITY_MOVED":
        return "opportunity-service.move";
      case "OPPORTUNITY_UPDATED":
        return "opportunity-service.update";
      default:
        return "kanban-timer-scheduler";
    }
  }

  private static eventMatchesTrigger(runtimePlan: any, event: any) {
    const trigger = runtimePlan?.trigger;
    if (!trigger || trigger.state !== "RESOLVED") return false;

    const kindByEvent: Record<string, string> = {
      "OPPORTUNITY_CREATED": "card.created",
      "OPPORTUNITY_MOVED": "card.moved_to_stage",
      "OPPORTUNITY_UPDATED": "card.updated",
      "OPPORTUNITY_STAGE_TIMEOUT": "card.in_stage_for",
      "OPPORTUNITY_INACTIVITY_TIMEOUT": "card.inactive_for"
    };

    if (kindByEvent[event.eventType] !== trigger.kind) {
      return false;
    }

    const filters = trigger.filters || {};
    if (Array.isArray(filters.pipelineIds) && filters.pipelineIds.length > 0 && !filters.pipelineIds.includes(Number(event.opportunity.pipelineId))) {
      return false;
    }
    if (Array.isArray(filters.stageIds) && filters.stageIds.length > 0 && !filters.stageIds.includes(Number(event.opportunity.stageId))) {
      return false;
    }
    if (Array.isArray(filters.fromStageIds) && filters.fromStageIds.length > 0 && !filters.fromStageIds.includes(Number(event.payload?.fromStageId))) {
      return false;
    }
    if (Array.isArray(filters.toStageIds) && filters.toStageIds.length > 0) {
      const currentTarget = Number(event.payload?.toStageId || event.payload?.stageId || event.opportunity.stageId);
      if (!filters.toStageIds.includes(currentTarget)) {
        return false;
      }
    }
    if (Array.isArray(filters.assignedUserIds) && filters.assignedUserIds.length > 0) {
      if (!filters.assignedUserIds.includes(Number(event.opportunity.assignedUserId))) {
        return false;
      }
    }
    if (Array.isArray(filters.tagIds) && filters.tagIds.length > 0) {
      if (!filters.tagIds.some((tagId: number) => event.tagIds.includes(Number(tagId)))) {
        return false;
      }
    }
    return true;
  }

  private static timeoutEventMatchesPlan(runtimePlan: any, event: any) {
    if (!event.payload?.automationId) return true;
    return Number(event.payload.automationId) === Number(runtimePlan?.source?.automationId);
  }

  private static async executePlanForMode({
    automation,
    runtimePlan,
    event,
    mode
  }: {
    automation: KanbanAutomation;
    runtimePlan: any;
    event: any;
    mode: "shadow" | "active";
  }) {
    const [run, created] = await KanbanAutomationRun.findOrCreate({
      where: {
        companyId: automation.company_id,
        automationId: automation.id,
        sourceIdempotencyKey: event.idempotencyKey,
        mode
      },
      defaults: {
        companyId: automation.company_id,
        automationId: automation.id,
        opportunityId: event.aggregateId,
        sourceEventType: event.eventType,
        sourceEventId: event.eventId,
        sourceIdempotencyKey: event.idempotencyKey,
        correlationId: event.correlationId,
        causationId: event.causationId,
        mode,
        status: "planned",
        triggerMatch: true,
        conditionsMatch: false,
        runtimePlanVersion: runtimePlan.planVersion,
        runtimePlanCompilerVersion: runtimePlan.compilerVersion,
        runtimePlanSourceHash: runtimePlan.source.sourceHash,
        diagnostics: [],
        summary: buildEmptyRunSummary(),
        startedAt: new Date()
      }
    });

    if (!created) {
      await trackMetric("PRODUCT_EVENT", "KANBAN_AUTOMATION_DUPLICATE_SUPPRESSED", {
        companyId: automation.company_id,
        metadata: {
          automationId: automation.id,
          mode,
          sourceIdempotencyKey: event.idempotencyKey
        }
      });
      return;
    }

    const summary = buildEmptyRunSummary();
    summary.trigger.matched = true;

    const conditionResult = await this.evaluateConditions(runtimePlan.conditions?.all || [], event);
    summary.conditions = conditionResult.summary;

    if (!conditionResult.matched) {
      await run.update({
        status: "skipped",
        conditionsMatch: false,
        summary,
        completedAt: new Date()
      });
      return;
    }

    if (mode === "active" && !isPlanActiveModeSafe(runtimePlan)) {
      summary.discrepancies.push({
        code: "ACTIVE_MODE_UNSUPPORTED_ACTION_SET",
        message: "Plan contains compile-only actions and cannot execute in active mode."
      });
      await run.update({
        status: "skipped",
        conditionsMatch: true,
        summary,
        completedAt: new Date()
      });
      return;
    }

    const plannedActions = this.materializeActions(runtimePlan.actions || [], event, mode);
    summary.plannedActions = plannedActions.map(action => ({
      actionNodeId: action.actionNodeId,
      actionKind: action.actionKind,
      scheduledFor: action.scheduledFor
    }));

    if (mode === "shadow") {
      const shadowReview = this.buildShadowReviewSummary(runtimePlan, plannedActions);
      summary.discrepancies.push(...shadowReview.discrepancies);
      summary.fallbackUsed = shadowReview.fallbackUsed;
    }

    if (!plannedActions.length) {
      await run.update({
        status: "skipped",
        conditionsMatch: true,
        summary,
        completedAt: new Date()
      });
      return;
    }

    for (const plannedAction of plannedActions) {
      await KanbanAutomationRunAction.create({
        companyId: automation.company_id,
        runId: run.id,
        opportunityId: event.aggregateId,
        actionNodeId: plannedAction.actionNodeId,
        actionKind: plannedAction.actionKind,
        sequenceNo: plannedAction.sequenceNo,
        delayMinutes: plannedAction.delayMinutes,
        scheduledFor: plannedAction.scheduledFor,
        status: mode === "shadow" ? "shadowed" : "scheduled",
        idempotencyKey: plannedAction.idempotencyKey,
        payloadSnapshot: plannedAction.payloadSnapshot
      });
    }

    await run.update({
      status: mode === "shadow" ? "completed" : "running",
      triggerMatch: true,
      conditionsMatch: true,
      summary,
      completedAt: mode === "shadow" ? new Date() : null
    });

    await trackMetric("PRODUCT_EVENT", mode === "shadow" ? "KANBAN_AUTOMATION_SHADOW_RUN_CREATED" : "KANBAN_AUTOMATION_RUN_PLANNED", {
      companyId: automation.company_id,
      metadata: {
        automationId: automation.id,
        mode,
        runId: run.id
      }
    });

    if (mode === "shadow" && summary.discrepancies.length > 0) {
      await trackMetric("PRODUCT_EVENT", "KANBAN_AUTOMATION_SHADOW_RUN_DISCREPANCY", {
        companyId: automation.company_id,
        metadata: {
          automationId: automation.id,
          runId: run.id,
          discrepancyCount: summary.discrepancies.length,
          discrepancyCodes: summary.discrepancies.map((entry: any) => entry.code)
        }
      });

      logger.warn({
        automationId: automation.id,
        companyId: automation.company_id,
        runId: run.id,
        discrepancyCodes: summary.discrepancies.map((entry: any) => entry.code)
      }, "[KanbanAutomation] Shadow run recorded discrepancies for homologation review");
    }

    if (mode === "active") {
      const immediateActions = await KanbanAutomationRunAction.findAll({
        where: {
          runId: run.id,
          status: "scheduled",
          scheduledFor: {
            [Op.lte]: new Date()
          }
        }
      });

      for (const action of immediateActions) {
        await executeKanbanAutomationAction(action);
      }

      await refreshKanbanAutomationRunStatus(run.id);
    }
  }

  private static materializeActions(actions: any[], event: any, mode: "shadow" | "active") {
    const triggeredAt = new Date(event.occurredAt);
    return actions
      .filter((action: any) => mode === "shadow" || ACTIVE_ACTION_KINDS.has(action.kind))
      .map((action: any, index: number) => {
        const delayMinutes = Number(action?.delay?.minutes || 0);
        const scheduledFor = new Date(triggeredAt.getTime() + delayMinutes * 60 * 1000);
        const payloadSnapshot = {
          config: action.config,
          sourceEventType: event.eventType,
          sourceEventId: event.eventId,
          sourceIdempotencyKey: event.idempotencyKey
        };
        return {
          actionNodeId: action.id,
          actionKind: action.kind,
          sequenceNo: index + 1,
          delayMinutes,
          scheduledFor,
          payloadSnapshot,
          idempotencyKey: `${mode}:${event.idempotencyKey}:${action.id}:${index + 1}:${scheduledFor.toISOString()}`
        };
      });
  }

  private static buildShadowReviewSummary(runtimePlan: any, plannedActions: any[]) {
    const discrepancies: Array<Record<string, any>> = [];
    const compileOnlyActions = plannedActions.filter(action => !ACTIVE_ACTION_KINDS.has(action.actionKind));

    compileOnlyActions.forEach(action => {
      discrepancies.push({
        code: "SHADOW_COMPILE_ONLY_ACTION",
        message: `Action '${action.actionKind}' is shadow-reviewed only in Phase 1 and will not activate automatically.`,
        details: {
          actionKind: action.actionKind,
          actionNodeId: action.actionNodeId
        }
      });
    });

    const fallbackDiagnostics = Array.isArray(runtimePlan?.diagnostics)
      ? runtimePlan.diagnostics.filter((diagnostic: any) => diagnostic?.code === "LEGACY_FALLBACK_USED")
      : [];

    fallbackDiagnostics.forEach((diagnostic: any) => {
      discrepancies.push({
        code: "LEGACY_FALLBACK_USED",
        message: diagnostic.message,
        details: diagnostic.details || {}
      });
    });

    return {
      discrepancies,
      fallbackUsed: fallbackDiagnostics.length > 0
    };
  }

  private static async evaluateConditions(conditions: any[], event: any) {
    const evaluated: any[] = [];
    for (const condition of conditions) {
      const actualValue = await this.resolveConditionFactValue(condition.fact, condition.value, event);
      const matched = this.evaluateOperator(condition.operator, actualValue, condition.value, condition.fact);
      evaluated.push({
        fact: condition.fact,
        operator: condition.operator,
        expected: condition.value,
        actual: actualValue,
        matched
      });
      if (!matched) {
        return {
          matched: false,
          summary: {
            matched: false,
            evaluated
          }
        };
      }
    }

    return {
      matched: true,
      summary: {
        matched: true,
        evaluated
      }
    };
  }

  private static async resolveConditionFactValue(fact: string, expectedValue: any, event: any) {
    switch (fact) {
      case "companyId":
        return event.companyId;
      case "pipelineId":
        return Number(event.opportunity.pipelineId);
      case "stageId":
        return Number(event.opportunity.stageId);
      case "fromStageId":
        return Number(event.payload?.fromStageId || 0);
      case "toStageId":
        return Number(event.payload?.toStageId || event.payload?.stageId || event.opportunity.stageId);
      case "assignedUserId":
        return Number(event.opportunity.assignedUserId || 0);
      case "status":
        return event.opportunity.status;
      case "value":
        return Number(event.opportunity.value || 0);
      case "hasTagId":
        return event.tagIds.includes(Number(expectedValue));
      case "missingTagId":
        return !event.tagIds.includes(Number(expectedValue));
      case "inStageForMinutes":
      case "inactiveForMinutes":
        return Number(event.payload?.thresholdMinutes || 0);
      default:
        return null;
    }
  }

  private static evaluateOperator(operator: string, actual: any, expected: any, fact: string) {
    if (fact === "hasTagId" || fact === "missingTagId") {
      return Boolean(actual);
    }

    switch (operator) {
      case "eq":
        return actual == expected;
      case "neq":
        return actual != expected;
      case "gte":
        return Number(actual) >= Number(expected);
      case "lte":
        return Number(actual) <= Number(expected);
      case "gt":
        return Number(actual) > Number(expected);
      case "lt":
        return Number(actual) < Number(expected);
      case "contains":
        return Array.isArray(actual) ? actual.includes(expected) : String(actual || "").includes(String(expected));
      case "not_contains":
        return Array.isArray(actual) ? !actual.includes(expected) : !String(actual || "").includes(String(expected));
      default:
        return actual == expected;
    }
  }

  private static async reconcileTimersForPlan(
    automation: KanbanAutomation,
    runtimePlan: any,
    event: any,
    settings: CompaniesSettings
  ) {
    const modes: Array<"shadow" | "active"> = [];
    if (settings.kanbanAutomationShadowMode) modes.push("shadow");
    if (settings.kanbanAutomationActiveMode && isPlanActiveModeSafe(runtimePlan)) modes.push("active");

    for (const mode of modes) {
      if (runtimePlan.trigger.kind === "card.in_stage_for") {
        await this.reconcileInStageTimer(automation, runtimePlan, event, mode);
      }
      if (runtimePlan.trigger.kind === "card.inactive_for") {
        await this.reconcileInactivityTimer(automation, runtimePlan, event, mode);
      }
    }
  }

  private static async cancelTimers(
    automationId: number,
    companyId: number,
    opportunityId: number,
    mode: "shadow" | "active",
    reason: string
  ) {
    const [cancelledCount] = await KanbanAutomationTimer.update({
      status: "cancelled",
      cancelReason: reason,
      cancelledAt: new Date()
    }, {
      where: {
        automationId,
        opportunityId,
        mode,
        status: "scheduled"
      }
    });

    if (cancelledCount > 0) {
      await trackMetric("PRODUCT_EVENT", "KANBAN_AUTOMATION_TIMER_CANCELLED", {
        companyId,
        metadata: {
          automationId,
          opportunityId,
          mode,
          reason,
          cancelledCount
        }
      });
    }
  }

  private static async reconcileInStageTimer(
    automation: KanbanAutomation,
    runtimePlan: any,
    event: any,
    mode: "shadow" | "active"
  ) {
    if (event.opportunity.status !== "OPEN") {
      await this.cancelTimers(automation.id, automation.company_id, event.aggregateId, mode, "OPPORTUNITY_CLOSED");
      return;
    }

    const targetStageIds = runtimePlan?.trigger?.filters?.toStageIds?.length
      ? runtimePlan.trigger.filters.toStageIds
      : runtimePlan?.trigger?.filters?.stageIds || [];
    const currentStageId = Number(event.opportunity.stageId);
    const matchesStage = !targetStageIds.length || targetStageIds.includes(currentStageId);

    if (!matchesStage) {
      await this.cancelTimers(automation.id, automation.company_id, event.aggregateId, mode, "STAGE_LEFT");
      return;
    }

    const baselineAt = new Date(event.eventType === "OPPORTUNITY_CREATED"
      ? event.payload?.createdAt || event.occurredAt
      : event.payload?.toStageId
        ? event.payload?.movedAt || event.occurredAt
        : event.occurredAt);
    const thresholdMinutes = Number(runtimePlan?.trigger?.timing?.minutes || 0);
    const timerKey = `${automation.id}:${mode}:card.in_stage_for:${event.aggregateId}:${currentStageId}:${baselineAt.toISOString()}:${thresholdMinutes}`;

    await this.cancelTimers(automation.id, automation.company_id, event.aggregateId, mode, "TIMER_RESET");
    const [, created] = await KanbanAutomationTimer.findOrCreate({
      where: {
        companyId: automation.company_id,
        mode,
        timerKey
      },
      defaults: {
        companyId: automation.company_id,
        automationId: automation.id,
        opportunityId: event.aggregateId,
        pipelineId: event.opportunity.pipelineId,
        stageId: currentStageId,
        mode,
        triggerKind: "card.in_stage_for",
        thresholdMinutes,
        timerKey,
        baselineAt,
        dueAt: new Date(baselineAt.getTime() + thresholdMinutes * 60 * 1000),
        sourceEventId: event.eventId,
        sourceIdempotencyKey: event.idempotencyKey,
        correlationId: event.correlationId,
        payload: {
          automationId: automation.id,
          opportunityId: event.aggregateId,
          stageId: currentStageId
        }
      }
    });

    if (created) {
      await trackMetric("PRODUCT_EVENT", "KANBAN_AUTOMATION_TIMER_SCHEDULED", {
        companyId: automation.company_id,
        metadata: {
          automationId: automation.id,
          opportunityId: event.aggregateId,
          mode,
          triggerKind: "card.in_stage_for"
        }
      });
    }
  }

  private static async reconcileInactivityTimer(
    automation: KanbanAutomation,
    runtimePlan: any,
    event: any,
    mode: "shadow" | "active"
  ) {
    if (event.opportunity.status !== "OPEN") {
      await this.cancelTimers(automation.id, automation.company_id, event.aggregateId, mode, "OPPORTUNITY_CLOSED");
      return;
    }

    const filters = runtimePlan?.trigger?.filters || {};
    if (Array.isArray(filters.stageIds) && filters.stageIds.length > 0 && !filters.stageIds.includes(Number(event.opportunity.stageId))) {
      await this.cancelTimers(automation.id, automation.company_id, event.aggregateId, mode, "FILTER_MISMATCH");
      return;
    }

    const latestActivityAt = await this.resolveLatestActivityAt(event.aggregateId, new Date(event.opportunity.updatedAt));
    const thresholdMinutes = Number(runtimePlan?.trigger?.timing?.minutes || 0);
    const timerKey = `${automation.id}:${mode}:card.inactive_for:${event.aggregateId}:0:${latestActivityAt.toISOString()}:${thresholdMinutes}`;

    await this.cancelTimers(automation.id, automation.company_id, event.aggregateId, mode, "TIMER_RESET");
    const [, created] = await KanbanAutomationTimer.findOrCreate({
      where: {
        companyId: automation.company_id,
        mode,
        timerKey
      },
      defaults: {
        companyId: automation.company_id,
        automationId: automation.id,
        opportunityId: event.aggregateId,
        pipelineId: event.opportunity.pipelineId,
        stageId: event.opportunity.stageId,
        mode,
        triggerKind: "card.inactive_for",
        thresholdMinutes,
        timerKey,
        baselineAt: latestActivityAt,
        dueAt: new Date(latestActivityAt.getTime() + thresholdMinutes * 60 * 1000),
        sourceEventId: event.eventId,
        sourceIdempotencyKey: event.idempotencyKey,
        correlationId: event.correlationId,
        payload: {
          automationId: automation.id,
          opportunityId: event.aggregateId,
          stageId: event.opportunity.stageId
        }
      }
    });

    if (created) {
      await trackMetric("PRODUCT_EVENT", "KANBAN_AUTOMATION_TIMER_SCHEDULED", {
        companyId: automation.company_id,
        metadata: {
          automationId: automation.id,
          opportunityId: event.aggregateId,
          mode,
          triggerKind: "card.inactive_for"
        }
      });
    }
  }

  private static async resolveLatestActivityAt(opportunityId: number, fallback: Date) {
    const [latestMovement, latestEvent] = await Promise.all([
      OpportunityMovement.findOne({
        where: { opportunityId },
        order: [["createdAt", "DESC"]]
      }),
      OpportunityEvent.findOne({
        where: { opportunityId },
        order: [["createdAt", "DESC"]]
      })
    ]);

    const candidates = [fallback];
    if (latestMovement?.createdAt) candidates.push(new Date(latestMovement.createdAt));
    if (latestEvent?.createdAt) candidates.push(new Date(latestEvent.createdAt));

    return candidates.sort((a, b) => b.getTime() - a.getTime())[0];
  }

  private static async validateTimeoutEvent(
    automation: KanbanAutomation,
    runtimePlan: any,
    event: any
  ) {
    if (runtimePlan.trigger.kind === "card.in_stage_for") {
      const targetStageId = Number(event.payload?.stageId || 0);
      if (event.opportunity.status !== "OPEN" || Number(event.opportunity.stageId) !== targetStageId) {
        await this.cancelTimers(automation.id, automation.company_id, event.aggregateId, event.payload?.mode || "shadow", "DOMAIN_STATE_CHANGED");
        return false;
      }
      return true;
    }

    if (runtimePlan.trigger.kind === "card.inactive_for") {
      const latestActivityAt = await this.resolveLatestActivityAt(event.aggregateId, new Date(event.opportunity.updatedAt));
      const baselineAt = new Date(event.payload?.baselineAt);
      if (latestActivityAt.getTime() > baselineAt.getTime()) {
        await this.reconcileInactivityTimer(automation, runtimePlan, event, event.payload?.mode || "shadow");
        return false;
      }
      return true;
    }

    return true;
  }
}

export default KanbanAutomationShadowRouterService;
