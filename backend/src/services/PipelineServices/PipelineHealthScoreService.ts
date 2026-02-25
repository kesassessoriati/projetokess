import { Op } from "sequelize";
import Opportunity from "../../models/Opportunity";
import PipelineStage from "../../models/PipelineStage";

interface HealthScore {
    score: number;
    factors: {
        highRiskRate: number;
        slaExpiredRate: number;
        idleLeadsRate: number;
        stageConcentration: number;
    };
}

class PipelineHealthScoreService {
    public static async execute(companyId: number, pipelineId: number): Promise<HealthScore> {
        // 1. Buscar todas as oportunidades do pipeline
        const totalOpportunities = await Opportunity.count({ where: { companyId, pipelineId, status: "OPEN" } });

        if (totalOpportunities === 0) return { score: 100, factors: { highRiskRate: 0, slaExpiredRate: 0, idleLeadsRate: 0, stageConcentration: 0 } };

        // 2. High Risk Rate
        const highRiskCount = await Opportunity.count({
            where: { companyId, pipelineId, status: "OPEN" },
            include: [{
                association: "prediction",
                where: { riskLevel: "HIGH" }
            }]
        });
        const highRiskRate = (highRiskCount / totalOpportunities) * 100;

        // 3. SLA Expired Rate
        const slaExpiredCount = await Opportunity.count({
            where: {
                companyId,
                pipelineId,
                status: "OPEN",
                slaDeadline: { [Op.lt]: new Date() }
            }
        });
        const slaExpiredRate = (slaExpiredCount / totalOpportunities) * 100;

        // 4. Idle Leads (Parados há mais de 7 dias)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const idleCount = await Opportunity.count({
            where: {
                companyId,
                pipelineId,
                status: "OPEN",
                updatedAt: { [Op.lt]: sevenDaysAgo }
            }
        });
        const idleLeadsRate = (idleCount / totalOpportunities) * 100;

        // 5. Stage Concentration (Se mais de 60% estiver no primeiro estágio)
        const firstStage = await PipelineStage.findOne({ where: { pipelineId }, order: [["order", "ASC"]] });
        let stageConcentration = 0;
        if (firstStage) {
            const firstStageCount = await Opportunity.count({ where: { companyId, pipelineId, stageId: firstStage.id, status: "OPEN" } });
            stageConcentration = (firstStageCount / totalOpportunities) * 100;
        }

        // Cálculo do Score (0-100)
        // Pesos: Risco (30%), SLA (30%), Inatividade (20%), Concentração (20%)
        let score = 100;
        score -= (highRiskRate * 0.3);
        score -= (slaExpiredRate * 0.3);
        score -= (idleLeadsRate * 0.2);
        if (stageConcentration > 60) score -= ((stageConcentration - 60) * 0.5);

        return {
            score: Math.max(0, Math.round(score)),
            factors: {
                highRiskRate,
                slaExpiredRate,
                idleLeadsRate,
                stageConcentration
            }
        };
    }
}

export default PipelineHealthScoreService;
