import { Request, Response, NextFunction } from "express";
import { trackMetric } from "../services/SystemMetricService";
import BackendMetric from "../models/BackendMetric";
import { logContextStorage } from "../libs/logContext";
import logger from "../utils/logger";

const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime();

    res.on("finish", () => {
        const diff = process.hrtime(start);
        const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6);

        // Ignorar rotas de assets estáticos ou métricas para não poluir
        if (req.path.includes("/public") || req.path.includes("/metrics")) {
            return;
        }

        const companyId = (req as any).user?.companyId;
        const userId = (req as any).user?.id;
        const context = logContextStorage.getStore();
        const requestId = context?.requestId;

        // Novo Registro em BackendMetrics conforme Fase 1
        BackendMetric.create({
            companyId,
            route: req.path,
            method: req.method,
            statusCode: res.statusCode,
            durationMs: timeInMs,
            requestId
        }).catch(e => logger.error("Erro ao salvar BackendMetric:", e));

        trackMetric("PERFORMANCE", "API_RESPONSE_TIME", {
            value: timeInMs,
            companyId,
            userId,
            metadata: {
                path: req.path,
                method: req.method,
                statusCode: res.statusCode
            }
        });

        // Se houve erro (>= 400), registra também a taxa de erro meta-metric
        if (res.statusCode >= 400) {
            trackMetric("PERFORMANCE", "API_ERROR_COUNT", {
                value: 1,
                companyId,
                userId,
                metadata: {
                    path: req.path,
                    method: req.method,
                    statusCode: res.statusCode
                }
            });
        }
    });

    next();
};

export default performanceMiddleware;
