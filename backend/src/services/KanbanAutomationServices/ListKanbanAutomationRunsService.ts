import KanbanAutomationRun from "../../models/KanbanAutomationRun";
import KanbanAutomationRunAction from "../../models/KanbanAutomationRunAction";

interface ListParams {
  companyId: number;
  automationId?: number;
  runId?: number;
  mode?: string;
  limit?: number;
}

export const listKanbanAutomationRuns = async ({
  companyId,
  automationId,
  mode,
  limit = 50
}: ListParams) => {
  const where: Record<string, any> = { companyId };
  if (automationId) where.automationId = automationId;
  if (mode) where.mode = mode;

  return KanbanAutomationRun.findAll({
    where,
    include: [
      {
        model: KanbanAutomationRunAction,
        as: "actions",
        required: false
      }
    ],
    order: [["createdAt", "DESC"]],
    limit
  });
};

export const showKanbanAutomationRun = async ({
  companyId,
  runId
}: ListParams) => {
  return KanbanAutomationRun.findOne({
    where: { id: runId, companyId },
    include: [
      {
        model: KanbanAutomationRunAction,
        as: "actions",
        required: false
      }
    ]
  });
};
