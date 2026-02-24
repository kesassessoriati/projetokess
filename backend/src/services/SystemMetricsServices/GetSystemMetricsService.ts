import { QueryTypes } from "sequelize";
import sequelize from "../../database";

interface Response {
    avgResponseTime: number;
    errorRate: number;
    totalEvents: number;
    eventsByDay: any[];
    usageByCompany: any[];
    productEventsLast30Days: any[];
}

const GetSystemMetricsService = async (): Promise<Response> => {
    // Tempo médio de resposta (API_RESPONSE_TIME) nas últimas 24h
    const avgResponseTimeRes = await sequelize.query(`
    SELECT AVG(value) as avg 
    FROM "SystemMetrics" 
    WHERE name = 'API_RESPONSE_TIME' 
    AND "createdAt" > NOW() - INTERVAL '24 hours'
  `, { type: QueryTypes.SELECT });

    // Taxa de erro (API_ERROR_COUNT / Total Requests) nas últimas 24h
    const errorRateRes = await sequelize.query(`
    SELECT 
      (SELECT COUNT(*) FROM "SystemMetrics" WHERE name = 'API_ERROR_COUNT' AND "createdAt" > NOW() - INTERVAL '24 hours')::float / 
      NULLIF((SELECT COUNT(*) FROM "SystemMetrics" WHERE name = 'API_RESPONSE_TIME' AND "createdAt" > NOW() - INTERVAL '24 hours'), 0) * 100 as rate
  `, { type: QueryTypes.SELECT });

    // Eventos de produto nos últimos 30 dias agrupados por nome
    const productEventsRes = await sequelize.query(`
    SELECT name, COUNT(*) as count 
    FROM "SystemMetrics" 
    WHERE type = 'PRODUCT_EVENT' 
    AND "createdAt" > NOW() - INTERVAL '30 days'
    GROUP BY name
    ORDER BY count DESC
  `, { type: QueryTypes.SELECT });

    // Uso por empresa (Top 10 empresas com mais eventos nas últimas 24h)
    const usageByCompanyRes = await sequelize.query(`
    SELECT c.name as "companyName", COUNT(s.id) as count
    FROM "SystemMetrics" s
    JOIN "Companies" c ON s."companyId" = c.id
    WHERE s."createdAt" > NOW() - INTERVAL '24 hours'
    GROUP BY c.name
    ORDER BY count DESC
    LIMIT 10
  `, { type: QueryTypes.SELECT });

    // Eventos por dia (últimos 7 dias)
    const eventsByDayRes = await sequelize.query(`
    SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as count
    FROM "SystemMetrics"
    WHERE "createdAt" > NOW() - INTERVAL '7 days'
    GROUP BY day
    ORDER BY day ASC
  `, { type: QueryTypes.SELECT });

    return {
        avgResponseTime: Math.round((avgResponseTimeRes[0] as any)?.avg || 0),
        errorRate: parseFloat((errorRateRes[0] as any)?.rate || 0).toFixed(2) as any,
        totalEvents: (await sequelize.query('SELECT COUNT(*) FROM "SystemMetrics"', { type: QueryTypes.SELECT }) as any)[0].count,
        usageByCompany: usageByCompanyRes,
        eventsByDay: eventsByDayRes,
        productEventsLast30Days: productEventsRes
    };
};

export default GetSystemMetricsService;
