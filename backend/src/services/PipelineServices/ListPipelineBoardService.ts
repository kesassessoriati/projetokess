import { Op, fn, col, literal } from "sequelize";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Opportunity from "../../models/Opportunity";
import Contact from "../../models/Contact";
import OpportunityPrediction from "../../models/OpportunityPrediction";
import AppError from "../../errors/AppError";

interface Request {
    pipelineId: number;
    companyId: number;
    stageId?: number;
    cursor?: string;
    limit?: number;
    filter?: {
        riskLevel?: string;
        minProbability?: number;
        onlyAI?: boolean;
        onlyExpired?: boolean;
    };
    sort?: "AI_PRIORITY" | "CREATED_AT";
}

interface BoardOpportunity {
    id: number;
    title: string;
    value: number;
    status: string;
    contact: {
        id: number;
        name: string;
    };
    prediction?: {
        probability: number;
        riskLevel: string;
        explanation: string;
    };
    aiSuggestedStageId?: number;
    lastMovedBy: string;
    slaStatus: "NORMAL" | "EXPIRED" | "CRITICAL";
    slaDeadline: Date;
    createdAt: Date;
}

interface BoardStage {
    id: number;
    name: string;
    order: number;
    color: string;
    totalValue: number;
    forecastValue: number;
    opportunitiesCount: number;
    highRiskCount: number;
    opportunities: BoardOpportunity[];
    hasMore: boolean;
    nextCursor: string | null;
}

interface BoardResponse {
    pipeline: {
        id: number;
        name: string;
    };
    stages: BoardStage[];
}

