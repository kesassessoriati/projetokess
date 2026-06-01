import AIUsageLog from "../../models/AIUsageLog";

interface GetPromptMetricsRequest {
  promptId: string | number;
  companyId: string | number;
}

const GetPromptMetricsService = async ({
  promptId,
  companyId
}: GetPromptMetricsRequest) => {
  const where = {
    promptId: Number(promptId),
    companyId: Number(companyId)
  };

  const total = await AIUsageLog.count({ where });
  const success = await AIUsageLog.count({ where: { ...where, status: "success" } });
  const errors = await AIUsageLog.count({ where: { ...where, status: "error" } });

  const creditsConsumed = await AIUsageLog.sum("creditsConsumed", { where });

  const lastExecutions = await AIUsageLog.findAll({
    where,
    attributes: [
      "id",
      "provider",
      "usageMode",
      "requestType",
      "model",
      "creditsConsumed",
      "status",
      "errorCode",
      "createdAt"
    ],
    order: [["createdAt", "DESC"]],
    limit: 10
  });

  return {
    total,
    success,
    errors,
    creditsConsumed: Number(creditsConsumed || 0),
    lastExecutions
  };
};

export default GetPromptMetricsService;
