import { Request, Response } from "express";
import KanbanAutomation from "../models/KanbanAutomation";
import CompaniesSettings from "../models/CompaniesSettings";
import {
  compileAndPersistKanbanAutomationPlan,
  ensureKanbanAutomationRuntimePlanFresh,
  invalidateKanbanAutomationRuntimePlan
} from "../services/KanbanAutomationServices/CompileKanbanAutomationPlanService";
import {
  listKanbanAutomationRuns,
  showKanbanAutomationRun
} from "../services/KanbanAutomationServices/ListKanbanAutomationRunsService";

const getCompanySettings = async (companyId: number) => {
  const [settings] = await CompaniesSettings.findOrCreate({
    where: { companyId },
    defaults: { companyId }
  });

  return settings;
};

const serializeAutomation = async (automation: KanbanAutomation, includeRuns = false) => {
  const payload: any = automation.toJSON();
  payload.runtimePlanStatus = automation.runtimePlanStatus;
  payload.lastCompiledAt = automation.lastCompiledAt;
  payload.runtimePlanVersion = automation.runtimePlanVersion;
  payload.runtimePlanCompilerVersion = automation.runtimePlanCompilerVersion;
  payload.runtimePlanSourceHash = automation.runtimePlanSourceHash;
  payload.runtimePlanDiagnostics = automation.runtimePlanDiagnostics || [];
  payload.runtime_plan = automation.runtimePlan;
  payload.runtime_plan_status = automation.runtimePlanStatus;
  payload.runtime_plan_diagnostics = automation.runtimePlanDiagnostics || [];
  payload.diagnosticCounts = {
    errors: (automation.runtimePlanDiagnostics || []).filter((diag: any) => diag.severity === "ERROR").length,
    warnings: (automation.runtimePlanDiagnostics || []).filter((diag: any) => diag.severity === "WARNING").length
  };
  payload.supportedActionCounts = {
    total: Array.isArray(automation.runtimePlan?.actions) ? automation.runtimePlan.actions.length : 0,
    activeEligible: Array.isArray(automation.runtimePlan?.actions)
      ? automation.runtimePlan.actions.filter((action: any) => ["move_card"].includes(action.kind)).length
      : 0
  };

  if (includeRuns) {
    payload.runs = await listKanbanAutomationRuns({
      companyId: automation.company_id,
      automationId: automation.id,
      limit: 20
    });
  }

  return payload;
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { nome_automacao, estrutura_fluxo, status } = req.body;
  const settings = await getCompanySettings(companyId);

  const automation = await KanbanAutomation.create({
    nome_automacao,
    estrutura_fluxo,
    status: status !== undefined ? status : true,
    company_id: companyId,
    user_id: userId,
    runtimePlanStatus: "STALE",
    runtimePlanDiagnostics: []
  });

  await invalidateKanbanAutomationRuntimePlan(automation);
  if (settings.kanbanAutomationCompilerEnabled) {
    await compileAndPersistKanbanAutomationPlan(automation, {
      legacyFallbackEnabled: settings.kanbanAutomationLegacyFallbackEnabled
    });
    await automation.reload();
  }

  return res.status(200).json(await serializeAutomation(automation));
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const automations = await KanbanAutomation.findAll({
    where: { company_id: companyId },
    order: [["id", "ASC"]]
  });

  return res.status(200).json(await Promise.all(automations.map(automation => serializeAutomation(automation))));
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { nome_automacao, estrutura_fluxo, status } = req.body;
  const settings = await getCompanySettings(companyId);

  const automation = await KanbanAutomation.findOne({
    where: { id, company_id: companyId }
  });

  if (!automation) {
    return res.status(404).json({ error: "KanbanAutomation nÃ£o encontrada" });
  }

  await automation.update({
    nome_automacao,
    estrutura_fluxo,
    status
  });

  await invalidateKanbanAutomationRuntimePlan(automation);
  if (settings.kanbanAutomationCompilerEnabled) {
    await compileAndPersistKanbanAutomationPlan(automation, {
      legacyFallbackEnabled: settings.kanbanAutomationLegacyFallbackEnabled
    });
    await automation.reload();
  }

  return res.status(200).json(await serializeAutomation(automation));
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const settings = await getCompanySettings(companyId);

  const automation = await KanbanAutomation.findOne({
    where: { id, company_id: companyId }
  });

  if (!automation) {
    return res.status(404).json({ error: "KanbanAutomation nÃ£o encontrada" });
  }

  if (settings.kanbanAutomationCompilerEnabled) {
    await ensureKanbanAutomationRuntimePlanFresh(automation, {
      legacyFallbackEnabled: settings.kanbanAutomationLegacyFallbackEnabled
    });
    await automation.reload();
  }

  return res.status(200).json(await serializeAutomation(automation, true));
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const automation = await KanbanAutomation.findOne({
    where: { id, company_id: companyId }
  });

  if (!automation) {
    return res.status(404).json({ error: "KanbanAutomation nÃ£o encontrada" });
  }

  await automation.destroy();

  return res.status(200).json({ message: "KanbanAutomation deletada" });
};

export const runs = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { mode, limit } = req.query;

  const automation = await KanbanAutomation.findOne({
    where: { id, company_id: companyId }
  });

  if (!automation) {
    return res.status(404).json({ error: "KanbanAutomation nÃ£o encontrada" });
  }

  const runs = await listKanbanAutomationRuns({
    companyId,
    automationId: Number(id),
    mode: mode as string,
    limit: limit ? Number(limit) : 50
  });

  return res.status(200).json(runs);
};

export const showRun = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { runId } = req.params;

  const run = await showKanbanAutomationRun({
    companyId,
    runId: Number(runId)
  });

  if (!run) {
    return res.status(404).json({ error: "KanbanAutomationRun nÃ£o encontrado" });
  }

  return res.status(200).json(run);
};
