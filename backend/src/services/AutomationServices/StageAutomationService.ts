import { Op } from "sequelize";
import moment from "moment";
import EventBus from "../../libs/EventBus";
import Automation from "../../models/Automation";
import AutomationAction from "../../models/AutomationAction";
import AutomationExecution from "../../models/AutomationExecution";
import Opportunity from "../../models/Opportunity";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { processAutomationForContact } from "./ProcessAutomationService";
import logger from "../../utils/logger";

class StageAutomationService {
  public init(): void {
    logger.info("[StageAutomationService] Inicializando e escutando eventos do CRM Kanban.");

    EventBus.subscribe("OPPORTUNITY_MOVED", async (data: any) => {
      try {
        const { opportunityId, toStageId, companyId } = data.payload || data;

        if (!opportunityId || !toStageId || !companyId) {
          return;
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

        // Filtrar a automação que corresponde à etapa específica
        const matchingAutomations = automations.filter(a => {
          const config = a.triggerConfig || {};
          return Number(config.stageId) === Number(toStageId);
        });

        if (matchingAutomations.length === 0) {
          return;
        }

        // Buscar oportunidade com contato e ticket
        const opportunity = await Opportunity.findByPk(opportunityId, {
          include: [
            { model: Contact, as: "contact" },
            { model: Ticket, as: "ticket" }
          ]
        });

        if (!opportunity || !opportunity.contact) {
          return;
        }

        for (const automation of matchingAutomations) {
          try {
            // Guarda para evitar execução duplicada concorrente (idempotência básica)
            const existingExecution = await AutomationExecution.findOne({
              where: {
                automationId: automation.id,
                contactId: opportunity.contact.id,
                createdAt: {
                  [Op.gte]: moment().subtract(10, "seconds").toDate()
                }
              }
            });

            if (existingExecution) {
              logger.info(`[StageAutomation] Automação ${automation.id} já disparada recentemente para o contato ${opportunity.contact.id}. Ignorando duplicação.`);
              continue;
            }

            await processAutomationForContact(automation, opportunity.contact, opportunity.ticket || null);
            logger.info(`[StageAutomation] Automação de etapa ${automation.id} disparada com sucesso para oportunidade ${opportunityId}`);
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
