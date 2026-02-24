import { Op } from "sequelize";
import { subMinutes } from "date-fns";
import FrontendError from "../../models/FrontendError";

interface Request {
    message: string;
    stack?: string;
    componentStack?: string;
    url?: string;
    userId?: number;
    companyId?: number;
    userAgent?: string;
}

const CreateFrontendErrorService = async ({
    message,
    stack,
    componentStack,
    url,
    userId,
    companyId,
    userAgent
}: Request): Promise<FrontendError> => {
    // Detectar duplicidade (mesma message + stack + url nas últimas 5 min)
    const fiveMinutesAgo = subMinutes(new Date(), 5);

    const existingError = await FrontendError.findOne({
        where: {
            message,
            stack: stack || null,
            url: url || null,
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

    // Classificação automática:
    // Erro dentro de ErrorBoundary → HIGH (se tiver componentStack)
    // Erro de fetch tratado → MEDIUM (pode ser inferido se for erro de rede ou via URL)
    // Warning capturado → LOW
    let severity: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
    if (componentStack) severity = "HIGH";
    if (message && message.toLowerCase().includes("warning")) severity = "LOW";

    const frontendError = await FrontendError.create({
        message,
        stack,
        componentStack,
        url,
        userId,
        companyId,
        userAgent,
        severity,
        status: "NEW"
    });

    return frontendError;
};

export default CreateFrontendErrorService;
