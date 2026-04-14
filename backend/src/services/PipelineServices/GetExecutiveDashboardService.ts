import { Op, fn, literal } from "sequelize";
import moment from "moment";

import AISuggestionFeedback from "../../models/AISuggestionFeedback";
import CrmLead from "../../models/CrmLead";
import Opportunity from "../../models/Opportunity";
import OpportunityMovement from "../../models/OpportunityMovement";
import OpportunityPrediction from "../../models/OpportunityPrediction";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Setting from "../../models/Setting";
import User from "../../models/User";

type PeriodPreset = "today" | "week" | "month" | "quarter" | "custom";

interface DashboardFilters {
  companyId: number;
  profile: string;
  userId: number;
  period?: string;
  dateFrom?: string;
  dateTo?: string;
  pipelineId?: number;
  reportUserId?: number;
}

interface GoalTarget {
  global: number;
  team: number;
  current: number;
  sellers: Array<{
    userId: number;
    name: string;
    target: number;
  }>;
}

interface DashboardData {
  filters: {
    period: PeriodPreset;
    dateFrom: string;
    dateTo: string;
    reportUserId: number | null;
    pipelineId: number | null;
    scope: "company" | "seller";
    scopeLabel: string;
    canSelectUsers: boolean;
    canEditGoals: boolean;
  };
  periodProgress: {
    elapsedDays: number;
    totalDays: number;
    elapsedPercentage: number;
    label: string;
    expectedRevenue: number;
  };
  targets: GoalTarget;
  revenue: {
    real: number;
    forecast: number;
    target: number;
    gap: number;
    projectedTotal: number;
    achievedPercentage: number;
    expectedToDateGap: number;
  };
  meetings: {
    scheduledInPeriod: number;
    upcoming: number;
  };
  leads: {
    generated: number;
    converted: number;
    conversionRate: number;
  };
  aiRoi: {
    movementRate: number;
    accuracyRate: number;
    estimatedEfficiencyGain: number;
  };
  performance: {
    avgSalesCycle: number;
    winRate: number;
    sellerRanking: Array<{
      sellerId: number;
      sellerName: string;
      forecast: number;
      realRevenue: number;
      target: number;
      projectedTotal: number;
      progressPercentage: number;
      achievedPercentage: number;
      convertedLeads: number;
    }>;
  };
  pipelineHealth: {
    selectedPipeline: null | {
      id: number;
      name: string;
      isDefault: boolean;
    };
    overview: {
      totalStages: number;
      totalCurrentCards: number;
      totalEnteredInPeriod: number;
      totalCurrentValue: number;
      averageStageScore: number;
    };
    stages: Array<{
      id: number;
      name: string;
      color: string;
      order: number;
      score: number;
      currentCards: number;
      enteredInPeriod: number;
      currentValue: number;
      currentLeadCount: number;
      currentOpportunityCount: number;
      movedIntoStageCount: number;
      leadEntriesCount: number;
      opportunityCreatedCount: number;
    }>;
  };
  selectors: {
    users: Array<{ id: number; name: string }>;
    pipelines: Array<{ id: number; name: string; isDefault: boolean }>;
  };
  emptyStates: {
    revenue: boolean;
    meetings: boolean;
    pipeline: boolean;
    forecast: boolean;
  };
}

const CONVERTED_LEAD_STATUSES = ["convertido", "won", "converted"];
const DEFAULT_TARGET = 0;

const toNumber = (value: any): number => Number(value || 0);

const resolvePeriodRange = (
  period?: string,
  dateFrom?: string,
  dateTo?: string
): {
  period: PeriodPreset;
  start: moment.Moment;
  end: moment.Moment;
} => {
  const now = moment();
  const normalized = (period || "month") as PeriodPreset;

  if (normalized === "custom" && dateFrom && dateTo) {
    return {
      period: "custom",
      start: moment(dateFrom).startOf("day"),
      end: moment(dateTo).endOf("day")
    };
  }

  switch (normalized) {
    case "today":
      return { period: "today", start: now.clone().startOf("day"), end: now.clone().endOf("day") };
    case "week":
      return { period: "week", start: now.clone().startOf("isoWeek"), end: now.clone().endOf("isoWeek") };
    case "quarter":
      return { period: "quarter", start: now.clone().startOf("quarter"), end: now.clone().endOf("quarter") };
    case "month":
    default:
      return { period: "month", start: now.clone().startOf("month"), end: now.clone().endOf("month") };
  }
};

