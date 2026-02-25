import { Op, fn, col, literal, QueryTypes } from "sequelize";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Opportunity from "../../models/Opportunity";
import OpportunityMovement from "../../models/OpportunityMovement";

interface Request {
    pipelineId: number;
    companyId: number;
}

interface MetricsResponse {
    totalValueOpen: number;
    forecastRevenue: number;
    conversionRate: number;
    winRate: number;
    averageTimePerStage: Array<{
        stageId: number;
        stageName: string;
        averageDays: number;
    }>;
}

const GetPipelineMetricsService = async ({
    pipelineId,
    companyId
}: Request): Promise<MetricsResponse> => {
    // 1. Calcular Valor Total Aberto e Forecast (Forecast = Value * Stage Probability)
    const pipelineData = await Opportunity.findAll({
        attributes: [
            [fn("SUM", col("Opportunity.value")), "totalValueOpen"],
            [
                fn("SUM", literal('Opportunity.value * ("stage"."probability" / 100.0)')),
                "forecastRevenue"
            ]
        ],
        include: [
            {
                model: PipelineStage,
                as: "stage",
                attributes: []
            }
        ],
        where: {
            pipelineId,
            companyId,
            status: "OPEN"
        },
        raw: true
    }) as any;

    const totalValueOpen = parseFloat(pipelineData[0]?.totalValueOpen || "0");
    const forecastRevenue = parseFloat(pipelineData[0]?.forecastRevenue || "0");

    // 2. Calcular Win Rate e Conversion Rate
    const stats = await Opportunity.findAll({
        attributes: [
            "status",
            [fn("COUNT", col("id")), "count"]
        ],
        where: {
            pipelineId,
            companyId,
            status: { [Op.in]: ["WON", "LOST"] }
        },
        group: ["status"],
        raw: true
    }) as unknown as { status: string; count: string }[];

    const statusMap = stats.reduce((acc, curr) => {
        acc[curr.status] = parseInt(curr.count, 10);
        return acc;
    }, { WON: 0, LOST: 0 } as Record<string, number>);

    const totalFinished = statusMap.WON + statusMap.LOST;
    const winRate = totalFinished > 0 ? (statusMap.WON / totalFinished) * 100 : 0;
    const conversionRate = winRate; // No contexto simples de board, winRate e conversionRate costumam ser usados como sinônimos se a base é "finalizados"

    // 3. Calcular Tempo Médio por Estágio (averageTimePerStage)
    // Usaremos uma query SQL bruta para eficiência, calculando a diferença entre movimentos
    const avgTimePerStage = await OpportunityMovement.sequelize.query(`
        WITH StageDurations AS (
            SELECT 
                "m"."fromStageId" as "stageId",
                "s"."name" as "stageName",
                "m"."createdAt" - LAG("m"."createdAt") OVER (PARTITION BY "m"."opportunityId" ORDER BY "m"."createdAt") as "duration"
            FROM "OpportunityMovements" "m"
            JOIN "PipelineStages" "s" ON "s"."id" = "m"."fromStageId"
            JOIN "Opportunities" "o" ON "o"."id" = "m"."opportunityId"
            WHERE "o"."pipelineId" = :pipelineId AND "o"."companyId" = :companyId
        )
        SELECT 
            "stageId",
            "stageName",
            AVG(EXTRACT(EPOCH FROM "duration") / 86400) as "averageDays"
        FROM StageDurations
        WHERE "duration" IS NOT NULL
        GROUP BY "stageId", "stageName"
    `, {
        replacements: { pipelineId, companyId },
        type: QueryTypes.SELECT
    }) as any[];

    return {
        totalValueOpen,
        forecastRevenue,
        conversionRate,
        winRate,
        averageTimePerStage: avgTimePerStage.map(item => ({
            stageId: item.stageId,
            stageName: item.stageName,
            averageDays: parseFloat(parseFloat(item.averageDays).toFixed(2))
        }))
    };
};

export default GetPipelineMetricsService;
