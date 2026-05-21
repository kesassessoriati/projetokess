import { Op, literal, QueryTypes } from "sequelize";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Opportunity from "../../models/Opportunity";
import Contact from "../../models/Contact";
import CrmLead from "../../models/CrmLead";
import OpportunityPrediction from "../../models/OpportunityPrediction";
import AppError from "../../errors/AppError";
import CrmLeadCustomFieldValue from "../../models/CrmLeadCustomFieldValue";
import sequelize from "../../database";

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
    searchKeyword?: string;
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

const applyBoardFilters = (where: any, filter?: Request["filter"]) => {
    if (!filter) return where;

    if (filter.onlyAI) {
        where.lastMovedBy = "AI";
    }
    if (filter.onlyExpired) {
        where.slaDeadline = { [Op.lt]: new Date() };
    }

    return where;
};

const normalizeKeyword = (value?: string): string => String(value || "").trim();

const buildKeywordScope = async (companyId: number, searchKeyword?: string) => {
    const keyword = normalizeKeyword(searchKeyword);
    if (!keyword) return null;

    const like = `%${keyword.replace(/[\\%_]/g, "\\$&")}%`;
    const likeCondition = { [Op.iLike]: like };

    const matchingLeads = await CrmLead.findAll({
        where: {
            companyId,
            [Op.or]: [
                { name: likeCondition },
                { companyName: likeCondition },
                { email: likeCondition },
                { phone: likeCondition },
                { document: likeCondition },
                { cnpj: likeCondition },
                { address: likeCondition },
                { product: likeCondition },
                { source: likeCondition },
                { campaign: likeCondition },
                { medium: likeCondition },
                { notes: likeCondition },
                { position: likeCondition },
                { decisionMakerName: likeCondition },
                { decisionMakerPhone: likeCondition },
                { paymentType: likeCondition },
                { purchaseType: likeCondition },
                { gmn: likeCondition },
                { website: likeCondition },
                { instagram: likeCondition },
                { linkedin: likeCondition },
                { temperature: likeCondition },
                { followUp: likeCondition },
                { followUp2: likeCondition }
            ]
        },
        attributes: ["id"],
        raw: true
    }) as Array<{ id: number }>;

    const matchingCustomValues = await CrmLeadCustomFieldValue.findAll({
        where: {
            companyId,
            value: likeCondition
        },
        attributes: ["leadId"],
        raw: true
    }) as Array<{ leadId: number }>;

    const matchingContacts = await Contact.findAll({
        where: {
            companyId,
            [Op.or]: [
                { name: likeCondition },
                { number: likeCondition },
                { email: likeCondition }
            ]
        },
        attributes: ["id"],
        raw: true
    }) as Array<{ id: number }>;

    const eventRows = await sequelize.query<{ opportunityId: number }>(
        `SELECT DISTINCT "opportunityId"
         FROM "OpportunityEvents"
         WHERE "companyId" = :companyId
           AND "metadata"::text ILIKE :like`,
        {
            type: QueryTypes.SELECT,
            replacements: { companyId, like: `%${keyword}%` }
        }
    );

    const leadIds = Array.from(new Set([
        ...matchingLeads.map(item => item.id),
        ...matchingCustomValues.map(item => item.leadId)
    ])).filter(Boolean);
    const contactIds = matchingContacts.map(item => item.id).filter(Boolean);
    const opportunityIds = eventRows.map(item => item.opportunityId).filter(Boolean);

    const conditions: any[] = [{ title: likeCondition }];
    if (leadIds.length > 0) conditions.push({ leadId: { [Op.in]: leadIds } });
    if (contactIds.length > 0) conditions.push({ contactId: { [Op.in]: contactIds } });
    if (opportunityIds.length > 0) conditions.push({ id: { [Op.in]: opportunityIds } });

    return { [Op.or]: conditions };
};

const buildPredictionInclude = (filter?: Request["filter"], attributes: string[] = []) => {
    const predictionInclude: any = {
        model: OpportunityPrediction,
        as: "prediction",
        attributes,
        required: Boolean(filter?.riskLevel || filter?.minProbability)
    };

    if (filter?.riskLevel || filter?.minProbability) {
        predictionInclude.where = {};
        if (filter.riskLevel) {
            predictionInclude.where.riskLevel = filter.riskLevel;
        }
        if (filter.minProbability) {
            predictionInclude.where.predictedCloseProbability = { [Op.gte]: filter.minProbability };
        }
    }

    return predictionInclude;
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
    viewMode,
    searchKeyword
}: Request): Promise<BoardResponse> => {
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

    const keywordScope = await buildKeywordScope(companyId, searchKeyword);
    if (keywordScope) {
        scopedOpportunityWhere[Op.and] = [
            ...(Array.isArray(scopedOpportunityWhere[Op.and]) ? scopedOpportunityWhere[Op.and] : []),
            keywordScope
        ];
    }

    const scopedStatsWhere = applyBoardFilters({ ...scopedOpportunityWhere }, filter);

    const statsRows = await Opportunity.findAll({
        attributes: ["id", "stageId", "value"],
        include: [
            {
                model: CrmLead,
                as: "lead",
                attributes: ["id", "purchaseValue"],
                where: { companyId },
                required: false
            },
            buildPredictionInclude(filter, ["predictedCloseProbability", "riskLevel"])
        ],
        where: scopedStatsWhere
    });

    const uniqueStatsRows = Array.from(
        new Map(statsRows.map(op => [op.id, op])).values()
    );

    const statsMap = uniqueStatsRows.reduce((acc, op) => {
        const stageKey = op.stageId;
        const fallbackLeadValue = op.lead?.purchaseValue != null ? Number(op.lead.purchaseValue) : 0;
        const opportunityValue = Number(op.value || 0);
        const effectiveValue =
            opportunityValue === 0 && fallbackLeadValue > 0
                ? fallbackLeadValue
                : opportunityValue;
        const probability = Number(op.prediction?.predictedCloseProbability || 0);

        if (!acc[stageKey]) {
            acc[stageKey] = {
                count: 0,
                totalValue: 0,
                forecastValue: 0,
                highRiskCount: 0
            };
        }

        acc[stageKey].count += 1;
        acc[stageKey].totalValue += effectiveValue;
        acc[stageKey].forecastValue += effectiveValue * probability;
        if (op.prediction?.riskLevel === "HIGH") {
            acc[stageKey].highRiskCount += 1;
        }

        return acc;
    }, {} as any);

    const effectiveLimit = normalizeKeyword(searchKeyword) ? Math.max(limit, 1000) : limit;

    const getOpportunitiesForStage = async (sId: number, sCursor?: string) => {
        const where: any = {
            ...scopedOpportunityWhere,
            stageId: sId
        };
        applyBoardFilters(where, filter);

        const include: any[] = [
            {
                model: Contact,
                as: "contact",
                attributes: ["id", "name", "number"],
                where: { companyId },
                required: false
            },
            {
                model: CrmLead,
                as: "lead",
                where: { companyId },
                required: false
            },
            buildPredictionInclude(filter, ["predictedCloseProbability", "riskLevel", "explanation"])
        ];

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
            limit: effectiveLimit + 1,
            order,
            attributes: ["id", "title", "value", "status", "createdAt", "slaDeadline", "aiSuggestedStageId", "lastMovedBy", "leadId", "contactId", "pipelineId", "stageId"]
        });

        const hasMore = opportunities.length > effectiveLimit;
        const results = hasMore ? opportunities.slice(0, effectiveLimit) : opportunities;

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
