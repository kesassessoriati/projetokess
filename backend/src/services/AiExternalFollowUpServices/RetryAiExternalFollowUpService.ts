import AiExternalFollowUpLog from "../../models/AiExternalFollowUpLog";
import { processAiExternalFollowUps } from "./AiExternalFollowUpService";
import AppError from "../../errors/AppError";
import logger from "../../utils/logger";

export const retryFollowUpLog = async ({
  logId,
  companyId
}: {
  logId: number;
  companyId: number;
}) => {
  const log = await AiExternalFollowUpLog.findOne({
    where: { id: logId, companyId }
  });

  if (!log) throw new AppError("Log de follow-up não encontrado.", 404);
  if (log.status === "processing") throw new AppError("Follow-up já está sendo processado.", 409);
  if (log.status === "sent") throw new AppError("Follow-up já foi enviado com sucesso.", 409);

  await log.update({ status: "pending", errorMessage: null, reason: "retry_manual" });

  logger.info(`[RetryFollowUp] logId=${logId} companyId=${companyId} reprocessando`);

  // Dispara processamento isolado para esta empresa (fire-and-forget)
  processAiExternalFollowUps({ companyId }).catch(e =>
    logger.warn(`[RetryFollowUp] falha ao reprocessar logId=${logId}: ${e}`)
  );

  return { ok: true, logId, status: "pending" };
};
