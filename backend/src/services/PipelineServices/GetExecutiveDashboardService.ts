import { Op, fn, literal } from "sequelize";
import moment from "moment";

import AISuggestionFeedback from "../../models/AISuggestionFeedback";
import CrmLead from "../../models/CrmLead";
import Appointment from "../../models/Appointment";
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
  value: {
    global: number;
    team: number;
    current: number;
  };
  meetingsScheduled: {
    global: number;
    team: number;
    current: number;
  };
  meetingsCompleted: {
    global: number;
    team: number;
    current: number;
  };
  conversions: {
    global: number;
    team: number;
    current: number;
  };
  sellers: Array<{
    userId: number;
    name: string;
    valueTarget: number;
    meetingsScheduledTarget: number;
    meetingsCompletedTarget: number;
    conversionsTarget: number;
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
  goalCadence: {
    daily: {
      meetingsScheduled: number;
      meetingsCompleted: number;
      conversions: number;
    };
    weekly: {
      meetingsScheduled: number;
      meetingsCompleted: number;
      conversions: number;
    };
    monthly: {
      meetingsScheduled: number;
      meetingsCompleted: number;
      conversions: number;
    };
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
    totalInPeriod: number;
    scheduledInPeriod: number;
    scheduledProgress: number;
    scheduledGap: number;
    completedInPeriod: number;
    completedProgress: number;
    completedGap: number;
    upcoming: number;
  };
  leads: {
    generated: number;
    converted: number;
    activeInPipeline: number;
    conversionRate: number;
    convertedProgress: number;
    convertedGap: number;
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
      generatedLeads: number;
      meetingsScheduled: number;
      meetingsCompleted: number;
      conversions: number;
      valueTarget: number;
      meetingsScheduledTarget: number;
      meetingsCompletedTarget: number;
      conversionsTarget: number;
      projectedTotal: number;
      progressPercentage: number;
      achievedPercentage: number;
      convertedLeads: number;
      operationalScore: number;
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
      totalCurrentLeads: number;
      totalCurrentOpportunities: number;
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
    highlightedStages: Array<{
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
  preferences: {
    highlightedStageIds: number[];
    highlightedStageLimit: number;
    metricVisibility: {
      avgSalesCycle: boolean;
      winRate: boolean;
      stageEntries: boolean;
      monitoredStages: boolean;
      revenueReal: boolean;
      revenueForecast: boolean;
      revenueGap: boolean;
    };
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
const HIGHLIGHT_STAGE_LIMIT = 4;
const GOAL_CATEGORIES = [
  {
    key: "value",
    suffix: "value",
    legacy: ["executive_goal_global", "executive_goal"]
  },
  { key: "meetingsScheduled", suffix: "meetings_scheduled", legacy: [] },
  { key: "meetingsCompleted", suffix: "meetings_completed", legacy: [] },
  { key: "conversions", suffix: "conversions", legacy: [] }
] as const;
const DASHBOARD_METRIC_VISIBILITY_DEFAULTS = {
  avgSalesCycle: false,
  winRate: false,
  stageEntries: false,
  monitoredStages: false,
  revenueReal: false,
  revenueForecast: false,
  revenueGap: false
} as const;

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
      return {
        period: "today",
        start: now.clone().startOf("day"),
        end: now.clone().endOf("day")
      };
    case "week":
      return {
        period: "week",
        start: now.clone().startOf("isoWeek"),
        end: now.clone().endOf("isoWeek")
      };
    case "quarter":
      return {
        period: "quarter",
        start: now.clone().startOf("quarter"),
        end: now.clone().endOf("quarter")
      };
    case "month":
    default:
      return {
        period: "month",
        start: now.clone().startOf("month"),
        end: now.clone().endOf("month")
      };
  }
};

const buildDateRange = (start: moment.Moment, end: moment.Moment) => ({
  [Op.between]: [start.toDate(), end.toDate()]
});

const sumOpportunitiesWithLeadFallback = (
  opportunities: Opportunity[]
): number =>
  opportunities.reduce((acc, opportunity: any) => {
    const value = toNumber(opportunity.value);
    const fallback = toNumber(opportunity?.lead?.purchaseValue);
    return acc + (value === 0 && fallback > 0 ? fallback : value);
  }, 0);

const getScopeLabel = (
  scope: "company" | "seller",
  users: User[],
  reportUserId?: number
) => {
  if (scope === "seller" && reportUserId) {
    const seller = users.find(user => Number(user.id) === Number(reportUserId));
    return seller?.name || "Vendedor";
  }

  return "Visão geral da operação";
};

const getPeriodLabel = (
  period: PeriodPreset,
  start: moment.Moment,
  end: moment.Moment
) => {
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

const getCategoryGoalValue = (
  settingsMap: Map<string, string>,
  categorySuffix: string,
  scope: "global" | "team" | "user",
  userId?: number,
  legacyKeys: string[] = []
) => {
  const keys: string[] = [];

  if (scope === "global") {
    keys.push(`executive_goal_${categorySuffix}_global`, ...legacyKeys);
  } else if (scope === "team") {
    keys.push(`executive_goal_${categorySuffix}_team`);
  } else if (scope === "user" && userId) {
    keys.push(`executive_goal_${categorySuffix}_user_${userId}`);
  }

  if (scope !== "global") {
    keys.push(`executive_goal_${categorySuffix}_global`);
    keys.push(...legacyKeys);
  }

  return getGoalValue(settingsMap, keys);
};

const buildCadenceValue = (target: number, days: number) => {
  if (!target || !days) {
    return {
      daily: 0,
      weekly: 0,
      monthly: 0
    };
  }

  const normalizedDaily = target / days;

  return {
    daily: Math.ceil(normalizedDaily),
    weekly: Math.ceil(normalizedDaily * 7),
    monthly: Math.ceil(normalizedDaily * 30)
  };
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
    const activeUserId = isAdmin ? reportUserId || undefined : userId;
    const scope: "company" | "seller" = activeUserId ? "seller" : "company";
    const range = resolvePeriodRange(period, dateFrom, dateTo);
    const createdRange = buildDateRange(range.start, range.end);
    const today = moment();
    const totalDays = Math.max(
      1,
      range.end
        .clone()
        .startOf("day")
        .diff(range.start.clone().startOf("day"), "days") + 1
    );
    const elapsedDays = Math.min(
      totalDays,
      Math.max(
        1,
        today
          .clone()
          .startOf("day")
          .diff(range.start.clone().startOf("day"), "days") + 1
      )
    );
    const elapsedPercentage = Math.min(
      100,
      Number(((elapsedDays / totalDays) * 100).toFixed(1))
    );

    const [users, pipelines, settings] = await Promise.all([
      User.findAll({
        where: { companyId },
        attributes: ["id", "name", "profile"],
        order: [["name", "ASC"]]
      }),
      Pipeline.findAll({
        where: { companyId, isActive: true },
        attributes: ["id", "name", "isDefault"],
        order: [
          ["isDefault", "DESC"],
          ["name", "ASC"]
        ]
      }),
      Setting.findAll({
        where: {
          companyId,
          [Op.or]: [
            {
              key: {
                [Op.like]: "executive_goal%"
              }
            },
            {
              key: {
                [Op.like]: "executive_stage_highlights%"
              }
            },
            {
              key: {
                [Op.like]: "executive_dashboard_metrics%"
              }
            }
          ]
        }
      })
    ]);

    const settingsMap = new Map<string, string>(
      settings.map(setting => [setting.key, setting.value])
    );
    const selectedPipelineModel =
      (pipelineId
        ? pipelines.find(item => Number(item.id) === Number(pipelineId))
        : undefined) ||
      pipelines.find(item => item.isDefault) ||
      pipelines[0];
    const selectedPipelineId = selectedPipelineModel
      ? Number(selectedPipelineModel.id)
      : undefined;

    const availableSellers = users
      .filter(item => item.profile !== "admin")
      .map(item => ({
        id: Number(item.id),
        name: item.name
      }));

    const globalTargets = GOAL_CATEGORIES.reduce(
      (acc, category) => {
        acc[category.key] = getCategoryGoalValue(
          settingsMap,
          category.suffix,
          "global",
          undefined,
          [...category.legacy]
        );
        return acc;
      },
      {} as Record<string, number>
    );

    const sellerTargets = availableSellers.map(seller => ({
      userId: seller.id,
      name: seller.name,
      valueTarget: getCategoryGoalValue(
        settingsMap,
        "value",
        "user",
        seller.id,
        [
          "executive_goal_user_" + seller.id,
          "executive_goal_" + seller.id,
          "executive_goal_global",
          "executive_goal"
        ]
      ),
      meetingsScheduledTarget: getCategoryGoalValue(
        settingsMap,
        "meetings_scheduled",
        "user",
        seller.id
      ),
      meetingsCompletedTarget: getCategoryGoalValue(
        settingsMap,
        "meetings_completed",
        "user",
        seller.id
      ),
      conversionsTarget: getCategoryGoalValue(
        settingsMap,
        "conversions",
        "user",
        seller.id
      )
    }));

    const teamTargets = {
      value:
        getCategoryGoalValue(settingsMap, "value", "team", undefined, []) ||
        sellerTargets.reduce((acc, item) => acc + item.valueTarget, 0) ||
        globalTargets.value,
      meetingsScheduled:
        getCategoryGoalValue(settingsMap, "meetings_scheduled", "team") ||
        sellerTargets.reduce(
          (acc, item) => acc + item.meetingsScheduledTarget,
          0
        ),
      meetingsCompleted:
        getCategoryGoalValue(settingsMap, "meetings_completed", "team") ||
        sellerTargets.reduce(
          (acc, item) => acc + item.meetingsCompletedTarget,
          0
        ),
      conversions:
        getCategoryGoalValue(settingsMap, "conversions", "team") ||
        sellerTargets.reduce((acc, item) => acc + item.conversionsTarget, 0)
    };

    const currentTargets = activeUserId
      ? {
          value:
            sellerTargets.find(
              item => Number(item.userId) === Number(activeUserId)
            )?.valueTarget || globalTargets.value,
          meetingsScheduled:
            sellerTargets.find(
              item => Number(item.userId) === Number(activeUserId)
            )?.meetingsScheduledTarget || 0,
          meetingsCompleted:
            sellerTargets.find(
              item => Number(item.userId) === Number(activeUserId)
            )?.meetingsCompletedTarget || 0,
          conversions:
            sellerTargets.find(
              item => Number(item.userId) === Number(activeUserId)
            )?.conversionsTarget || 0
        }
      : {
          value: globalTargets.value,
          meetingsScheduled:
            teamTargets.meetingsScheduled || globalTargets.meetingsScheduled,
          meetingsCompleted:
            teamTargets.meetingsCompleted || globalTargets.meetingsCompleted,
          conversions: teamTargets.conversions || globalTargets.conversions
        };

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
    const appointmentScopeWhere: any = {
      companyId,
      ...(activeUserId ? { createdByUserId: activeUserId } : {})
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
      totalMeetingsInPeriod,
      scheduledInPeriod,
      completedMeetingsInPeriod,
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
        attributes: [
          "id",
          "value",
          "assignedUserId",
          "updatedAt",
          "createdAt",
          "stageId",
          "leadId"
        ]
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
          [Op.or]: [{ convertedAt: createdRange }, { updatedAt: createdRange }]
        }
      }),
      Appointment.count({
        where: {
          ...appointmentScopeWhere,
          status: {
            [Op.in]: ["scheduled", "confirmed", "completed", "no_show"]
          },
          startDatetime: createdRange
        }
      }),
      CrmLead.count({
        where: {
          ...leadScopeWhere,
          meetingScheduledAt: createdRange
        }
      }),
      Appointment.count({
        where: {
          ...appointmentScopeWhere,
          status: "completed",
          startDatetime: createdRange
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
          [
            fn(
              "AVG",
              literal('EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 86400')
            ),
            "avgDays"
          ]
        ],
        raw: true
      }) as any
    ]);

    const forecastRevenue = openOpportunities.reduce(
      (acc, opportunity: any) => {
        const probability = Number(
          opportunity?.prediction?.predictedCloseProbability || 0
        );
        const predictedDays = Number(
          opportunity?.prediction?.predictedDaysToClose || 0
        );
        const predictedCloseDate =
          predictedDays > 0 ? moment().add(predictedDays, "days") : null;
        const isInsideRange = predictedCloseDate
          ? predictedCloseDate.isBetween(
              range.start,
              range.end,
              undefined,
              "[]"
            )
          : probability >= 0.5;
        if (!isInsideRange) return acc;

        const baseValue = toNumber(opportunity.value);
        const fallbackValue = toNumber(opportunity?.lead?.purchaseValue);
        const weightedBase =
          baseValue === 0 && fallbackValue > 0 ? fallbackValue : baseValue;

        return acc + weightedBase * probability;
      },
      0
    );

    const realRevenue = toNumber(wonRevenue);
    const projectedTotal = realRevenue + forecastRevenue;
    const target = currentTargets.value;
    const gap = Math.max(0, target - projectedTotal);
    const expectedRevenue = Number(
      ((target || 0) * (elapsedDays / totalDays)).toFixed(2)
    );
    const expectedToDateGap = Math.max(0, expectedRevenue - realRevenue);
    const achievedPercentage =
      target > 0 ? Number(((projectedTotal / target) * 100).toFixed(1)) : 0;
    const scheduledMeetingsProgress =
      currentTargets.meetingsScheduled > 0
        ? Number(
            (
              (scheduledInPeriod / currentTargets.meetingsScheduled) *
              100
            ).toFixed(1)
          )
        : 0;
    const completedMeetingsProgress =
      currentTargets.meetingsCompleted > 0
        ? Number(
            (
              (completedMeetingsInPeriod / currentTargets.meetingsCompleted) *
              100
            ).toFixed(1)
          )
        : 0;
    const conversionsProgress =
      currentTargets.conversions > 0
        ? Number(
            ((convertedLeads / currentTargets.conversions) * 100).toFixed(1)
          )
        : 0;

    const totalClosed = wonCount + lostCount;
    const winRate =
      totalClosed > 0 ? Number(((wonCount / totalClosed) * 100).toFixed(1)) : 0;
    const conversionRate =
      generatedLeads > 0
        ? Number(((convertedLeads / generatedLeads) * 100).toFixed(1))
        : 0;
    const movementRate =
      totalMovements > 0
        ? Number(((aiMovementCount / totalMovements) * 100).toFixed(1))
        : 0;
    const accuracyRate =
      totalFeedback > 0
        ? Number(((positiveFeedback / totalFeedback) * 100).toFixed(1))
        : 0;

    const rankingBaseUsers = activeUserId
      ? availableSellers.filter(item => item.id === Number(activeUserId))
      : availableSellers;

    const sellerRanking = await Promise.all(
      rankingBaseUsers.map(async seller => {
        const sellerOpportunities = openOpportunities.filter(
          (opportunity: any) =>
            Number(opportunity.assignedUserId) === Number(seller.id)
        );

        const sellerForecast = sellerOpportunities.reduce(
          (acc, opportunity: any) => {
            const probability = Number(
              opportunity?.prediction?.predictedCloseProbability || 0
            );
            const predictedDays = Number(
              opportunity?.prediction?.predictedDaysToClose || 0
            );
            const predictedCloseDate =
              predictedDays > 0 ? moment().add(predictedDays, "days") : null;
            const isInsideRange = predictedCloseDate
              ? predictedCloseDate.isBetween(
                  range.start,
                  range.end,
                  undefined,
                  "[]"
                )
              : probability >= 0.5;
            if (!isInsideRange) return acc;

            const baseValue = toNumber(opportunity.value);
            const fallbackValue = toNumber(opportunity?.lead?.purchaseValue);
            const weightedBase =
              baseValue === 0 && fallbackValue > 0 ? fallbackValue : baseValue;
            return acc + weightedBase * probability;
          },
          0
        );

        const [sellerRealRevenue, sellerConvertedLeads, sellerGeneratedLeads] =
          await Promise.all([
            Opportunity.sum("value", {
              where: {
                companyId,
                ...(selectedPipelineId
                  ? { pipelineId: selectedPipelineId }
                  : {}),
                assignedUserId: seller.id,
                status: "WON",
                updatedAt: createdRange
              }
            }),
            CrmLead.count({
              where: {
                companyId,
                ...(selectedPipelineId
                  ? { pipelineId: selectedPipelineId }
                  : {}),
                ownerUserId: seller.id,
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
                companyId,
                ...(selectedPipelineId
                  ? { pipelineId: selectedPipelineId }
                  : {}),
                ownerUserId: seller.id,
                createdAt: createdRange
              }
            })
          ]);

        const sellerGoal = sellerTargets.find(
          item => Number(item.userId) === Number(seller.id)
        );
        const [sellerMeetingsScheduled, sellerMeetingsCompleted] =
          await Promise.all([
            CrmLead.count({
              where: {
                companyId,
                ...(selectedPipelineId
                  ? { pipelineId: selectedPipelineId }
                  : {}),
                ownerUserId: seller.id,
                meetingScheduledAt: createdRange
              }
            }),
            Appointment.count({
              where: {
                companyId,
                createdByUserId: seller.id,
                status: "completed",
                startDatetime: createdRange
              }
            })
          ]);

        const sellerTarget = sellerGoal?.valueTarget || globalTargets.value;
        const sellerReal = toNumber(sellerRealRevenue);
        const sellerProjected = sellerReal + sellerForecast;

        const operationalScore =
          sellerConvertedLeads * 5 +
          sellerMeetingsCompleted * 3 +
          sellerMeetingsScheduled * 2 +
          sellerGeneratedLeads;

        return {
          sellerId: seller.id,
          sellerName: seller.name,
          forecast: Number(sellerForecast.toFixed(2)),
          realRevenue: Number(sellerReal.toFixed(2)),
          target: sellerTarget,
          generatedLeads: sellerGeneratedLeads,
          valueTarget: sellerGoal?.valueTarget || 0,
          meetingsScheduledTarget: sellerGoal?.meetingsScheduledTarget || 0,
          meetingsCompletedTarget: sellerGoal?.meetingsCompletedTarget || 0,
          conversionsTarget: sellerGoal?.conversionsTarget || 0,
          meetingsScheduled: sellerMeetingsScheduled,
          meetingsCompleted: sellerMeetingsCompleted,
          conversions: sellerConvertedLeads,
          projectedTotal: Number(sellerProjected.toFixed(2)),
          progressPercentage:
            sellerTarget > 0
              ? Number(((sellerProjected / sellerTarget) * 100).toFixed(1))
              : 0,
          achievedPercentage:
            sellerTarget > 0
              ? Number(((sellerReal / sellerTarget) * 100).toFixed(1))
              : 0,
          convertedLeads: sellerConvertedLeads,
          operationalScore
        };
      })
    );

    sellerRanking.sort((a, b) => {
      if (b.operationalScore !== a.operationalScore) {
        return b.operationalScore - a.operationalScore;
      }

      if (b.conversions !== a.conversions) {
        return b.conversions - a.conversions;
      }

      if (b.meetingsCompleted !== a.meetingsCompleted) {
        return b.meetingsCompleted - a.meetingsCompleted;
      }

      if (b.meetingsScheduled !== a.meetingsScheduled) {
        return b.meetingsScheduled - a.meetingsScheduled;
      }

      return b.generatedLeads - a.generatedLeads;
    });

    let pipelineHealthStages: DashboardData["pipelineHealth"]["stages"] = [];
    let highlightedStages: DashboardData["pipelineHealth"]["highlightedStages"] =
      [];
    const metricVisibility = (() => {
      try {
        const rawValue = settingsMap.get(
          `executive_dashboard_metrics_user_${userId}`
        );

        if (!rawValue) {
          return { ...DASHBOARD_METRIC_VISIBILITY_DEFAULTS };
        }

        const parsed = JSON.parse(rawValue);

        return {
          avgSalesCycle: Boolean(parsed?.avgSalesCycle),
          winRate: Boolean(parsed?.winRate),
          stageEntries: Boolean(parsed?.stageEntries),
          monitoredStages: Boolean(parsed?.monitoredStages),
          revenueReal: Boolean(parsed?.revenueReal),
          revenueForecast: Boolean(parsed?.revenueForecast),
          revenueGap: Boolean(parsed?.revenueGap)
        };
      } catch (error) {
        return { ...DASHBOARD_METRIC_VISIBILITY_DEFAULTS };
      }
    })();
    let pipelineHealthOverview: DashboardData["pipelineHealth"]["overview"] = {
      totalStages: 0,
      totalCurrentCards: 0,
      totalCurrentLeads: 0,
      totalCurrentOpportunities: 0,
      totalEnteredInPeriod: 0,
      totalCurrentValue: 0,
      averageStageScore: 0
    };

    if (selectedPipelineId) {
      const stages = await PipelineStage.findAll({
        where: { companyId, pipelineId: selectedPipelineId },
        order: [
          ["order", "ASC"],
          ["id", "ASC"]
        ]
      });

      pipelineHealthStages = await Promise.all(
        stages.map(async stage => {
          const [
            openStageOpportunities,
            leadEntriesCount,
            opportunityCreatedCount,
            movedIntoStageCount,
            currentLeadCount
          ] = await Promise.all([
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
          const currentValue = Number(
            sumOpportunitiesWithLeadFallback(openStageOpportunities).toFixed(2)
          );
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
        totalCurrentCards: pipelineHealthStages.reduce(
          (acc, item) => acc + item.currentCards,
          0
        ),
        totalCurrentLeads: pipelineHealthStages.reduce(
          (acc, item) => acc + item.currentLeadCount,
          0
        ),
        totalCurrentOpportunities: pipelineHealthStages.reduce(
          (acc, item) => acc + item.currentOpportunityCount,
          0
        ),
        totalEnteredInPeriod: pipelineHealthStages.reduce(
          (acc, item) => acc + item.enteredInPeriod,
          0
        ),
        totalCurrentValue: Number(
          pipelineHealthStages
            .reduce((acc, item) => acc + item.currentValue, 0)
            .toFixed(2)
        ),
        averageStageScore: pipelineHealthStages.length
          ? Number(
              (
                pipelineHealthStages.reduce(
                  (acc, item) => acc + item.score,
                  0
                ) / pipelineHealthStages.length
              ).toFixed(1)
            )
          : 0
      };

      const storedHighlightStageIds = (() => {
        try {
          const rawValue =
            settingsMap.get(
              `executive_stage_highlights_user_${userId}_pipeline_${selectedPipelineId}`
            ) || settingsMap.get(`executive_stage_highlights_user_${userId}`);
          if (!rawValue) return [];
          const parsed = JSON.parse(rawValue);
          return Array.isArray(parsed)
            ? parsed
                .map(item => Number(item))
                .filter(item => Number.isFinite(item))
            : [];
        } catch (error) {
          return [];
        }
      })();

      const validStageIdSet = new Set(
        pipelineHealthStages.map(stage => Number(stage.id))
      );
      const preferredStageIds = storedHighlightStageIds.filter(stageId =>
        validStageIdSet.has(Number(stageId))
      );
      const fallbackStageIds = pipelineHealthStages
        .map(stage => Number(stage.id))
        .filter(stageId => !preferredStageIds.includes(stageId));
      const resolvedHighlightStageIds = [
        ...preferredStageIds,
        ...fallbackStageIds
      ].slice(0, HIGHLIGHT_STAGE_LIMIT);
      highlightedStages = resolvedHighlightStageIds
        .map(stageId =>
          pipelineHealthStages.find(
            stage => Number(stage.id) === Number(stageId)
          )
        )
        .filter(
          (stage): stage is DashboardData["pipelineHealth"]["stages"][number] =>
            Boolean(stage)
        );
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
      goalCadence: {
        daily: {
          meetingsScheduled: buildCadenceValue(
            currentTargets.meetingsScheduled,
            totalDays
          ).daily,
          meetingsCompleted: buildCadenceValue(
            currentTargets.meetingsCompleted,
            totalDays
          ).daily,
          conversions: buildCadenceValue(currentTargets.conversions, totalDays)
            .daily
        },
        weekly: {
          meetingsScheduled: buildCadenceValue(
            currentTargets.meetingsScheduled,
            totalDays
          ).weekly,
          meetingsCompleted: buildCadenceValue(
            currentTargets.meetingsCompleted,
            totalDays
          ).weekly,
          conversions: buildCadenceValue(currentTargets.conversions, totalDays)
            .weekly
        },
        monthly: {
          meetingsScheduled: buildCadenceValue(
            currentTargets.meetingsScheduled,
            totalDays
          ).monthly,
          meetingsCompleted: buildCadenceValue(
            currentTargets.meetingsCompleted,
            totalDays
          ).monthly,
          conversions: buildCadenceValue(currentTargets.conversions, totalDays)
            .monthly
        }
      },
      targets: {
        value: {
          global: globalTargets.value,
          team: teamTargets.value,
          current: currentTargets.value
        },
        meetingsScheduled: {
          global: globalTargets.meetingsScheduled,
          team: teamTargets.meetingsScheduled,
          current: currentTargets.meetingsScheduled
        },
        meetingsCompleted: {
          global: globalTargets.meetingsCompleted,
          team: teamTargets.meetingsCompleted,
          current: currentTargets.meetingsCompleted
        },
        conversions: {
          global: globalTargets.conversions,
          team: teamTargets.conversions,
          current: currentTargets.conversions
        },
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
        totalInPeriod: totalMeetingsInPeriod,
        scheduledInPeriod,
        scheduledProgress: scheduledMeetingsProgress,
        scheduledGap: Math.max(
          0,
          currentTargets.meetingsScheduled - scheduledInPeriod
        ),
        completedInPeriod: completedMeetingsInPeriod,
        completedProgress: completedMeetingsProgress,
        completedGap: Math.max(
          0,
          currentTargets.meetingsCompleted - completedMeetingsInPeriod
        ),
        upcoming: upcomingMeetings
      },
      leads: {
        generated: generatedLeads,
        converted: convertedLeads,
        activeInPipeline: pipelineHealthOverview.totalCurrentLeads,
        conversionRate,
        convertedProgress: conversionsProgress,
        convertedGap: Math.max(0, currentTargets.conversions - convertedLeads)
      },
      aiRoi: {
        movementRate,
        accuracyRate,
        estimatedEfficiencyGain: Number(
          (movementRate * 0.55 + accuracyRate * 0.2).toFixed(1)
        )
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
        stages: pipelineHealthStages,
        highlightedStages
      },
      preferences: {
        highlightedStageIds: highlightedStages.map(stage => Number(stage.id)),
        highlightedStageLimit: HIGHLIGHT_STAGE_LIMIT,
        metricVisibility
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
        forecast:
          sellerRanking.length === 0 ||
          sellerRanking.every(item => item.projectedTotal === 0)
      }
    };
  }
}

export default GetExecutiveDashboardService;
