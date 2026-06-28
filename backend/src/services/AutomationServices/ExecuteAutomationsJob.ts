import { Op } from "sequelize";
import Company from "../../models/Company";
import AutomationExecution from "../../models/AutomationExecution";
import AutomationAction from "../../models/AutomationAction";
import AutomationLog from "../../models/AutomationLog";
import Automation from "../../models/Automation";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import logger from "../../utils/logger";
import {
  executeAction,
  getCampaignSettings,
  isWithinDispatchHours,
  resolveOpportunityAutomationContext
} from "./ProcessAutomationService";
import {
  evaluateCondition,
  normalizeCondition,
  normalizeFlowControl,
  getEffectiveActionUid,
  hasExecutedInCycle,
  isCycleStopped,
  recordStageAutomationLog
} from "./AutomationConditionService";
import processBirthdayAutomations from "./TriggerBirthdayService";
import { processKanbanTimeAutomations } from "./TriggerKanbanService";
import processNoResponseAutomations from "./TriggerNoResponseService";

// Executar automações agendadas que estão pendentes
export const executeScheduledAutomations = async (): Promise<void> => {
  try {
    const now = new Date();

    // Buscar execuções agendadas que já passaram do horário
    const executions = await AutomationExecution.findAll({
      where: {
        status: "scheduled",
        scheduledAt: { [Op.lte]: now }
      },
      include: [
        { model: AutomationAction, as: "automationAction" },
        { model: Automation, as: "automation" },
        { model: Contact, as: "contact", required: false },
        { model: Ticket, as: "ticket", required: false }
      ],
      limit: 100,
      order: [["scheduledAt", "ASC"]]
    });

    if (executions.length === 0) {
      return;
    }

    logger.info(`[Automation Job] Processando ${executions.length} execuções agendadas`);

    for (const execution of executions) {
      const executionStartedAt = Date.now();
      let pickedLog: any = {
        executionId: execution.id,
        automationId: execution.automationId,
        actionId: execution.automationActionId,
        actionUid: execution.actionUid || null,
        cycleId: execution.cycleId || null,
        opportunityId: (execution.metadata as any)?.opportunityId || null,
        expectedStageId: (execution.metadata as any)?.expectedStageId || null,
        scheduledAt: execution.scheduledAt
          ? new Date(execution.scheduledAt).toISOString()
          : null,
        companyId: null
      };

      try {
        // Marcar como em execução
        await execution.update({
          status: "running",
          attempts: execution.attempts + 1,
          lastAttemptAt: new Date()
        });

        const action = execution.automationAction;
        let contact = execution.contact || null;
        let ticket = execution.ticket || null;
        const automation = execution.automation;

        if (!action) {
          await execution.update({ status: "failed", error: "Ação não encontrada" });
          continue;
        }

        const companyId = contact?.companyId || automation?.companyId;
        if (!companyId) {
          await execution.update({ status: "failed", error: "companyId não determinado" });
          continue;
        }

        pickedLog.companyId = companyId;

        const opportunityId = (execution.metadata as any)?.opportunityId || undefined;
        logger.info("[AUTOMATION_EXECUTION] due execution picked", pickedLog);

        if (opportunityId) {
          const context = await resolveOpportunityAutomationContext({
            companyId,
            opportunityId,
            contact,
            ticket,
            actions: [action]
          });
          contact = context.contact;
          ticket = context.ticket;
        }

        // ====================================================================
        // Caminho com ciclo (automação por etapa do pipeline) — guards + condição
        // ====================================================================
        const meta = (execution.metadata as any) || {};
        const cycleId = execution.cycleId || meta.cycleId || null;
        const isCycleExec = !!cycleId && automation?.triggerType === "crm_stage";

        if (isCycleExec) {
          const actionUid =
            execution.actionUid || meta.actionUid || getEffectiveActionUid(action);
          const expectedStageId =
            meta.expectedStageId != null ? Number(meta.expectedStageId) : null;
          const cycleStartedAt = meta.cycleStartedAt
            ? new Date(meta.cycleStartedAt)
            : execution.createdAt;

          const baseLog = {
            companyId,
            automationId: execution.automationId,
            actionUid,
            cycleId,
            opportunityId: opportunityId || null,
            contactId: contact?.id || null,
            ticketId: ticket?.id || null,
            stageId: expectedStageId,
            metadata: { actionType: action.actionType }
          };

          // 1) Ciclo já encerrado por ação anterior → aborta esta ação
          if (await isCycleStopped(companyId, cycleId)) {
            await recordStageAutomationLog({
              ...baseLog,
              status: "skipped",
              reason: "Ciclo já encerrado antes desta ação."
            });
            await execution.update({ status: "skipped", error: "Ciclo encerrado" });
            continue;
          }

          // 2) Ação já executada neste ciclo
          const flow = normalizeFlowControl(action.flowControl);
          if (
            flow.skipIfAlreadyExecuted &&
            (await hasExecutedInCycle(companyId, cycleId, actionUid))
          ) {
            await recordStageAutomationLog({
              ...baseLog,
              status: "skipped",
              reason: "Ação já executada neste ciclo."
            });
            await execution.update({ status: "skipped", error: "Já executada no ciclo" });
            continue;
          }

          // 3) Lead saiu da etapa antes do delay → aborta job atrasado e encerra ciclo
          if (expectedStageId && opportunityId) {
            const Opportunity = (await import("../../models/Opportunity")).default;
            const opp = await Opportunity.findOne({
              where: { id: opportunityId, companyId },
              attributes: ["id", "stageId"]
            });
            if (opp && Number(opp.stageId) !== expectedStageId) {
              await recordStageAutomationLog({
                ...baseLog,
                status: "stopped",
                reason: `Lead saiu da etapa ${expectedStageId} (atual ${opp.stageId}) antes do delay.`
              });
              await execution.update({ status: "aborted", error: "AUTOMATION_STAGE_CHANGED" });
              logger.info(
                `[Automation Job] Execução ${execution.id} abortada: lead saiu da etapa esperada ${expectedStageId} (atual ${opp.stageId})`
              );
              continue;
            }
          }

          // 4) Condição avaliada no momento da execução
          const evalRes = await evaluateCondition(action.condition, {
            companyId,
            opportunityId,
            contact,
            ticket,
            cycleStartedAt,
            expectedStageId
          });

          if (!evalRes.pass) {
            const condition = normalizeCondition(action.condition);
            await recordStageAutomationLog({
              ...baseLog,
              status: "skipped",
              reason: `Condição não satisfeita: ${evalRes.reason}`
            });
            if (condition.stopIfFalse) {
              await recordStageAutomationLog({
                ...baseLog,
                status: "stopped",
                reason: "stopIfFalse: condição falsa encerrou o ciclo."
              });
              logger.info(`[Automation Job] Ciclo ${cycleId} encerrado por stopIfFalse na execução ${execution.id}`);
            }
            await execution.update({ status: "skipped", completedAt: new Date(), error: null });
            await AutomationLog.update(
              { status: "skipped", executedAt: new Date(), result: { skipped: true, reason: evalRes.reason } },
              { where: { automationId: execution.automationId, contactId: contact?.id || null, status: "pending" } }
            );
            continue;
          }

          // 5) Executa a ação
          const cycleResult = await executeAction(action, contact, ticket, companyId, opportunityId);

          await recordStageAutomationLog({
            ...baseLog,
            status: cycleResult.success ? "executed" : "failed",
            reason: cycleResult.message
          });

          if (cycleResult.success && (flow.stopAfterExecute || action.actionType === "stop_automation")) {
            await recordStageAutomationLog({
              ...baseLog,
              status: "stopped",
              reason:
                action.actionType === "stop_automation"
                  ? "stop_automation: ação encerrou o ciclo."
                  : "stopAfterExecute: ação encerrou o ciclo após executar."
            });
            logger.info(`[Automation Job] Ciclo ${cycleId} encerrado por stopAfterExecute na execução ${execution.id}`);
          }

          await execution.update({
            status: cycleResult.success ? "completed" : "failed",
            completedAt: cycleResult.success ? new Date() : null,
            error: cycleResult.success ? null : cycleResult.message
          });

          const durationMs = Date.now() - executionStartedAt;
          if (cycleResult.success) {
            logger.info("[AUTOMATION_EXECUTION] execution completed", {
              executionId: execution.id,
              status: "completed",
              durationMs,
              companyId
            });
          } else {
            logger.warn("[AUTOMATION_EXECUTION] execution failed", {
              executionId: execution.id,
              automationId: execution.automationId,
              actionId: execution.automationActionId,
              opportunityId: opportunityId || null,
              errorMessage: cycleResult.message,
              durationMs,
              companyId
            });
          }

          await AutomationLog.update(
            {
              status: cycleResult.success ? "completed" : "failed",
              executedAt: new Date(),
              result: cycleResult,
              error: cycleResult.success ? null : cycleResult.message
            },
            {
              where: {
                automationId: execution.automationId,
                contactId: contact?.id || null,
                status: "pending"
              }
            }
          );

          logger.info(`[Automation Job] Execução ${execution.id} (ciclo ${cycleId}) ${cycleResult.success ? "concluída" : "falhou"}: ${cycleResult.message}`);
          continue;
        }

        // ====================================================================
        // Caminho legado (sem ciclo) — comportamento inalterado
        // ====================================================================
        // Executar a ação
        const result = await executeAction(action, contact, ticket, companyId, opportunityId);

        // Atualizar execução
        await execution.update({
          status: result.success ? "completed" : "failed",
          completedAt: result.success ? new Date() : null,
          error: result.success ? null : result.message
        });

        const durationMs = Date.now() - executionStartedAt;
        if (result.success) {
          logger.info("[AUTOMATION_EXECUTION] execution completed", {
            executionId: execution.id,
            status: "completed",
            durationMs,
            companyId
          });
        } else {
          logger.warn("[AUTOMATION_EXECUTION] execution failed", {
            executionId: execution.id,
            automationId: execution.automationId,
            actionId: execution.automationActionId,
            opportunityId: opportunityId || null,
            errorMessage: result.message,
            durationMs,
            companyId
          });
        }

        // Atualizar log
        await AutomationLog.update(
          {
            status: result.success ? "completed" : "failed",
            executedAt: new Date(),
            result: result,
            error: result.success ? null : result.message
          },
          {
            where: {
              automationId: execution.automationId,
              contactId: contact?.id || null,
              status: "pending"
            }
          }
        );

        logger.info(`[Automation Job] Execução ${execution.id} ${result.success ? "concluída" : "falhou"}: ${result.message}`);
      } catch (error: any) {
        await execution.update({
          status: "failed",
          error: error.message
        });
        logger.warn("[AUTOMATION_EXECUTION] execution failed", {
          executionId: execution.id,
          automationId: execution.automationId,
          actionId: execution.automationActionId,
          opportunityId: pickedLog.opportunityId,
          errorMessage: error.message,
          durationMs: Date.now() - executionStartedAt,
          companyId: pickedLog.companyId
        });
        logger.error(`[Automation Job] Erro na execução ${execution.id}: ${error.message}`);
      }
    }
  } catch (error: any) {
    logger.error(`[Automation Job] Erro geral: ${error.message}`);
  }
};

