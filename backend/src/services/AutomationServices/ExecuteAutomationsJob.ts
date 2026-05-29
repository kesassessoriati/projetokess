import { Op } from "sequelize";
import Company from "../../models/Company";
import AutomationExecution from "../../models/AutomationExecution";
import AutomationAction from "../../models/AutomationAction";
import AutomationLog from "../../models/AutomationLog";
import Automation from "../../models/Automation";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import logger from "../../utils/logger";
import { executeAction, getCampaignSettings, isWithinDispatchHours } from "./ProcessAutomationService";
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
      try {
        // Marcar como em execução
        await execution.update({
          status: "running",
          attempts: execution.attempts + 1,
          lastAttemptAt: new Date()
        });

        const action = execution.automationAction;
        const contact = execution.contact || null;
        const ticket = execution.ticket || null;
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

        const opportunityId = (execution.metadata as any)?.opportunityId || undefined;

        // Executar a ação
        const result = await executeAction(action, contact, ticket, companyId, opportunityId);

        // Atualizar execução
        await execution.update({
          status: result.success ? "completed" : "failed",
          completedAt: result.success ? new Date() : null,
          error: result.success ? null : result.message
        });

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
