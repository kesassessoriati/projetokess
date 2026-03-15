import { QueryTypes } from "sequelize";
import sequelize from "../../database";

type QueryRow = Record<string, unknown>;

interface Summary {
  totalWhatsAppSends: number;
  totalEmailSends: number;
  activeCampaigns: number;
  messagesDelivered: number;
  failureRate: number;
  totalContacts: number;
  totalCampaigns: number;
  totalWhatsAppCampaigns: number;
  totalEmailCampaigns: number;
  totalContactLists: number;
  averageDeliveryRate: number;
}

interface TimelinePoint {
  date: string;
  whatsapp: number;
  email: number;
  total: number;
}

interface ChannelPoint {
  channel: string;
  total: number;
  delivered: number;
  failed: number;
}

interface DeliveryBreakdownPoint {
  label: string;
  value: number;
}

interface StatusDistributionPoint {
  status: string;
  count: number;
}

interface CampaignPerformancePoint {
  id: number;
  name: string;
  channel: string;
  status: string;
  totalSends: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  date: string | null;
}

interface Response {
  summary: Summary;
  series: {
    messagesOverTime: TimelinePoint[];
    channelComparison: ChannelPoint[];
    deliveryBreakdown: DeliveryBreakdownPoint[];
    statusDistribution: StatusDistributionPoint[];
  };
  campaignPerformance: CampaignPerformancePoint[];
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeSummary = (row?: QueryRow): Summary => ({
  totalWhatsAppSends: toNumber(row?.totalWhatsAppSends),
  totalEmailSends: toNumber(row?.totalEmailSends),
  activeCampaigns: toNumber(row?.activeCampaigns),
  messagesDelivered: toNumber(row?.messagesDelivered),
  failureRate: toNumber(row?.failureRate),
  totalContacts: toNumber(row?.totalContacts),
  totalCampaigns: toNumber(row?.totalCampaigns),
  totalWhatsAppCampaigns: toNumber(row?.totalWhatsAppCampaigns),
  totalEmailCampaigns: toNumber(row?.totalEmailCampaigns),
  totalContactLists: toNumber(row?.totalContactLists),
  averageDeliveryRate: toNumber(row?.averageDeliveryRate)
});

const GetAnalyticsOverviewService = async (
  companyId: number | string
): Promise<Response> => {
  const replacements = { companyId };

  const shippingAggregateSql = `
    SELECT
      cs."campaignId",
      COUNT(*)::int AS "totalSends",
      SUM(CASE WHEN cs."deliveredAt" IS NOT NULL THEN 1 ELSE 0 END)::int AS delivered,
      SUM(CASE WHEN cs."failedAt" IS NOT NULL THEN 1 ELSE 0 END)::int AS failed
    FROM "CampaignShipping" cs
    GROUP BY cs."campaignId"
  `;

  const summaryRows = await sequelize.query<QueryRow>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN COALESCE(c."campaignType", 'whatsapp') = 'whatsapp' THEN COALESCE(ship."totalSends", 0) ELSE 0 END), 0)::int AS "totalWhatsAppSends",
        COALESCE(SUM(CASE WHEN c."campaignType" = 'email' THEN COALESCE(ship."totalSends", 0) ELSE 0 END), 0)::int AS "totalEmailSends",
        COALESCE(SUM(CASE WHEN c.status IN ('EM_ANDAMENTO', 'PROGRAMADA') THEN 1 ELSE 0 END), 0)::int AS "activeCampaigns",
        COALESCE(SUM(COALESCE(ship.delivered, 0)), 0)::int AS "messagesDelivered",
        CASE
          WHEN COALESCE(SUM(COALESCE(ship."totalSends", 0)), 0) > 0
            THEN ROUND(
              (
                COALESCE(SUM(COALESCE(ship.failed, 0)), 0)::numeric
                / NULLIF(SUM(COALESCE(ship."totalSends", 0))::numeric, 0)
              ) * 100,
              2
            )
          ELSE 0
        END AS "failureRate",
        COALESCE((
          SELECT COUNT(*)
          FROM "ContactListItems" cli
          WHERE cli."companyId" = :companyId
        ), 0)::int AS "totalContacts",
        COUNT(c.id)::int AS "totalCampaigns",
        COALESCE(SUM(CASE WHEN COALESCE(c."campaignType", 'whatsapp') = 'whatsapp' THEN 1 ELSE 0 END), 0)::int AS "totalWhatsAppCampaigns",
        COALESCE(SUM(CASE WHEN c."campaignType" = 'email' THEN 1 ELSE 0 END), 0)::int AS "totalEmailCampaigns",
        COALESCE((
          SELECT COUNT(*)
          FROM "ContactLists" cl
          WHERE cl."companyId" = :companyId
        ), 0)::int AS "totalContactLists",
        CASE
          WHEN COALESCE(SUM(COALESCE(ship."totalSends", 0)), 0) > 0
            THEN ROUND(
              (
                COALESCE(SUM(COALESCE(ship.delivered, 0)), 0)::numeric
                / NULLIF(SUM(COALESCE(ship."totalSends", 0))::numeric, 0)
              ) * 100,
              2
            )
          ELSE 0
        END AS "averageDeliveryRate"
      FROM "Campaigns" c
      LEFT JOIN (${shippingAggregateSql}) ship ON ship."campaignId" = c.id
      WHERE c."companyId" = :companyId
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  const messagesOverTimeRows = await sequelize.query<QueryRow>(
    `
      SELECT
        TO_CHAR(day_series.day, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(CASE WHEN c.id IS NOT NULL AND COALESCE(c."campaignType", 'whatsapp') = 'whatsapp' THEN 1 ELSE 0 END), 0)::int AS whatsapp,
        COALESCE(SUM(CASE WHEN c.id IS NOT NULL AND c."campaignType" = 'email' THEN 1 ELSE 0 END), 0)::int AS email,
        COALESCE(SUM(CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS total
      FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') AS day_series(day)
      LEFT JOIN "CampaignShipping" cs ON DATE(cs."createdAt") = DATE(day_series.day)
      LEFT JOIN "Campaigns" c ON c.id = cs."campaignId" AND c."companyId" = :companyId
      GROUP BY day_series.day
      ORDER BY day_series.day ASC
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  const channelComparisonRows = await sequelize.query<QueryRow>(
    `
      SELECT
        CASE
          WHEN COALESCE(c."campaignType", 'whatsapp') = 'email' THEN 'E-mail'
          ELSE 'WhatsApp'
        END AS channel,
        COALESCE(SUM(COALESCE(ship."totalSends", 0)), 0)::int AS total,
        COALESCE(SUM(COALESCE(ship.delivered, 0)), 0)::int AS delivered,
        COALESCE(SUM(COALESCE(ship.failed, 0)), 0)::int AS failed
      FROM "Campaigns" c
      LEFT JOIN (${shippingAggregateSql}) ship ON ship."campaignId" = c.id
      WHERE c."companyId" = :companyId
      GROUP BY channel
      ORDER BY channel ASC
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  const statusDistributionRows = await sequelize.query<QueryRow>(
    `
      SELECT
        c.status,
        COUNT(*)::int AS count
      FROM "Campaigns" c
      WHERE c."companyId" = :companyId
      GROUP BY c.status
      ORDER BY count DESC, c.status ASC
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  const campaignPerformanceRows = await sequelize.query<QueryRow>(
    `
      SELECT
        c.id,
        c.name,
        CASE
          WHEN COALESCE(c."campaignType", 'whatsapp') = 'email' THEN 'E-mail'
          ELSE 'WhatsApp'
        END AS channel,
        c.status,
        TO_CHAR(COALESCE(c."scheduledAt", c."createdAt"), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS date,
        COALESCE(ship."totalSends", 0)::int AS "totalSends",
        COALESCE(ship.delivered, 0)::int AS delivered,
        COALESCE(ship.failed, 0)::int AS failed,
        CASE
          WHEN COALESCE(ship."totalSends", 0) > 0
            THEN ROUND(
              (
                COALESCE(ship.delivered, 0)::numeric
                / NULLIF(ship."totalSends"::numeric, 0)
              ) * 100,
              2
            )
          ELSE 0
        END AS "deliveryRate"
      FROM "Campaigns" c
      LEFT JOIN (${shippingAggregateSql}) ship ON ship."campaignId" = c.id
      WHERE c."companyId" = :companyId
      ORDER BY "deliveryRate" DESC, "totalSends" DESC, c."createdAt" DESC
      LIMIT 10
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  const summary = normalizeSummary(summaryRows[0]);
  const channelComparison = [
    { channel: "WhatsApp", total: 0, delivered: 0, failed: 0 },
    { channel: "E-mail", total: 0, delivered: 0, failed: 0 }
  ].map((channelBase) => {
    const found = channelComparisonRows.find(
      row => String(row.channel) === channelBase.channel
    );

    return {
      channel: channelBase.channel,
      total: toNumber(found?.total),
      delivered: toNumber(found?.delivered),
      failed: toNumber(found?.failed)
    };
  });

  const totalSends = channelComparison.reduce(
    (acc, item) => acc + item.total,
    0
  );
  const totalFailed = channelComparison.reduce(
    (acc, item) => acc + item.failed,
    0
  );
  const pendingMessages = Math.max(
    totalSends - summary.messagesDelivered - totalFailed,
    0
  );

  return {
    summary,
    series: {
      messagesOverTime: messagesOverTimeRows.map(row => ({
        date: String(row.date || ""),
        whatsapp: toNumber(row.whatsapp),
        email: toNumber(row.email),
        total: toNumber(row.total)
      })),
      channelComparison,
      deliveryBreakdown: [
        { label: "Entregues", value: summary.messagesDelivered },
        { label: "Falhas", value: totalFailed },
        { label: "Pendentes", value: pendingMessages }
      ],
      statusDistribution: statusDistributionRows.map(row => ({
        status: String(row.status || ""),
        count: toNumber(row.count)
      }))
    },
    campaignPerformance: campaignPerformanceRows.map(row => ({
      id: toNumber(row.id),
      name: String(row.name || ""),
      channel: String(row.channel || "WhatsApp"),
      status: String(row.status || ""),
      totalSends: toNumber(row.totalSends),
      delivered: toNumber(row.delivered),
      failed: toNumber(row.failed),
      deliveryRate: toNumber(row.deliveryRate),
      date: row.date ? String(row.date) : null
    }))
  };
};

export default GetAnalyticsOverviewService;