const buildDateRange = (start: moment.Moment, end: moment.Moment) => ({
  [Op.between]: [start.toDate(), end.toDate()]
});

const sumOpportunitiesWithLeadFallback = (opportunities: Opportunity[]): number =>
  opportunities.reduce((acc, opportunity: any) => {
    const value = toNumber(opportunity.value);
    const fallback = toNumber(opportunity?.lead?.purchaseValue);
    return acc + (value === 0 && fallback > 0 ? fallback : value);
  }, 0);

const getScopeLabel = (scope: "company" | "seller", users: User[], reportUserId?: number) => {
  if (scope === "seller" && reportUserId) {
    const seller = users.find(user => Number(user.id) === Number(reportUserId));
    return seller?.name || "Vendedor";
  }

  return "Visão geral da operação";
};

const getPeriodLabel = (period: PeriodPreset, start: moment.Moment, end: moment.Moment) => {
  if (period === "today") return "Hoje";
  if (period === "week") return "Semana";
  if (period === "month") return "Mês";
  if (period === "quarter") return "Trimestre";
  return `${start.format("DD/MM/YYYY")} até ${end.format("DD/MM/YYYY")}`;
};

const getGoalValue = (settingsMap: Map<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = settingsMap.get(key);
    if (value !== undefined && value !== null && value !== "") {
      return toNumber(value);
    }
  }

  return DEFAULT_TARGET;
};