const getActiveCompanyIds = async (): Promise<number[]> => {
  const companies = await Company.findAll({
    where: { status: true },
    attributes: ["id"]
  });
  return companies.map(company => company.id);
};

const runPerCompany = async (
  jobLabel: string,
  triggerType: string,
  handler: (companyId: number) => Promise<void>
): Promise<void> => {
  const companyIds = await getActiveCompanyIds();

  for (const companyId of companyIds) {
    try {
      const settings = await getCampaignSettings(companyId);
      if (!isWithinDispatchHours(settings, triggerType)) {
        logger.debug(
          `[Automation Job] Empresa ${companyId} fora da janela para ${jobLabel} (${triggerType})`
        );
        continue;
      }
      await handler(companyId);
    } catch (error: any) {
      logger.error(`[Automation Job] Erro na empresa ${companyId} (${jobLabel}): ${error.message}`);
    }
  }
};

// Apenas processa execuções agendadas
export const runAutomationJob = async (): Promise<void> => {
  try {
    logger.info("[Automation Job] Executando fila de execuções agendadas...");
    await executeScheduledAutomations();
    logger.info("[Automation Job] Execuções agendadas concluídas");
  } catch (error: any) {
    logger.error(`[Automation Job] Erro geral: ${error.message}`);
  }
};

export const runBirthdayAutomationJob = async (): Promise<void> => {
  logger.info("[Automation Birthday Job] Iniciando processamento...");
  await runPerCompany("birthday", "birthday", processBirthdayAutomations);
  logger.info("[Automation Birthday Job] Processamento concluído");
};

export const runKanbanAutomationJob = async (): Promise<void> => {
  logger.info("[Automation Kanban Job] Iniciando processamento...");
  await runPerCompany("kanban_time", "kanban_time", processKanbanTimeAutomations);
  logger.info("[Automation Kanban Job] Processamento concluído");
};

export const runNoResponseAutomationJob = async (): Promise<void> => {
  logger.info("[Automation NoResponse Job] Iniciando processamento...");
  await runPerCompany("no_response", "no_response", processNoResponseAutomations);
  logger.info("[Automation NoResponse Job] Processamento concluído");
};

export default runAutomationJob;
