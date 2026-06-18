import { Op } from "sequelize";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import EventBus from "../../libs/EventBus";
import Automation from "../../models/Automation";
import AutomationAction from "../../models/AutomationAction";
import AutomationExecution from "../../models/AutomationExecution";
import Opportunity from "../../models/Opportunity";
import Contact from "../../models/Contact";
import {
  processAutomationForContact,
  resolveOpportunityAutomationContext
} from "./ProcessAutomationService";
import logger from "../../utils/logger";

class StageAutomationService {
  public init(): void {
    logger.info("[StageAutomationService] Inicializando e escutando eventos do CRM Kanban.");

    EventBus.subscribe("OPPORTUNITY_MOVED", async (data: any) => {
      try {
        const { opportunityId, toStageId, fromStageId, companyId, movedBy } = data.payload || data;

        logger.info(`[StageAutomationService] Evento OPPORTUNITY_MOVED recebido para oportunidade ${opportunityId}, etapa destino ${toStageId}, empresa ${companyId}, movido por: ${movedBy || "não informado"}`);

        if (!opportunityId || !toStageId || !companyId) {
          logger.warn(`[StageAutomationService] Parâmetros insuficientes no payload do evento OPPORTUNITY_MOVED`);
          return;
        }

        // Proteção contra Loop Infinito:
        if (movedBy === "AUTOMATION") {
          const OpportunityMovement = (await import("../../models/OpportunityMovement")).default;
          const recentMovements = await OpportunityMovement.findAll({
            where: {
              opportunityId,
              createdAt: {
                [Op.gte]: moment().subtract(30, "seconds").toDate()
              }
            }
          });

          if (recentMovements.length > 2) {
            logger.warn(`[StageAutomationService] Bloqueando loop de automação para oportunidade ${opportunityId}. Detectadas ${recentMovements.length} movimentações rápidas por AUTOMATION em 30 segundos.`);
            return;
          }
        }

        // Buscar automações ativas para o tipo "crm_stage"
        const automations = await Automation.findAll({
          where: {
            companyId,
            triggerType: "crm_stage",
            isActive: true
          },
          include: [
            {
              model: AutomationAction,
              as: "actions"
            }
          ]
        });

        // Ao sair de uma etapa com bloqueio de IA, limpar o bloqueio automaticamente
        // Executa ANTES de qualquer automação da nova etapa para não colidir
        if (fromStageId && Number(fromStageId) !== Number(toStageId)) {
          try {
            const fromStageHasAiPauseAction = automations.some(a => {
              const config = a.triggerConfig || {};
              if (Number(config.stageId) !== Number(fromStageId)) return false;

              return (a.actions || []).some(action => {
                const actionConfig = action.actionConfig || {};
                return (
                  action.actionType === "ai_actions" &&
                  (actionConfig.aiAction === "pause_for" || actionConfig.aiAction === "disable_in_stage")
                );
              });
            });

            const opp = await Opportunity.findOne({
              where: { id: opportunityId, companyId },
              attributes: ["id", "contactId"]
            });
            if (opp?.contactId) {
              const c = await Contact.findOne({
                where: { id: opp.contactId, companyId },
                attributes: ["id", "aiBlockMode", "aiBlockedByStageId"]
              });
              const shouldClearStageAiBlock =
                c &&
                (
                  (
                    c.aiBlockMode === "disabled_in_stage" &&
                    (!c.aiBlockedByStageId || Number(c.aiBlockedByStageId) === Number(fromStageId))
                  ) ||
                  (
                    c.aiBlockMode === "pause_until" &&
                    (
                      Number(c.aiBlockedByStageId) === Number(fromStageId) ||
                      (!c.aiBlockedByStageId && fromStageHasAiPauseAction)
                    )
                  )
                );

              if (shouldClearStageAiBlock) {
                await c.update({ aiBlockMode: null, aiBlockedByStageId: null, aiBlockedUntil: null });
                logger.info(
                  `[StageAutomation] AI block limpo automaticamente ao sair da etapa ${fromStageId} ` +
                  `para ${toStageId} — contact=${c.id} opportunityId=${opportunityId}`
                );
              }
            }
          } catch (clearErr: any) {
            logger.warn(`[StageAutomation] Falha ao limpar AI block na saída da etapa: ${clearErr.message}`);
          }
        }

        // Filtrar a automação que corresponde à etapa específica
        const matchingAutomations = automations.filter(a => {
          const config = a.triggerConfig || {};
          return Number(config.stageId) === Number(toStageId);
        });

        if (matchingAutomations.length === 0) {
          logger.debug(`[StageAutomationService] Nenhuma automação ativa cadastrada para a etapa ${toStageId} na empresa ${companyId}`);
          return;
        }

        logger.info(`[StageAutomationService] Encontradas ${matchingAutomations.length} automações correspondentes para a etapa ${toStageId}`);

        const allActions = matchingAutomations.flatMap(a => a.actions || []);
        const context = await resolveOpportunityAutomationContext({
          companyId,
          opportunityId,
          actions: allActions
        });
        const { opportunity, contact, ticket } = context;

        if (!opportunity) {
          logger.warn(`[StageAutomationService] Oportunidade ${opportunityId} não localizada`);
          return;
        }

        if (!contact) {
          logger.warn(`[StageAutomationService] ${context.missingReason || `Oportunidade ${opportunityId} sem contato associado.`}`);
        }

        for (const automation of matchingAutomations) {
          try {
            // Guarda para evitar execução duplicada concorrente — diferencia por oportunidade quando não há contato
            const existingExecution = await AutomationExecution.findOne({
              where: {
                automationId: automation.id,
                ...(contact
                  ? { contactId: contact.id }
                  : { metadata: { [Op.contains]: { opportunityId } } }),
                createdAt: {
                  [Op.gte]: moment().subtract(10, "seconds").toDate()
                }
              }
            });

            if (existingExecution) {
              logger.info(`[StageAutomation] Automação ${automation.id} já disparada recentemente para oportunidade ${opportunityId}. Ignorando duplicação.`);
              continue;
            }

            // Cada entrada na etapa inicia um novo ciclo de execução.
            // O cycleId isola as execuções/anti-loop deste disparo: se o lead
            // sair e voltar, um novo ciclo permite nova execução.
            const cycleContext = {
              cycleId: uuidv4(),
              expectedStageId: Number(toStageId),
              cycleStartedAt: new Date()
            };

            logger.info(`[StageAutomationService] Iniciando processamento de ${automation.actions?.length || 0} ações da automação ${automation.id} para oportunidade ${opportunityId}${contact ? ` / contato ${contact.id}` : " (sem contato)"} (ciclo ${cycleContext.cycleId})`);
            await processAutomationForContact(automation, contact, ticket, opportunityId, cycleContext);
            logger.info(`[StageAutomation] Automação de etapa ${automation.id} disparada com sucesso para oportunidade ${opportunityId} (ciclo ${cycleContext.cycleId})`);
          } catch (err: any) {
            logger.error(`[StageAutomation] Erro ao disparar automação ${automation.id}: ${err.message}`);
          }
        }
      } catch (err: any) {
        logger.error(`[StageAutomation] Erro ao processar evento de movimentação: ${err.message}`);
      }
    });
  }
}

export default new StageAutomationService();
