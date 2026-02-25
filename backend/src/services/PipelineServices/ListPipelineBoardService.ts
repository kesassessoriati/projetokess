import { Op, fn, col } from "sequelize";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Opportunity from "../../models/Opportunity";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";

interface Request {
    pipelineId: number;
    companyId: number;
    stageId?: number;
    cursor?: string; // Base64 ou string formatada: "createdAt_id"
    limit?: number;
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
    createdAt: Date;
}

interface BoardStage {
    id: number;
    name: string;
    order: number;
    color: string;
    totalValue: number;
    opportunitiesCount: number;
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
    limit = 50
}: Request): Promise<BoardResponse> => {
    // 1. Buscar o Pipeline e seus Estágios
    const pipeline = await Pipeline.findOne({
        where: { id: pipelineId, companyId },
        include: [
            {
                model: PipelineStage,
                as: "stages",
                attributes: ["id", "name", "order", "color", "probability"]
            }
        ],
        order: [[{ model: PipelineStage, as: "stages" }, "order", "ASC"]]
    });

    if (!pipeline) {
        throw new AppError("ERR_NO_PIPELINE_FOUND", 404);
    }

    // 2. Buscar Agregações (Count e Sum) por Estágio em uma única query
    const stats = await Opportunity.findAll({
        attributes: [
            "stageId",
            [fn("COUNT", col("id")), "count"],
            [fn("SUM", col("value")), "totalValue"]
        ],
        where: {
            pipelineId,
            companyId,
            status: "OPEN"
        },
        group: ["stageId"],
        raw: true
    }) as unknown as { stageId: number; count: string; totalValue: string }[];

    const statsMap = stats.reduce((acc, curr) => {
        acc[curr.stageId] = {
            count: parseInt(curr.count, 10),
            totalValue: parseFloat(curr.totalValue || "0")
        };
        return acc;
    }, {} as Record<number, { count: number; totalValue: number }>);

    // 3. Função para buscar oportunidades de um estágio com cursor
    const getOpportunitiesForStage = async (sId: number, sCursor?: string) => {
        const where: any = {
            stageId: sId,
            companyId,
            status: "OPEN"
        };

        if (sCursor) {
            const [createdAt, id] = Buffer.from(sCursor, 'base64').toString('ascii').split('_');
            where[Op.or] = [
                {
                    createdAt: { [Op.lt]: new Date(createdAt) }
                },
                {
                    createdAt: new Date(createdAt),
                    id: { [Op.lt]: parseInt(id, 10) }
                }
            ];
        }

        const opportunities = await Opportunity.findAll({
            where,
            include: [
                {
                    model: Contact,
                    as: "contact",
                    attributes: ["id", "name"]
                }
            ],
            limit: limit + 1, // Buscar um a mais para saber se tem próxima página
            order: [
                ["createdAt", "DESC"],
                ["id", "DESC"]
            ],
            attributes: ["id", "title", "value", "status", "createdAt"]
        });

        const hasMore = opportunities.length > limit;
        const results = hasMore ? opportunities.slice(0, limit) : opportunities;

        let nextCursor = null;
        if (hasMore) {
            const lastItem = results[results.length - 1];
            nextCursor = Buffer.from(`${lastItem.createdAt.toISOString()}_${lastItem.id}`).toString('base64');
        }

        return {
            results,
            hasMore,
            nextCursor
        };
    };

    // 4. Montar o Board
    const boardStages: BoardStage[] = await Promise.all(
        pipeline.stages.map(async (stage) => {
            // Se stageId foi passado, só carregamos oportunidades para aquele estágio específico
            // Caso contrário, carregamos a primeira página para todos (ou conforme regra de negócio)
            const shouldLoadOps = !stageId || stageId === stage.id;

            let opsData = { results: [], hasMore: false, nextCursor: null };
            if (shouldLoadOps) {
                opsData = await getOpportunitiesForStage(stage.id, stageId === stage.id ? cursor : undefined);
            }

            const stageStats = statsMap[stage.id] || { count: 0, totalValue: 0 };

            return {
                id: stage.id,
                name: stage.name,
                order: stage.order,
                color: stage.color,
                totalValue: stageStats.totalValue,
                opportunitiesCount: stageStats.count,
                opportunities: opsData.results.map(op => ({
                    id: op.id,
                    title: op.title,
                    value: Number(op.value),
                    status: op.status,
                    contact: op.contact,
                    createdAt: op.createdAt
                })),
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
