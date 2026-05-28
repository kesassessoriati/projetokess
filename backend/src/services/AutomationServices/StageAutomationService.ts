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
        const { opportunityId, toStageId, companyId, movedBy } = data.payload || data;

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

        // Buscar oportunidade com contato e ticket
        const opportunity = await Opportunity.findByPk(opportunityId, {
          include: [
            { model: Contact, as: "contact" },
            { model: Ticket, as: "ticket" }
          ]
        });

        if (!opportunity) {
          logger.warn(`[StageAutomationService] Oportunidade ${opportunityId} não localizada`);
          return;
        }

        if (!opportunity.contact) {
          logger.warn(`[StageAutomationService] Oportunidade ${opportunityId} sem contato associado. Ações que requerem contato (send_message, add_tag) serão ignoradas.`);
        }

        // Regra do WhatsApp (Apenas para send_message)
        // Só criar/carregar ticket se houver alguma ação do tipo "send_message" nas automações correspondentes
        const hasSendMessage = matchingAutomations.some(a =>
          a.actions && a.actions.some(act => act.actionType === "send_message")
        );

        const contact = opportunity.contact || null;

        let ticket = opportunity.ticket || null;
        if (hasSendMessage && contact && !ticket) {
          logger.info(`[StageAutomationService] Automação com disparo de WhatsApp detectada. Buscando ticket aberto para contato ${contact.id}`);

          ticket = await Ticket.findOne({
            where: {
              contactId: contact.id,
              companyId,
              status: "open"
            },
            order: [["updatedAt", "DESC"]]
          });

          if (!ticket) {
            logger.info(`[StageAutomationService] Nenhum ticket aberto encontrado para contato ${contact.id}. Criando novo ticket via FindOrCreateTicketService`);

            const GetDefaultWhatsApp = (await import("../../helpers/GetDefaultWhatsApp")).default;
            const FindOrCreateTicketService = (await import("../TicketServices/FindOrCreateTicketService")).default;

            try {
              const defaultWhatsapp = await GetDefaultWhatsApp(companyId);
              if (defaultWhatsapp) {
                if (contact.number) {
                  ticket = await FindOrCreateTicketService(
                    contact,
                    defaultWhatsapp,
                    0,
                    companyId,
                    0,
                    null,
                    null,
                    "whatsapp",
                    null,
                    false
                  );
                  logger.info(`[StageAutomationService] Novo ticket ${ticket.id} criado com sucesso`);
                } else {
                  logger.warn(`[StageAutomationService] Contato ${contact.id} sem telefone válido. send_message será ignorada.`);
                }
              } else {
                logger.warn(`[StageAutomationService] Nenhum WhatsApp padrão configurado para empresa ${companyId}. send_message será ignorada.`);
              }
            } catch (err: any) {
              logger.error(`[StageAutomationService] Falha ao gerar ticket automático: ${err.message}`);
            }
          }

          if (ticket) {
            await opportunity.update({ ticketId: ticket.id });
            logger.info(`[StageAutomationService] Oportunidade ${opportunityId} vinculada ao ticket ${ticket.id}`);
          }
        } else if (hasSendMessage && !contact) {
          logger.warn(`[StageAutomationService] Oportunidade ${opportunityId} sem contato - send_message será ignorada.`);
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

            logger.info(`[StageAutomationService] Iniciando processamento de ${automation.actions?.length || 0} ações da automação ${automation.id} para oportunidade ${opportunityId}${contact ? ` / contato ${contact.id}` : " (sem contato)"}`);
            await processAutomationForContact(automation, contact, ticket, opportunityId);
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
