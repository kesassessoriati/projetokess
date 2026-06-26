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

export interface StageEntryAutomationRequest {
  opportunityId: number;
  companyId: number;
  stageId: number;
  pipelineId?: number;
  fromStageId?: number | null;
  triggerEvent: "OPPORTUNITY_CREATED" | "OPPORTUNITY_MOVED";
  actorType?: "USER" | "AI" | "AUTOMATION" | "CREATED" | "SYSTEM" | string;
}

export class StageAutomationService {
  public async processStageEntryAutomation({
    opportunityId,
    companyId,
    stageId,
    pipelineId,
    fromStageId,
    triggerEvent,
    actorType
  }: StageEntryAutomationRequest): Promise<void> {
    logger.info(
      `[StageAutomationService] Evento ${triggerEvent} recebido para oportunidade ${opportunityId}, etapa ${stageId}, empresa ${companyId}, origem: ${actorType || "nao informado"}`
    );

    if (!opportunityId || !stageId || !companyId) {
      logger.warn(`[StageAutomationService] Parametros insuficientes no payload do evento ${triggerEvent}`);
      return;
    }

    try {
      if (actorType === "AUTOMATION") {
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
          logger.warn(
            `[StageAutomationService] Bloqueando loop de automacao para oportunidade ${opportunityId}. Detectadas ${recentMovements.length} movimentacoes rapidas por AUTOMATION em 30 segundos.`
          );
          return;
        }
      }

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

      if (fromStageId && Number(fromStageId) !== Number(stageId)) {
        await this.clearStageAiBlock({
          automations,
          companyId,
          opportunityId,
          fromStageId,
          toStageId: stageId
        });
      }

      const matchingAutomations = automations.filter(automation => {
        const config = automation.triggerConfig || {};
        const matchesStage = Number(config.stageId) === Number(stageId);
        const matchesPipeline =
          !pipelineId ||
          !config.pipelineId ||
          Number(config.pipelineId) === Number(pipelineId);

        return matchesStage && matchesPipeline;
      });

      if (matchingAutomations.length === 0) {
        logger.debug(`[StageAutomationService] Nenhuma automacao ativa cadastrada para a etapa ${stageId} na empresa ${companyId}`);
        return;
      }

      logger.info(`[StageAutomationService] Encontradas ${matchingAutomations.length} automacoes correspondentes para a etapa ${stageId}`);

      const allActions = matchingAutomations.flatMap(automation => automation.actions || []);
      const context = await resolveOpportunityAutomationContext({
        companyId,
        opportunityId,
        actions: allActions
      });
      const { opportunity, contact, ticket } = context;

      if (!opportunity) {
        logger.warn(`[StageAutomationService] Oportunidade ${opportunityId} nao localizada`);
        return;
      }

      if (!contact) {
        logger.warn(`[StageAutomationService] ${context.missingReason || `Oportunidade ${opportunityId} sem contato associado.`}`);
      }

      for (const automation of matchingAutomations) {
        try {
          const existingExecution = await AutomationExecution.findOne({
            where: {
              automationId: automation.id,
              metadata: {
                [Op.contains]: {
                  opportunityId,
                  expectedStageId: Number(stageId)
                }
              } as any,
              createdAt: {
                [Op.gte]: moment().subtract(10, "seconds").toDate()
              }
            }
          });

          if (existingExecution) {
            logger.info(
              `[StageAutomation] Automacao ${automation.id} ja disparada recentemente para oportunidade ${opportunityId} na etapa ${stageId}. Ignorando duplicacao.`
            );
            continue;
          }

          const cycleContext = {
            cycleId: uuidv4(),
            expectedStageId: Number(stageId),
            cycleStartedAt: new Date()
          };

          logger.info(
            `[StageAutomationService] Iniciando processamento de ${automation.actions?.length || 0} acoes da automacao ${automation.id} para oportunidade ${opportunityId}${contact ? ` / contato ${contact.id}` : " (sem contato)"} (ciclo ${cycleContext.cycleId})`
          );
          await processAutomationForContact(automation, contact, ticket, opportunityId, cycleContext);
          logger.info(`[StageAutomation] Automacao de etapa ${automation.id} disparada com sucesso para oportunidade ${opportunityId} (ciclo ${cycleContext.cycleId})`);
        } catch (err: any) {
          logger.error(`[StageAutomation] Erro ao disparar automacao ${automation.id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      logger.error(`[StageAutomation] Erro ao processar evento ${triggerEvent}: ${err.message}`);
    }
  }

  private async clearStageAiBlock({
    automations,
    companyId,
    opportunityId,
    fromStageId,
    toStageId
  }: {
    automations: Automation[];
    companyId: number;
    opportunityId: number;
    fromStageId: number;
    toStageId: number;
  }): Promise<void> {
    try {
      const fromStageHasAiPauseAction = automations.some(automation => {
        const config = automation.triggerConfig || {};
        if (Number(config.stageId) !== Number(fromStageId)) return false;

        return (automation.actions || []).some(action => {
          const actionConfig = action.actionConfig || {};
          return (
            action.actionType === "ai_actions" &&
            (actionConfig.aiAction === "pause_for" || actionConfig.aiAction === "disable_in_stage")
          );
        });
      });

      const opportunity = await Opportunity.findOne({
        where: { id: opportunityId, companyId },
        attributes: ["id", "contactId"]
      });

      if (!opportunity?.contactId) return;

      const contact = await Contact.findOne({
        where: { id: opportunity.contactId, companyId },
        attributes: ["id", "aiBlockMode", "aiBlockedByStageId"]
      });

      const shouldClearStageAiBlock =
        contact &&
        (
          (
            contact.aiBlockMode === "disabled_in_stage" &&
            (!contact.aiBlockedByStageId || Number(contact.aiBlockedByStageId) === Number(fromStageId))
          ) ||
          (
            contact.aiBlockMode === "pause_until" &&
            (
              Number(contact.aiBlockedByStageId) === Number(fromStageId) ||
              (!contact.aiBlockedByStageId && fromStageHasAiPauseAction)
            )
          )
        );

      if (!shouldClearStageAiBlock) return;

      await (contact as any).update(
        { aiBlockMode: null, aiBlockedByStageId: null, aiBlockedUntil: null },
        { hooks: false }
      );
      logger.info(
        `[StageAutomation] AI block limpo automaticamente ao sair da etapa ${fromStageId} para ${toStageId} - contact=${contact.id} opportunityId=${opportunityId}`
      );
    } catch (clearErr: any) {
      logger.warn(`[StageAutomation] Falha ao limpar AI block na saida da etapa: ${clearErr.message}`);
    }
  }

  public init(): void {
    logger.info("[StageAutomationService] Inicializando e escutando eventos do CRM Kanban.");

    EventBus.subscribe("OPPORTUNITY_MOVED", async (data: any) => {
      const { opportunityId, pipelineId, toStageId, fromStageId, companyId, movedBy } = data.payload || data;

      await this.processStageEntryAutomation({
        opportunityId,
        companyId,
        pipelineId,
        stageId: toStageId,
        fromStageId,
        triggerEvent: "OPPORTUNITY_MOVED",
        actorType: movedBy
      });
    });

    EventBus.subscribe("OPPORTUNITY_CREATED", async (data: any) => {
      const payload = data.payload || data;
      const stageId =
        payload.initialStageId ||
        payload.stageId ||
        payload.metadata?.initialStageId ||
        payload.metadata?.stageId;

      await this.processStageEntryAutomation({
        opportunityId: payload.opportunityId,
        companyId: payload.companyId,
        pipelineId: payload.pipelineId,
        stageId,
        triggerEvent: "OPPORTUNITY_CREATED",
        actorType: "CREATED"
      });
    });
  }
}

export default new StageAutomationService();
