import { QueryTypes } from "sequelize";
import PostgresQuery from "sequelize/lib/dialects/postgres/query";

jest.mock("../database", () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

import sequelize from "../database";
import GetAnalyticsOverviewService from "../services/CampaignService/GetAnalyticsOverviewService";

const queryMock = sequelize.query as jest.Mock;

describe("GetAnalyticsOverviewService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses bind parameters so TO_CHAR masks do not get parsed as named replacements", async () => {
    const responses = [
      [
        {
          totalWhatsAppSends: 12,
          totalEmailSends: 3,
          activeCampaigns: 2,
          messagesDelivered: 10,
          failureRate: 16.67,
          totalContacts: 20,
          totalCampaigns: 4,
          totalWhatsAppCampaigns: 3,
          totalEmailCampaigns: 1,
          totalContactLists: 2,
          averageDeliveryRate: 83.33
        }
      ],
      [{ date: "2026-03-20", whatsapp: 4, email: 1, total: 5 }],
      [
        { channel: "WhatsApp", total: 12, delivered: 10, failed: 2 },
        { channel: "E-mail", total: 3, delivered: 2, failed: 1 }
      ],
      [{ status: "PROGRAMADA", count: 2 }],
      [
        {
          id: 9,
          name: "Campanha A",
          channel: "WhatsApp",
          status: "PROGRAMADA",
          totalSends: 12,
          delivered: 10,
          failed: 2,
          deliveryRate: 83.33,
          date: "2026-03-28T12:34:56.789Z"
        }
      ]
    ];

    queryMock.mockImplementation(async (sql: string, options: any) => {
      expect(options.type).toBe(QueryTypes.SELECT);
      expect(options.bind).toEqual({ companyId: 7 });
      expect(sql).not.toContain(":companyId");

      expect(() =>
        PostgresQuery.formatBindParameters(sql, options.bind, "postgres")
      ).not.toThrow();

      const response = responses.shift();
      if (!response) {
        throw new Error("Unexpected extra query");
      }

      return response;
    });

    const result = await GetAnalyticsOverviewService(7);

    expect(queryMock).toHaveBeenCalledTimes(5);
    expect(result.summary.totalCampaigns).toBe(4);
    expect(result.series.messagesOverTime).toHaveLength(1);
    expect(result.series.channelComparison).toEqual([
      { channel: "WhatsApp", total: 12, delivered: 10, failed: 2 },
      { channel: "E-mail", total: 3, delivered: 2, failed: 1 }
    ]);
    expect(result.campaignPerformance[0].date).toBe("2026-03-28T12:34:56.789Z");
  });
});
