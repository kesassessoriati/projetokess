import { Op, fn, col, literal } from "sequelize";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Opportunity from "../../models/Opportunity";
import Contact from "../../models/Contact";
import CrmLead from "../../models/CrmLead";
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
    profile?: string;
    userId?: number;
    ownerUserId?: number;
    viewMode?: "team" | "personal";
}

interface BoardOpportunity {
    id: number;
    title: string;
    value: number;
    status: string;
    contact?: {
        id: number;
        name: string;
    };
    lead?: {
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
        scheduledMeetingsCount: number;
    };
    stages: BoardStage[];
}

const normalizeStageKey = (value?: string | null): string =>
    (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

const buildOpportunityScope = ({
    pipelineId,
    companyId,
    profile,
    userId,
    ownerUserId,
    viewMode
}: Pick<Request, "pipelineId" | "companyId" | "profile" | "userId" | "ownerUserId" | "viewMode">) => {
    const where: any = {
        pipelineId,
        companyId,
        status: "OPEN"
    };

    if (profile !== "admin" && userId) {
        where.assignedUserId = userId;
    } else if (profile === "admin") {
        if (ownerUserId) {
            where.assignedUserId = ownerUserId;
        } else if (viewMode === "personal" && userId) {
            where.assignedUserId = userId;
        }
    }

    return where;
};

const buildLeadScope = ({
    pipelineId,
    companyId,
    profile,
    userId,
    ownerUserId,
    viewMode
}: Pick<Request, "pipelineId" | "companyId" | "profile" | "userId" | "ownerUserId" | "viewMode">) => {
    const where: any = {
        pipelineId,
        companyId
    };

    if (profile !== "admin" && userId) {
        where.ownerUserId = userId;
    } else if (profile === "admin") {
        if (ownerUserId) {
            where.ownerUserId = ownerUserId;
        } else if (viewMode === "personal" && userId) {
            where.ownerUserId = userId;
        }
    }

    return where;
};

const ListPipelineBoardService = async ({
    pipelineId,
    companyId,
    stageId,
    cursor,
    limit = 50,
    filter,
    sort = "CREATED_AT",
    profile,
    userId,
    ownerUserId,
    viewMode
}: Request): Promise<BoardResponse> => {
    const effectiveValueSql =
        'CASE WHEN COALESCE("Opportunity"."value", 0) = 0 THEN COALESCE("lead"."purchase_value", 0) ELSE COALESCE("Opportunity"."value", 0) END';

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

    const scopedOpportunityWhere = buildOpportunityScope({
        pipelineId,
        companyId,
        profile,
        userId,
        ownerUserId,
        viewMode
    });

    const stats = await Opportunity.findAll({
        attributes: [
            "stageId",
            [fn("COUNT", col("Opportunity.id")), "count"],
            [literal(`SUM(${effectiveValueSql})`), "totalValue"],
            [literal(`SUM(COALESCE((${effectiveValueSql}) * "prediction"."predictedCloseProbability", 0))`), "forecastValue"],
            [literal('COUNT(CASE WHEN "prediction"."riskLevel" = \'HIGH\' THEN 1 END)'), "highRiskCount"]
        ],
        include: [
            {
                model: CrmLead,
                as: "lead",
                attributes: []
            },
            {
                model: OpportunityPrediction,
                as: "prediction",
                attributes: []
            }
        ],
        where: scopedOpportunityWhere,
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

    const getOpportunitiesForStage = async (sId: number, sCursor?: string) => {
        const where: any = {
            ...scopedOpportunityWhere,
            stageId: sId
        };

        if (filter) {
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
                model: CrmLead,
                as: "lead"
            },
            {
                model: OpportunityPrediction,
                as: "prediction",
                attributes: ["predictedCloseProbability", "riskLevel", "explanation"]
            }
        ];

        if (filter?.riskLevel) {
            include[2].where = { riskLevel: filter.riskLevel };
        }
        if (filter?.minProbability) {
            if (!include[2].where) include[2].where = {};
            include[2].where.predictedCloseProbability = { [Op.gte]: filter.minProbability };
        }

        let order: any[] = [["createdAt", "DESC"], ["id", "DESC"]];
        if (sort === "AI_PRIORITY") {
            order = [
                [literal('"prediction"."riskLevel" = \'HIGH\''), "DESC"],
                [literal('"prediction"."predictedCloseProbability"'), "DESC"],
                ["slaDeadline", "ASC NULLS LAST"],
                ["createdAt", "DESC"]
            ];
        }

        if (sCursor) {
            const [createdAt, id] = Buffer.from(sCursor, "base64").toString("ascii").split("_");
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
            attributes: ["id", "title", "value", "status", "createdAt", "slaDeadline", "aiSuggestedStageId", "lastMovedBy", "leadId", "contactId", "pipelineId", "stageId"]
        });

        const hasMore = opportunities.length > limit;
        const results = hasMore ? opportunities.slice(0, limit) : opportunities;

        let nextCursor = null;
        if (hasMore) {
            const lastItem = results[results.length - 1];
            nextCursor = Buffer.from(`${lastItem.createdAt.toISOString()}_${lastItem.id}`).toString("base64");
        }

        return { results, hasMore, nextCursor };
    };

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
                    const fallbackLeadValue = op.lead?.purchaseValue != null ? Number(op.lead.purchaseValue) : 0;
                    const opportunityValue = Number(op.value || 0);
                    const effectiveValue =
                        opportunityValue === 0 && fallbackLeadValue > 0
                            ? fallbackLeadValue
                            : opportunityValue;

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
                        value: effectiveValue,
                        status: op.status,
                        contact: op.contact,
                        lead: op.lead,
                        prediction: op.prediction ? {
                            probability: op.prediction.predictedCloseProbability,
                            riskLevel: op.prediction.riskLevel,
                            explanation: op.prediction.explanation
                        } : undefined,
                        aiSuggestedStageId: op.aiSuggestedStageId,
                        lastMovedBy: op.lastMovedBy,
                        leadId: op.leadId,
                        contactId: op.contactId,
                        slaStatus,
                        slaDeadline: op.slaDeadline,
                        createdAt: op.createdAt,
                        pipelineId: pipeline.id,
                        stageId: stage.id
                    };
                }),
                hasMore: opsData.hasMore,
                nextCursor: opsData.nextCursor
            };
        })
    );

    const scheduledMeetingStageIds = pipeline.stages
        .filter(stage => normalizeStageKey(stage.name).includes("reuniao agendada"))
        .map(stage => stage.id);

    const scopedLeadWhere = buildLeadScope({
        pipelineId,
        companyId,
        profile,
        userId,
        ownerUserId,
        viewMode
    });

    const scheduledMeetingsCount = await CrmLead.count({
        where: {
            ...scopedLeadWhere,
            [Op.or]: [
                { status: "reuniao_agendada" },
                { leadStatus: "reuniao_agendada" },
                ...(scheduledMeetingStageIds.length > 0 ? [{ stageId: { [Op.in]: scheduledMeetingStageIds } }] : [])
            ]
        }
    });

    return {
        pipeline: {
            id: pipeline.id,
            name: pipeline.name,
            scheduledMeetingsCount
        },
        stages: boardStages
    };
};

export default ListPipelineBoardService;
