import SystemMetric from "../models/SystemMetric";
import logger from "../utils/logger";

interface EventData {
    companyId?: number;
    userId?: number;
    value?: number;
    metadata?: any;
}

/**
 * Registra um evento de produto ou métrica de performance
 */
export const trackMetric = async (
    type: "PERFORMANCE" | "PRODUCT_EVENT",
    name: string,
    { companyId, userId, value, metadata }: EventData = {}
) => {
    try {
        // Fire and forget para não travar o fluxo principal
        SystemMetric.create({
            type,
            name,
            value: value || 1,
            metadata,
            companyId,
            userId
        }).catch(err => logger.error(`Erro ao trackMetric ${name}:`, err));
    } catch (err) {
        logger.error(`Erro ao trackMetric ${name}:`, err);
    }
};

/**
 * Atalho para eventos de produto
 */
export const trackProductEvent = (
    name: "TICKET_CREATED" | "CHAT_CREATED" | "MESSAGE_SENT" | "CONNECTION_CREATED" | "CAMPAIGN_SENT",
    data: EventData = {}
) => {
    return trackMetric("PRODUCT_EVENT", name, data);
};
