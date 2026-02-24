import { performance } from "perf_hooks";
import SystemProcessMetric from "../models/SystemProcessMetric";
import logger from "../utils/logger";

/**
 * Calcula o delay do event loop
 */
const getEventLoopDelay = (): Promise<number> => {
    return new Promise((resolve) => {
        const start = performance.now();
        setImmediate(() => {
            const end = performance.now();
            resolve(end - start);
        });
    });
};

/**
 * Job para coletar métricas do processo Node.js a cada 30 segundos
 */
export const initProcessMetricsJob = () => {
    logger.info("Inicializando Job de Métricas de Processo (30s)...");

    setInterval(async () => {
        try {
            const memory = process.memoryUsage();
            const cpu = process.cpuUsage();
            const delay = await getEventLoopDelay();

            await SystemProcessMetric.create({
                cpuUser: cpu.user,
                cpuSystem: cpu.system,
                memoryRss: memory.rss,
                memoryHeapUsed: memory.heapUsed,
                memoryHeapTotal: memory.heapTotal,
                eventLoopDelay: delay
            });
        } catch (err) {
            logger.error("Erro no Job de Métricas de Processo:", err);
        }
    }, 30000); // 30 segundos
};