class GetExecutiveDashboardService {
  public static async execute({
    companyId,
    profile,
    userId,
    period,
    dateFrom,
    dateTo,
    pipelineId,
    reportUserId
  }: DashboardFilters): Promise<DashboardData> {
    const isAdmin = profile === "admin";
    const activeUserId = isAdmin ? (reportUserId || undefined) : userId;
    const scope: "company" | "seller" = activeUserId ? "seller" : "company";
    const range = resolvePeriodRange(period, dateFrom, dateTo);
    const createdRange = buildDateRange(range.start, range.end);
    const today = moment();
    const totalDays = Math.max(1, range.end.clone().startOf("day").diff(range.start.clone().startOf("day"), "days") + 1);
    const elapsedDays = Math.min(
      totalDays,
      Math.max(1, today.clone().startOf("day").diff(range.start.clone().startOf("day"), "days") + 1)
    );
    const elapsedPercentage = Math.min(100, Number(((elapsedDays / totalDays) * 100).toFixed(1)));

    const [users, pipelines, settings] = await Promise.all([
      User.findAll({
        where: { companyId },
        attributes: ["id", "name", "profile"],
        order: [["name", "ASC"]]
      }),
      Pipeline.findAll({
        where: { companyId, isActive: true },
        attributes: ["id", "name", "isDefault"],
        order: [["isDefault", "DESC"], ["name", "ASC"]]
      }),
      Setting.findAll({
        where: {
          companyId,
          [Op.or]: [
            { key: "executive_goal" },
            { key: "executive_goal_global" },
            { key: "executive_goal_team" },
            { key: { [Op.like]: "executive_goal_%" } },
            { key: { [Op.like]: "executive_goal_user_%" } }
          ]
        }
      })
    ]);

    const settingsMap = new Map<string, string>(settings.map(setting => [setting.key, setting.value]));
    const selectedPipelineModel =
      (pipelineId ? pipelines.find(item => Number(item.id) === Number(pipelineId)) : undefined) ||
      pipelines.find(item => item.isDefault) ||
      pipelines[0];
    const selectedPipelineId = selectedPipelineModel ? Number(selectedPipelineModel.id) : undefined;

    const availableSellers = users
      .filter(item => item.profile !== "admin")
      .map(item => ({
        id: Number(item.id),
        name: item.name
      }));

    const sellerTargets = availableSellers.map(seller => ({
      userId: seller.id,
      name: seller.name,
      target: getGoalValue(settingsMap, [`executive_goal_user_${seller.id}`, `executive_goal_${seller.id}`])
    }));

    const globalTarget = getGoalValue(settingsMap, ["executive_goal_global", "executive_goal"]);
    const explicitTeamTarget = getGoalValue(settingsMap, ["executive_goal_team"]);
    const aggregatedSellerTarget = sellerTargets.reduce((acc, item) => acc + item.target, 0);
    const teamTarget = explicitTeamTarget || aggregatedSellerTarget || globalTarget;
    const currentTarget = activeUserId
      ? getGoalValue(settingsMap, [`executive_goal_user_${activeUserId}`, `executive_goal_${activeUserId}`, "executive_goal_global", "executive_goal"])
      : globalTarget;

    const opportunityScopeWhere: any = {
      companyId,
      ...(selectedPipelineId ? { pipelineId: selectedPipelineId } : {}),
      ...(activeUserId ? { assignedUserId: activeUserId } : {})
    };
    const leadScopeWhere: any = {
      companyId,
      ...(selectedPipelineId ? { pipelineId: selectedPipelineId } : {}),
      ...(activeUserId ? { ownerUserId: activeUserId } : {})
    };
    const scopedOpportunityInclude =
      activeUserId || selectedPipelineId
        ? [
            {
              model: Opportunity,
              required: true,
              attributes: [],
              where: opportunityScopeWhere
            }
          ]
        : undefined;

    const [
      wonRevenue,
      openOpportunities,
      wonCount,
      lostCount,
      generatedLeads,
      convertedLeads,
      scheduledInPeriod,
      upcomingMeetings,
      aiMovementCount,
      totalMovements,
      positiveFeedback,
      totalFeedback,
      avgSalesCycleRaw
    ] = await Promise.all([
      Opportunity.sum("value", {
        where: {
          ...opportunityScopeWhere,
          status: "WON",
          updatedAt: createdRange
        }
      }),
      Opportunity.findAll({
        where: {
          ...opportunityScopeWhere,
          status: "OPEN"
        },
        include: [
          {
            model: OpportunityPrediction,
            as: "prediction",
            attributes: ["predictedCloseProbability", "predictedDaysToClose"]
          },
          {
            model: CrmLead,
            as: "lead",
            attributes: ["id", "purchaseValue"]
          }
        ],
        attributes: ["id", "value", "assignedUserId", "updatedAt", "createdAt", "stageId", "leadId"]
      }),
      Opportunity.count({
        where: {
          ...opportunityScopeWhere,
          status: "WON",
          updatedAt: createdRange
        }
      }),
      Opportunity.count({
        where: {
          ...opportunityScopeWhere,
          status: "LOST",
          updatedAt: createdRange
        }
      }),
      CrmLead.count({
        where: {
          ...leadScopeWhere,
          createdAt: createdRange
        }
      }),
      CrmLead.count({
        where: {
          ...leadScopeWhere,
          status: {
            [Op.in]: CONVERTED_LEAD_STATUSES
          },
          [Op.or]: [
            { convertedAt: createdRange },
            { updatedAt: createdRange }
          ]
        }
      }),
      CrmLead.count({
        where: {
          ...leadScopeWhere,
          meetingScheduledAt: createdRange
        }
      }),
      CrmLead.count({
        where: {
          ...leadScopeWhere,
          meetingScheduledAt: {
            [Op.gte]: moment().startOf("day").toDate()
          }
        }
      }),
      OpportunityMovement.count({
        where: {
          companyId,
          movedBy: "AI",
          createdAt: createdRange
        },
        include: scopedOpportunityInclude
      }),
      OpportunityMovement.count({
        where: {
          companyId,
          createdAt: createdRange
        },
        include: scopedOpportunityInclude
      }),
      AISuggestionFeedback.count({
        where: {
          companyId,
          feedback: "AGREE",
          createdAt: createdRange
        },
        include: scopedOpportunityInclude
      }),
      AISuggestionFeedback.count({
        where: {
          companyId,
          createdAt: createdRange
        },
        include: scopedOpportunityInclude
      }),
      Opportunity.findOne({
        where: {
          ...opportunityScopeWhere,
          status: "WON",
          updatedAt: createdRange
        },
        attributes: [
          [fn("AVG", literal("EXTRACT(EPOCH FROM (\"updatedAt\" - \"createdAt\")) / 86400")), "avgDays"]
        ],
        raw: true
      }) as any
    ]);

    const forecastRevenue = openOpportunities.reduce((acc, opportunity: any) => {
      const probability = Number(opportunity?.prediction?.predictedCloseProbability || 0);
      const predictedDays = Number(opportunity?.prediction?.predictedDaysToClose || 0);
      const predictedCloseDate = predictedDays > 0 ? moment().add(predictedDays, "days") : null;
      const isInsideRange = predictedCloseDate
        ? predictedCloseDate.isBetween(range.start, range.end, undefined, "[]")
        : probability >= 0.5;
      if (!isInsideRange) return acc;

      const baseValue = toNumber(opportunity.value);
      const fallbackValue = toNumber(opportunity?.lead?.purchaseValue);
      const weightedBase = baseValue === 0 && fallbackValue > 0 ? fallbackValue : baseValue;

      return acc + (weightedBase * probability);
    }, 0);

    const realRevenue = toNumber(wonRevenue);
    const projectedTotal = realRevenue + forecastRevenue;
    const target = currentTarget;
    const gap = Math.max(0, target - projectedTotal);
    const expectedRevenue = Number(((target || 0) * (elapsedDays / totalDays)).toFixed(2));
    const expectedToDateGap = Math.max(0, expectedRevenue - realRevenue);
    const achievedPercentage = target > 0 ? Number(((projectedTotal / target) * 100).toFixed(1)) : 0;

    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? Number(((wonCount / totalClosed) * 100).toFixed(1)) : 0;
    const conversionRate = generatedLeads > 0 ? Number(((convertedLeads / generatedLeads) * 100).toFixed(1)) : 0;
    const movementRate = totalMovements > 0 ? Number(((aiMovementCount / totalMovements) * 100).toFixed(1)) : 0;
    const accuracyRate = totalFeedback > 0 ? Number(((positiveFeedback / totalFeedback) * 100).toFixed(1)) : 0;

    const rankingBaseUsers = activeUserId
      ? availableSellers.filter(item => item.id === Number(activeUserId))
      : availableSellers;

    const sellerRanking = await Promise.all(
      rankingBaseUsers.map(async seller => {
        const sellerOpportunities = openOpportunities.filter(
          (opportunity: any) => Number(opportunity.assignedUserId) === Number(seller.id)
        );

        const sellerForecast = sellerOpportunities.reduce((acc, opportunity: any) => {
          const probability = Number(opportunity?.prediction?.predictedCloseProbability || 0);
          const predictedDays = Number(opportunity?.prediction?.predictedDaysToClose || 0);
          const predictedCloseDate = predictedDays > 0 ? moment().add(predictedDays, "days") : null;
          const isInsideRange = predictedCloseDate
            ? predictedCloseDate.isBetween(range.start, range.end, undefined, "[]")
            : probability >= 0.5;
          if (!isInsideRange) return acc;

          const baseValue = toNumber(opportunity.value);
          const fallbackValue = toNumber(opportunity?.lead?.purchaseValue);
          const weightedBase = baseValue === 0 && fallbackValue > 0 ? fallbackValue : baseValue;
          return acc + (weightedBase * probability);
        }, 0);

        const [sellerRealRevenue, sellerConvertedLeads] = await Promise.all([
          Opportunity.sum("value", {
            where: {
              companyId,
              ...(selectedPipelineId ? { pipelineId: selectedPipelineId } : {}),
              assignedUserId: seller.id,
              status: "WON",
              updatedAt: createdRange
            }
          }),
          CrmLead.count({
            where: {
              companyId,
              ...(selectedPipelineId ? { pipelineId: selectedPipelineId } : {}),
              ownerUserId: seller.id,
              status: {
                [Op.in]: CONVERTED_LEAD_STATUSES
              },
              [Op.or]: [
                { convertedAt: createdRange },
                { updatedAt: createdRange }
              ]
            }
          })
        ]);

        const sellerTarget =
          sellerTargets.find(item => Number(item.userId) === Number(seller.id))?.target || globalTarget;
        const sellerReal = toNumber(sellerRealRevenue);
        const sellerProjected = sellerReal + sellerForecast;

        return {
          sellerId: seller.id,
          sellerName: seller.name,
          forecast: Number(sellerForecast.toFixed(2)),
          realRevenue: Number(sellerReal.toFixed(2)),
          target: sellerTarget,
          projectedTotal: Number(sellerProjected.toFixed(2)),
          progressPercentage: sellerTarget > 0 ? Number(((sellerProjected / sellerTarget) * 100).toFixed(1)) : 0,
          achievedPercentage: sellerTarget > 0 ? Number(((sellerReal / sellerTarget) * 100).toFixed(1)) : 0,
          convertedLeads: sellerConvertedLeads
        };
      })
    );

    sellerRanking.sort((a, b) => {
      if (b.progressPercentage !== a.progressPercentage) {
        return b.progressPercentage - a.progressPercentage;
      }

      return b.projectedTotal - a.projectedTotal;
    });

    let pipelineHealthStages: DashboardData["pipelineHealth"]["stages"] = [];
    let pipelineHealthOverview: DashboardData["pipelineHealth"]["overview"] = {
      totalStages: 0,
      totalCurrentCards: 0,
      totalEnteredInPeriod: 0,
      totalCurrentValue: 0,
      averageStageScore: 0
    };

    if (selectedPipelineId) {
      const stages = await PipelineStage.findAll({
        where: { companyId, pipelineId: selectedPipelineId },
        order: [["order", "ASC"], ["id", "ASC"]]
      });

      pipelineHealthStages = await Promise.all(
        stages.map(async stage => {
          const [openStageOpportunities, leadEntriesCount, opportunityCreatedCount, movedIntoStageCount, currentLeadCount] =
            await Promise.all([
              Opportunity.findAll({
                where: {
                  ...opportunityScopeWhere,
                  pipelineId: selectedPipelineId,
                  stageId: stage.id,
                  status: "OPEN"
                },
                include: [
                  {
                    model: CrmLead,
                    as: "lead",
                    attributes: ["id", "purchaseValue"]
                  }
                ],
                attributes: ["id", "value", "leadId"]
              }),
              CrmLead.count({
                where: {
                  ...leadScopeWhere,
                  pipelineId: selectedPipelineId,
                  stageId: stage.id,
                  createdAt: createdRange
                }
              }),
              Opportunity.count({
                where: {
                  ...opportunityScopeWhere,
                  pipelineId: selectedPipelineId,
                  stageId: stage.id,
                  createdAt: createdRange
                }
              }),
              OpportunityMovement.count({
                distinct: true,
                col: "opportunityId",
                where: {
                  companyId,
                  toStageId: stage.id,
                  createdAt: createdRange
                },
                include: [
                  {
                    model: Opportunity,
                    required: true,
                    attributes: [],
                    where: {
                      ...opportunityScopeWhere,
                      pipelineId: selectedPipelineId
                    }
                  }
                ]
              }),
              CrmLead.count({
                where: {
                  ...leadScopeWhere,
                  pipelineId: selectedPipelineId,
                  stageId: stage.id
                }
              })
            ]);

          const currentOpportunityCount = openStageOpportunities.length;
          const currentValue = Number(sumOpportunitiesWithLeadFallback(openStageOpportunities).toFixed(2));
          const enteredInPeriod = opportunityCreatedCount + movedIntoStageCount;

          return {
            id: stage.id,
            name: stage.name,
            color: stage.color || "#178a4a",
            order: stage.order || 0,
            score: Number(stage.probability || 0),
            currentCards: currentOpportunityCount,
            enteredInPeriod,
            currentValue,
            currentLeadCount,
            currentOpportunityCount,
            movedIntoStageCount,
            leadEntriesCount,
            opportunityCreatedCount
          };
        })
      );

      pipelineHealthOverview = {
        totalStages: pipelineHealthStages.length,
        totalCurrentCards: pipelineHealthStages.reduce((acc, item) => acc + item.currentCards, 0),
        totalEnteredInPeriod: pipelineHealthStages.reduce((acc, item) => acc + item.enteredInPeriod, 0),
        totalCurrentValue: Number(
          pipelineHealthStages.reduce((acc, item) => acc + item.currentValue, 0).toFixed(2)
        ),
        averageStageScore: pipelineHealthStages.length
          ? Number(
              (
                pipelineHealthStages.reduce((acc, item) => acc + item.score, 0) / pipelineHealthStages.length
              ).toFixed(1)
            )
          : 0
      };
    }

    return {
      filters: {
        period: range.period,
        dateFrom: range.start.format("YYYY-MM-DD"),
        dateTo: range.end.format("YYYY-MM-DD"),
        reportUserId: activeUserId || null,
        pipelineId: selectedPipelineId || null,
        scope,
        scopeLabel: getScopeLabel(scope, users, activeUserId),
        canSelectUsers: isAdmin,
        canEditGoals: isAdmin
      },
      periodProgress: {
        elapsedDays,
        totalDays,
        elapsedPercentage,
        label: getPeriodLabel(range.period, range.start, range.end),
        expectedRevenue
      },
      targets: {
        global: globalTarget,
        team: teamTarget,
        current: currentTarget,
        sellers: sellerTargets
      },
      revenue: {
        real: Number(realRevenue.toFixed(2)),
        forecast: Number(forecastRevenue.toFixed(2)),
        target,
        gap: Number(gap.toFixed(2)),
        projectedTotal: Number(projectedTotal.toFixed(2)),
        achievedPercentage,
        expectedToDateGap: Number(expectedToDateGap.toFixed(2))
      },
      meetings: {
        scheduledInPeriod,
        upcoming: upcomingMeetings
      },
      leads: {
        generated: generatedLeads,
        converted: convertedLeads,
        conversionRate
      },
      aiRoi: {
        movementRate,
        accuracyRate,
        estimatedEfficiencyGain: Number(((movementRate * 0.55) + (accuracyRate * 0.2)).toFixed(1))
      },
      performance: {
        avgSalesCycle: Number(toNumber(avgSalesCycleRaw?.avgDays).toFixed(1)),
        winRate,
        sellerRanking
      },
      pipelineHealth: {
        selectedPipeline: selectedPipelineModel
          ? {
              id: Number(selectedPipelineModel.id),
              name: selectedPipelineModel.name,
              isDefault: Boolean(selectedPipelineModel.isDefault)
            }
          : null,
        overview: pipelineHealthOverview,
        stages: pipelineHealthStages
      },
      selectors: {
        users: availableSellers,
        pipelines: pipelines.map(item => ({
          id: Number(item.id),
          name: item.name,
          isDefault: Boolean(item.isDefault)
        }))
      },
      emptyStates: {
        revenue: realRevenue === 0 && forecastRevenue === 0,
        meetings: scheduledInPeriod === 0,
        pipeline: pipelineHealthOverview.totalCurrentCards === 0,
        forecast: sellerRanking.length === 0 || sellerRanking.every(item => item.projectedTotal === 0)
      }
    };
  }
}

export default GetExecutiveDashboardService;
