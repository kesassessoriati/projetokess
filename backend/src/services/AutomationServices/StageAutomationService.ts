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

        if (!opportunity || !opportunity.contact) {
          logger.warn(`[StageAutomationService] Oportunidade ${opportunityId} ou contato associado não localizado para processar automações`);
          return;
        }

        // Regra do WhatsApp (Apenas para send_message)
        // Só criar/carregar ticket se houver alguma ação do tipo "send_message" nas automações correspondentes
        const hasSendMessage = matchingAutomations.some(a =>
          a.actions && a.actions.some(act => act.actionType === "send_message")
        );

        let ticket = opportunity.ticket || null;
        if (hasSendMessage && !ticket) {
          logger.info(`[StageAutomationService] Automação com disparo de WhatsApp detectada. Buscando ticket aberto para contato ${opportunity.contact.id}`);

          ticket = await Ticket.findOne({
            where: {
              contactId: opportunity.contact.id,
              companyId,
              status: "open"
            },
            order: [["updatedAt", "DESC"]]
          });

          if (!ticket) {
            logger.info(`[StageAutomationService] Nenhum ticket aberto encontrado para contato ${opportunity.contact.id}. Criando novo ticket via FindOrCreateTicketService`);

            const GetDefaultWhatsApp = (await import("../../helpers/GetDefaultWhatsApp")).default;
            const FindOrCreateTicketService = (await import("../TicketServices/FindOrCreateTicketService")).default;

            try {
              const defaultWhatsapp = await GetDefaultWhatsApp(companyId);
              if (defaultWhatsapp) {
                // Validar número de telefone básico do contato
                if (opportunity.contact.number) {
                  ticket = await FindOrCreateTicketService(
                    opportunity.contact,
                    defaultWhatsapp,
                    0, // unreadMessages
                    companyId,
                    0, // queueId
                    null, // userId
                    null, // groupContact
                    "whatsapp", // channel
                    null, // wbot
                    false // isImported
                  );
                  logger.info(`[StageAutomationService] Novo ticket ${ticket.id} criado com sucesso e associado ao WhatsApp padrão da empresa ${companyId}`);
                } else {
                  logger.warn(`[StageAutomationService] Não é possível criar ticket: contato ${opportunity.contact.id} não possui telefone válido.`);
                }
              } else {
                logger.warn(`[StageAutomationService] Não foi possível criar ticket automático: nenhum WhatsApp padrão configurado para empresa ${companyId}`);
              }
            } catch (err: any) {
              logger.error(`[StageAutomationService] Falha crítica ao gerar ticket automático: ${err.message}`);
            }
          }

          if (ticket) {
            await opportunity.update({ ticketId: ticket.id });
            logger.info(`[StageAutomationService] Oportunidade ${opportunityId} vinculada com sucesso ao ticket ${ticket.id}`);
          }
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

            logger.info(`[StageAutomationService] Iniciando processamento de ${automation.actions?.length || 0} ações da automação ${automation.id} para contato ${opportunity.contact.id}`);
            await processAutomationForContact(automation, opportunity.contact, ticket);
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
