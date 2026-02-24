import { QueryTypes } from "sequelize";
import sequelize from "../../database";

interface Response {
    avgTimeByRoute: any[];
    topSlowRoutes: any[];
    requestsPerMinute: any[];
    processMetrics: any[];
    slowQueriesCount: any[];
}

const GetPerformanceMetricsService = async (companyId?: string | number): Promise<Response> => {
    const whereCompany = companyId ? `AND "companyId" = ${companyId}` : '';

    // 1. Tempo médio por rota (24h)
    const avgTimeByRoute = await sequelize.query(`
    SELECT route, method, AVG("durationMs") as avg_duration, COUNT(*) as count
    FROM "BackendMetrics"
    WHERE "createdAt" > NOW() - INTERVAL '24 hours'
    ${whereCompany}
    GROUP BY route, method
    ORDER BY avg_duration DESC
    LIMIT 20
  `, { type: QueryTypes.SELECT });

    // 2. Top 10 rotas mais lentas (individualmente)
    const topSlowRoutes = await sequelize.query(`
    SELECT route, method, "durationMs", "createdAt", "requestId"
    FROM "BackendMetrics"
    WHERE "createdAt" > NOW() - INTERVAL '24 hours'
    ${whereCompany}
    ORDER BY "durationMs" DESC
    LIMIT 10
  `, { type: QueryTypes.SELECT });

    // 3. Requisições por minuto (última hora)
    const requestsPerMinute = await sequelize.query(`
    SELECT DATE_TRUNC('minute', "createdAt") as minute, COUNT(*) as count
    FROM "BackendMetrics"
    WHERE "createdAt" > NOW() - INTERVAL '1 hour'
    ${whereCompany}
    GROUP BY minute
    ORDER BY minute ASC
  `, { type: QueryTypes.SELECT });

    // 4. Métricas do Processo (Uso de CPU/Memória - última hora)
    const processMetrics = await sequelize.query(`
    SELECT 
      "createdAt", 
      "cpuUser", 
      "cpuSystem", 
      "memoryRss", 
      "memoryHeapUsed", 
      "eventLoopDelay"
    FROM "SystemProcessMetrics"
    WHERE "createdAt" > NOW() - INTERVAL '1 hour'
    ORDER BY "createdAt" ASC
  `, { type: QueryTypes.SELECT });

    // 5. Contagem de SlowQueries por severidade (24h)
    const slowQueriesCount = await sequelize.query(`
    SELECT severity, COUNT(*) as count
    FROM "SlowQueries"
    WHERE "createdAt" > NOW() - INTERVAL '24 hours'
    ${whereCompany}
    GROUP BY severity
  `, { type: QueryTypes.SELECT });

    return {
        avgTimeByRoute,
        topSlowRoutes,
        requestsPerMinute,
        processMetrics,
        slowQueriesCount
    };
};

export default GetPerformanceMetricsService;