const ListPipelineBoardService = async ({
    pipelineId,
    companyId,
    stageId,
    cursor,
    limit = 50,
    filter,
    sort = "CREATED_AT"
}: Request): Promise<BoardResponse> => {
    // 1. Buscar o Pipeline e seus Estágios
    const pipeline = await Pipeline.findOne({
        where: { id: pipelineId, companyId },
        include: [
            {
                model: PipelineStage,
                as: "stages",
                attributes: ["id", "name", "order", "color"]
            }
        ],
        order: [[{ model: PipelineStage, as: "stages" }, "order", "ASC"]]
    });

    if (!pipeline) {
        throw new AppError("ERR_NO_PIPELINE_FOUND", 404);
    }

    // 2. Buscar Agregações Avançadas por Estágio
    // Forecast = Sum(Value * PredictedProbability)
    const stats = await Opportunity.findAll({
        attributes: [
            "stageId",
            [fn("COUNT", col("Opportunity.id")), "count"],
            [fn("SUM", col("value")), "totalValue"],
            [literal('SUM(COALESCE("value" * "prediction"."predictedCloseProbability", 0))'), "forecastValue"],
            [literal('COUNT(CASE WHEN "prediction"."riskLevel" = \'HIGH\' THEN 1 END)'), "highRiskCount"]
        ],
        include: [
            {
                model: OpportunityPrediction,
                as: "prediction",
                attributes: []
            }
        ],
        where: {
            pipelineId,
            companyId,
            status: "OPEN"
        },
        group: ["stageId"],
        raw: true
    }) as any[];

    const statsMap = stats.reduce((acc, curr) => {
        acc[curr.stageId] = {
            count: parseInt(curr.count, 10),
            totalValue: parseFloat(curr.totalValue || "0"),
            forecastValue: parseFloat(curr.forecastValue || "0"),
            highRiskCount: parseInt(curr.highRiskCount || "0", 10)
        };
        return acc;
    }, {} as any);

    // 3. Função para buscar oportunidades com filtros e IA
    const getOpportunitiesForStage = async (sId: number, sCursor?: string) => {
        const where: any = {
            stageId: sId,
            companyId,
            status: "OPEN"
        };

        // Filtros Inteligentes
        if (filter) {
            if (filter.riskLevel) {
                // Filtro via join com predictions (será feito no findAll)
            }
            if (filter.onlyAI) {
                where.lastMovedBy = "AI";
            }
            if (filter.onlyExpired) {
                where.slaDeadline = { [Op.lt]: new Date() };
            }
        }

        const include: any[] = [
            {
                model: Contact,
                as: "contact",
                attributes: ["id", "name"]
            },
            {
                model: OpportunityPrediction,
                as: "prediction",
                attributes: ["predictedCloseProbability", "riskLevel", "explanation"]
            }
        ];

        // Se houver filtro de riskLevel ou minProbability, aplicar no include/where
        if (filter?.riskLevel) {
            include[1].where = { riskLevel: filter.riskLevel };
        }
        if (filter?.minProbability) {
            if (!include[1].where) include[1].where = {};
            include[1].where.predictedCloseProbability = { [Op.gte]: filter.minProbability };
        }

        // Ordenação
        let order: any[] = [["createdAt", "DESC"], ["id", "DESC"]];
        if (sort === "AI_PRIORITY") {
            // HIGH RISK primeiro, depois maior probabilidade, depois mais antigo (urgente)
            order = [
                [literal('"prediction"."riskLevel" = \'HIGH\''), "DESC"],
                [literal('"prediction"."predictedCloseProbability"'), "DESC"],
                ["slaDeadline", "ASC NULLS LAST"],
                ["createdAt", "DESC"]
            ];
        }

        if (sCursor) {
            const [createdAt, id] = Buffer.from(sCursor, 'base64').toString('ascii').split('_');
            where[Op.or] = [
                { createdAt: { [Op.lt]: new Date(createdAt) } },
                {
                    createdAt: new Date(createdAt),
                    id: { [Op.lt]: parseInt(id, 10) }
                }
            ];
        }

        const opportunities = await Opportunity.findAll({
            where,
            include,
            limit: limit + 1,
            order,
            attributes: ["id", "title", "value", "status", "createdAt", "slaDeadline", "aiSuggestedStageId", "lastMovedBy"]
        });

        const hasMore = opportunities.length > limit;
        const results = hasMore ? opportunities.slice(0, limit) : opportunities;

        let nextCursor = null;
        if (hasMore) {
            const lastItem = results[results.length - 1];
            nextCursor = Buffer.from(`${lastItem.createdAt.toISOString()}_${lastItem.id}`).toString('base64');
        }

        return { results, hasMore, nextCursor };
    };

    // 4. Montar o Board
    const boardStages: BoardStage[] = await Promise.all(
        pipeline.stages.map(async (stage) => {
            const shouldLoadOps = !stageId || stageId === stage.id;

            let opsData = { results: [], hasMore: false, nextCursor: null };
            if (shouldLoadOps) {
                opsData = await getOpportunitiesForStage(stage.id, stageId === stage.id ? cursor : undefined);
            }

            const stageStats = statsMap[stage.id] || { count: 0, totalValue: 0, forecastValue: 0, highRiskCount: 0 };

            return {
                id: stage.id,
                name: stage.name,
                order: stage.order,
                color: stage.color,
                totalValue: stageStats.totalValue,
                forecastValue: stageStats.forecastValue,
                opportunitiesCount: stageStats.count,
                highRiskCount: stageStats.highRiskCount,
                opportunities: opsData.results.map(op => {
                    const now = new Date();
                    let slaStatus: "NORMAL" | "EXPIRED" | "CRITICAL" = "NORMAL";
                    if (op.slaDeadline) {
                        const deadline = new Date(op.slaDeadline);
                        if (deadline < now) {
                            slaStatus = "EXPIRED";
                        } else if (deadline.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
                            slaStatus = "CRITICAL";
                        }
                    }

                    return {
                        id: op.id,
                        title: op.title,
                        value: Number(op.value),
                        status: op.status,
                        contact: op.contact,
                        prediction: op.prediction ? {
                            probability: op.prediction.predictedCloseProbability,
                            riskLevel: op.prediction.riskLevel,
                            explanation: op.prediction.explanation
                        } : undefined,
                        aiSuggestedStageId: op.aiSuggestedStageId,
                        lastMovedBy: op.lastMovedBy,
                        slaStatus,
                        slaDeadline: op.slaDeadline,
                        createdAt: op.createdAt
                    };
                }),
                hasMore: opsData.hasMore,
                nextCursor: opsData.nextCursor
            };
        })
    );

    return {
        pipeline: {
            id: pipeline.id,
            name: pipeline.name
        },
        stages: boardStages
    };
};

export default ListPipelineBoardService;
