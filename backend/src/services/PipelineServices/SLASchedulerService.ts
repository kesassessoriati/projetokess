import { Op } from "sequelize";
import Cron from "node-cron";
import Opportunity from "../../models/Opportunity";
import OpportunityEvent from "../../models/OpportunityEvent";
import EventBus from "../../libs/EventBus";

class SLASchedulerService {
    public static init() {
        // Rodar a cada 5 minutos
        Cron.schedule("*/5 * * * *", () => {
            this.checkSLAs();
        });
        console.log("[SLAScheduler] Initialized.");
    }

    private static async checkSLAs() {
        const now = new Date();

        // Buscar oportunidades com SLA vencido que ainda estão abertas
        const expiredOpportunities = await Opportunity.findAll({
            where: {
                status: "OPEN",
                slaDeadline: {
                    [Op.lt]: now,
                    [Op.ne]: null
                }
            }
        });

        for (const opportunity of expiredOpportunities) {
            // Verificar se já emitimos SLA_EXPIRED para este deadline específico
            // Evita spam se a automação não mover a oportunidade de estágio
            const alreadyNotified = await OpportunityEvent.findOne({
                where: {
                    opportunityId: opportunity.id,
                    type: "SLA_EXPIRED",
                    createdAt: {
                        [Op.gt]: opportunity.slaDeadline // Se o evento foi criado DEPOIS do vencimento atual
                    }
                }
            });

            if (!alreadyNotified) {
                // 1. Gravar Evento no Banco (Audit)
                const event = await OpportunityEvent.create({
                    opportunityId: opportunity.id,
                    type: "SLA_EXPIRED",
                    metadata: {
                        deadline: opportunity.slaDeadline,
                        expiredAt: now
                    }
                });

                // 2. Publicar no Event Bus Interno
                await EventBus.publish("SLA_EXPIRED", {
                    opportunityId: opportunity.id,
                    pipelineId: opportunity.pipelineId,
                    stageId: opportunity.stageId,
                    value: opportunity.value,
                    companyId: opportunity.companyId
                }, opportunity.companyId);

                console.log(`[SLAScheduler] SLA Expired for Opportunity ${opportunity.id}`);
            }
        }
    }
}

export default SLASchedulerService;
