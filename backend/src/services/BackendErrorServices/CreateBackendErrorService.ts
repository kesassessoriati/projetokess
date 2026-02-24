import { Op } from "sequelize";
import { subMinutes } from "date-fns";
import BackendError from "../../models/BackendError";

interface Request {
    message: string;
    stack?: string;
    route?: string;
    method?: string;
    statusCode?: number;
    userId?: number;
    companyId?: number;
}

const CreateBackendErrorService = async ({
    message,
    stack,
    route,
    method,
    statusCode,
    userId,
    companyId
}: Request): Promise<BackendError> => {
    // Detectar duplicidade (mesma message + route + method nas últimas 5 min)
    const fiveMinutesAgo = subMinutes(new Date(), 5);

    const existingError = await BackendError.findOne({
        where: {
            message,
            route: route || null,
            method: method || null,
            createdAt: {
                [Op.gte]: fiveMinutesAgo
            }
        }
    });

    if (existingError) {
        await existingError.update({
            occurrences: existingError.occurrences + 1
        });
        return existingError;
    }

    // Classificação automática de severidade:
    // 5xx + critical route → CRITICAL
    // 5xx → HIGH
    // 4xx → MEDIUM
    // Others → LOW
    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";

    if (statusCode && statusCode >= 500) {
        severity = "HIGH";
        if (route && (route.includes("auth") || route.includes("payment") || route.includes("company"))) {
            severity = "CRITICAL";
        }
    } else if (statusCode && statusCode >= 400) {
        severity = "MEDIUM";
    } else if (statusCode && statusCode < 400) {
        severity = "LOW";
    }

    const backendError = await BackendError.create({
        message,
        stack,
        route,
        method,
        statusCode,
        userId,
        companyId,
        severity,
        status: "NEW"
    });

    return backendError;
};

export default CreateBackendErrorService;
