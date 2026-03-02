import { Op, Sequelize } from "sequelize";
import Opportunity from "../../models/Opportunity";
import OpportunityMovement from "../../models/OpportunityMovement";
import AISuggestionFeedback from "../../models/AISuggestionFeedback";
import RevenueForecastService from "./RevenueForecastService";
import PipelineHealthScoreService from "./PipelineHealthScoreService";
import Pipeline from "../../models/Pipeline";
import CrmLead from "../../models/CrmLead";
import moment from "moment";
import Setting from "../../models/Setting";

interface DashboardData {
    revenue: {
        real: number;
        forecast: number;
        target: number;
        gap: number;
    };
    performance: {
        winRate: number;
        avgSalesCycle: number;
        sellerRanking: any[];
    };
    risks: {
        highRiskCount: number;
        slaExpiredRate: number;
        idleLeadsCount: number;
    };
    leads: {
        scheduledToday: number;
        totalScheduled: number;
        totalGenerated: number;
        totalConverted: number;
    };
    aiRoi: {
        movementRate: number;
        accuracyRate: number;
        estimatedEfficiencyGain: number;
    };
    pipelineHealth: any[];
}

class GetExecutiveDashboardService {
    public static async execute(companyId: number, profile: string, userId: number): Promise<DashboardData> {
        const admin = profile === "admin";

        // Dois where separados: Opportunity usa assignedUserId, CrmLead usa ownerUserId
        const oppWhere: any = { companyId };
        const leadWhere: any = { companyId };
        if (!admin) {
            oppWhere.assignedUserId = userId; // campo correto em Opportunity
            leadWhere.ownerUserId = userId;   // campo correto em CrmLead
        }

        // 1. Receita Real (WON)
        const realRevenue = await Opportunity.sum("value", { where: { ...oppWhere, status: "WON" } }) || 0;

        // 2. Forecast da IA
        const forecastData = await RevenueForecastService.execute(companyId, profile, userId);

        // 3. Win Rate
        const wonCount = await Opportunity.count({ where: { ...oppWhere, status: "WON" } });
        const lostCount = await Opportunity.count({ where: { ...oppWhere, status: "LOST" } });
        const totalClosed = wonCount + lostCount;
        const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;

        // 4. Ciclo Médio de Vendas (Dias) — usa updatedAt como proxy de fechamento para WON
        const avgSalesCycleResult = await Opportunity.findOne({
            where: {
                ...oppWhere,
                status: "WON"
            },
            attributes: [
                [Sequelize.fn("AVG", Sequelize.literal("EXTRACT(EPOCH FROM (\"updatedAt\" - \"createdAt\")) / 86400")), "avgDays"]
            ],
            raw: true
        }) as any;
        const avgSalesCycle = parseFloat(avgSalesCycleResult?.avgDays || 0);

        // 5. Riscos
        const highRiskCount = await Opportunity.count({
            where: { ...oppWhere, status: "OPEN" },
            include: [{ association: "prediction", where: { riskLevel: "HIGH" } }]
        });

        const totalOpen = await Opportunity.count({ where: { ...oppWhere, status: "OPEN" } });
        const slaExpiredCount = await Opportunity.count({
            where: { ...oppWhere, status: "OPEN", slaDeadline: { [Op.lt]: new Date() } }
        });
        const slaExpiredRate = totalOpen > 0 ? (slaExpiredCount / totalOpen) * 100 : 0;

        // Leads parados há mais de 7 dias (sem atualização)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const idleLeadsCount = await Opportunity.count({
            where: { ...oppWhere, status: "OPEN", updatedAt: { [Op.lt]: sevenDaysAgo } }
        });

        // 6. ROI da IA
        const totalMovements = await OpportunityMovement.count({ where: { companyId } });
        const aiMovements = await OpportunityMovement.count({ where: { companyId, movedBy: "AI" } });
        const movementRate = totalMovements > 0 ? (aiMovements / totalMovements) * 100 : 0;

        const totalFeedback = await AISuggestionFeedback.count({ where: { companyId } });
        const positiveFeedback = await AISuggestionFeedback.count({ where: { companyId, feedback: "AGREE" } });
        const accuracyRate = totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0;

        // 7. Saúde dos Pipelines
        const pipelines = await Pipeline.findAll({ where: { companyId } });
        const pipelineHealth = await Promise.all(pipelines.map(async (p) => {
            const health = await PipelineHealthScoreService.execute(companyId, p.id, profile, userId);
            return {
                id: p.id,
                name: p.name,
                ...health
            };
        }));

        // 8. Lead Metrics (Reuniões e Conversões) — usa leadWhere com ownerUserId correto
        const todayStart = moment().startOf('day').toDate();
        const todayEnd = moment().endOf('day').toDate();

        const scheduledToday = await CrmLead.count({
            where: {
                ...leadWhere,
                meetingScheduledAt: {
                    [Op.between]: [todayStart, todayEnd]
                }
            }
        });

        const totalScheduled = await CrmLead.count({
            where: { ...leadWhere, meetingScheduledAt: { [Op.not]: null } }
        });

        const totalGenerated = await CrmLead.count({
            where: leadWhere
        });

        const totalConverted = await CrmLead.count({
            where: { ...leadWhere, status: "convertido" }
        });

        // 9. Goal (Meta)
        let target = 1000000; // Fallback padrão
        const adminGoalSetting = await Setting.findOne({ where: { companyId, key: "executive_goal" } });
        const userGoalSetting = await Setting.findOne({ where: { companyId, key: `executive_goal_${userId}` } });

        if (!admin && userGoalSetting && userGoalSetting.value) {
            target = Number(userGoalSetting.value);
        } else if (adminGoalSetting && adminGoalSetting.value) {
            target = Number(adminGoalSetting.value);
        }

        return {
            revenue: {
                real: realRevenue,
                forecast: forecastData.currentMonth,
                target,
                gap: Math.max(0, target - (realRevenue + forecastData.currentMonth))
            },
            performance: {
                winRate,
                avgSalesCycle,
                sellerRanking: forecastData.weightedBySeller
            },
            risks: {
                highRiskCount,
                slaExpiredRate,
                idleLeadsCount
            },
            leads: {
                scheduledToday,
                totalScheduled,
                totalGenerated,
                totalConverted
            },
            aiRoi: {
                movementRate,
                accuracyRate,
                estimatedEfficiencyGain: (movementRate * 0.5) + (accuracyRate * 0.2)
            },
            pipelineHealth
        };
    }
}

export default GetExecutiveDashboardService;
