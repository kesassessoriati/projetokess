import Opportunity from "../../models/Opportunity";
import OpportunityPrediction from "../../models/OpportunityPrediction";
import User from "../../models/User";
import Pipeline from "../../models/Pipeline";

interface ForecastResult {
    period30Days: number;
    period60Days: number;
    currentMonth: number;
    weightedBySeller: { sellerName: string; forecast: number }[];
    weightedByPipeline: { pipelineName: string; forecast: number }[];
}

class RevenueForecastService {
    public static async execute(companyId: number, profile: string, userId: number): Promise<ForecastResult> {
        const admin = profile === "admin";
        const opWhere: any = { companyId, status: "OPEN" };
        // Opportunity usa assignedUserId (não ownerUserId que é campo de CrmLead)
        if (!admin) opWhere.assignedUserId = userId;

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Buscar todas as oportunidades abertas com predições
        const opportunities = await Opportunity.findAll({
            where: opWhere,
            include: [
                {
                    model: OpportunityPrediction,
                    as: "prediction",
                    // predictedDaysToClose e predictedCloseProbability carregados para cálculo
                    attributes: ["predictedCloseProbability", "predictedDaysToClose"]
                },
                { model: User, as: "assignedUser", attributes: ["name"] },
                { model: Pipeline, as: "pipeline", attributes: ["name"] }
            ]
        });

        let period30Days = 0;
        let period60Days = 0;
        let currentMonth = 0;
        const sellerMap = new Map<string, number>();
        const pipelineMap = new Map<string, number>();

        for (const op of opportunities) {
            const prob = op.prediction?.predictedCloseProbability || 0;
            const weightedValue = Number(op.value) * prob;

            // Usar predictedDaysToClose da IA quando disponível (> 0)
            const daysToClose = op.prediction?.predictedDaysToClose || 0;
            const hasDaysEstimate = daysToClose > 0;

            if (hasDaysEstimate) {
                // Forecast baseado na data prevista de fechamento pela IA
                if (daysToClose <= 30) period30Days += weightedValue;
                if (daysToClose <= 60) period60Days += weightedValue;

                // Mês atual: verifica se a data prevista cai dentro do mês corrente
                const predictedCloseDate = new Date(now.getTime() + daysToClose * 24 * 60 * 60 * 1000);
                if (predictedCloseDate >= firstDayOfMonth && predictedCloseDate <= lastDayOfMonth) {
                    currentMonth += weightedValue;
                }
            } else {
                // Fallback por probabilidade quando IA não forneceu estimativa de dias
                if (prob > 0.7) period30Days += weightedValue; // Alta prob → tende a fechar em 30 dias
                if (prob > 0.5) period60Days += weightedValue; // Prob moderada → 60 dias
                if (prob > 0.5) currentMonth += weightedValue; // Mesmo critério para mês atual
            }

            // Agregações por vendedor e pipeline (usam valor ponderado total, independente de período)
            const sellerName = op.assignedUser?.name || "Sem Atribuição";
            sellerMap.set(sellerName, (sellerMap.get(sellerName) || 0) + weightedValue);

            const pipelineName = op.pipeline?.name || "Padrão";
            pipelineMap.set(pipelineName, (pipelineMap.get(pipelineName) || 0) + weightedValue);
        }

        return {
            period30Days,
            period60Days,
            currentMonth,
            weightedBySeller: Array.from(sellerMap.entries()).map(([sellerName, forecast]) => ({ sellerName, forecast })),
            weightedByPipeline: Array.from(pipelineMap.entries()).map(([pipelineName, forecast]) => ({ pipelineName, forecast }))
        };
    }
}

export default RevenueForecastService;
