import { Op, fn, col, literal, QueryTypes } from "sequelize";
import PipelineStage from "../../models/PipelineStage";
import Opportunity from "../../models/Opportunity";
import OpportunityMovement from "../../models/OpportunityMovement";
import OpportunityPrediction from "../../models/OpportunityPrediction";

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
    // 1. Valor Total Aberto e Forecast via IA
    // forecastRevenue = SUM(value * predictedCloseProbability) via LEFT JOIN com OpportunityPredictions
    // Oportunidades sem predição contribuem 0 para o forecast (COALESCE)
    const pipelineData = await Opportunity.findAll({
        attributes: [
            [fn("SUM", col("Opportunity.value")), "totalValueOpen"],
            [
                literal('SUM(COALESCE("Opportunity"."value" * "prediction"."predictedCloseProbability", 0))'),
                "forecastRevenue"
            ]
        ],
        include: [
            {
                model: OpportunityPrediction,
                as: "prediction",
                attributes: [],
                required: false // LEFT JOIN: inclui opps sem predição (forecast = 0 para elas)
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

    // 2. Win Rate e Conversion Rate (métricas distintas)
    const closedStats = await Opportunity.findAll({
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

    const statusMap = closedStats.reduce((acc, curr) => {
        acc[curr.status] = parseInt(curr.count, 10);
        return acc;
    }, { WON: 0, LOST: 0 } as Record<string, number>);

    const openCount = await Opportunity.count({
        where: { pipelineId, companyId, status: "OPEN" }
    });

    const totalClosed = statusMap.WON + statusMap.LOST;
    const totalAll = totalClosed + openCount;

    // winRate: percentual de ganhos entre deals finalizados (WON / (WON + LOST))
    const winRate = totalClosed > 0 ? (statusMap.WON / totalClosed) * 100 : 0;

    // conversionRate: percentual de ganhos sobre todas as oportunidades do pipeline
    const conversionRate = totalAll > 0 ? (statusMap.WON / totalAll) * 100 : 0;

    // 3. Tempo Médio por Estágio via SQL raw
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
