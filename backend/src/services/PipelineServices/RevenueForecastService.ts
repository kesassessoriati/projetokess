import { Op, Sequelize } from "sequelize";
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
    public static async execute(companyId: number): Promise<ForecastResult> {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const thirtyDaysAhead = new Date();
        thirtyDaysAhead.setDate(now.getDate() + 30);

        const sixtyDaysAhead = new Date();
        sixtyDaysAhead.setDate(now.getDate() + 60);

        // Buscar todas as oportunidades abertas com predições
        const opportunities = await Opportunity.findAll({
            where: {
                companyId,
                status: "OPEN"
            },
            include: [
                { model: OpportunityPrediction, as: "prediction" },
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

            // Forecast por tempo (usando a data estimada de fechamento se disponível, ou fallback para createdAt + ciclo médio)
            // Por enquanto vamos usar a probabilidade ponderada simples para os intervalos
            period30Days += weightedValue;
            period60Days += weightedValue; // acumulado simplificado

            // No mês atual, somamos apenas se houver alta probabilidade (> 0.7) ou se for o target imediato
            // Na vida real, a IA daria uma "data de fechamento". Aqui simulamos:
            if (prob > 0.5) {
                currentMonth += weightedValue;
            }

            // Agregações
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
