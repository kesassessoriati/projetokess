import crypto from "crypto";
import KanbanAutomation from "../../models/KanbanAutomation";
import Tag from "../../models/Tag";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Queue from "../../models/Queue";
import logger from "../../utils/logger";
import { trackMetric } from "../SystemMetricService";

const PLAN_VERSION = 1;
const COMPILER_VERSION = "kanban-compiler@1.0.0";
const ACTIVE_MODE_ALLOWED_ACTIONS = new Set(["move_card"]);
const UNSUPPORTED_NODE_TYPES = new Set([
  "message",
  "menu",
  "img",
  "audio",
  "randomizer",
  "video",
  "singleBlock",
  "ticket",
  "typebot",
  "openai",
  "directOpenai",
  "question",
  "file",
  "transferFlow",
  "apiRequest",
  "asaas",
  "smtp",
  "googleSheets",
  "variable",
  "closeTicket",
  "productList",
  "waitQuestion"
]);

type CompileSeverity = "INFO" | "WARNING" | "ERROR";
type CompilerStatus = "STALE" | "VALID" | "PARTIAL" | "INVALID";

interface CompileDiagnostic {
  severity: CompileSeverity;
  code: string;
  message: string;
  sourceNodeId?: string | null;
  path?: string[];
  details?: Record<string, any>;
}

interface UnsupportedNodeEntry {
  nodeId: string;
  nodeType: string;
  reachability: "REACHABLE" | "UNREACHABLE";
  reasonCode: string;
  blocking: boolean;
  fallback: "NONE";
  path: string[];
}

interface GraphNode {
  id: string;
  type: string;
  data?: any;
}

interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface CompiledActionDraft {
  id: string;
  kind: string;
  delay: {
    mode: "none" | "relative";
    minutes: number;
    anchor: "triggered_at" | "previous_action_completed_at";
  };
  config: any;
  sourceNodeId: string;
  pathConditions: any[];
}

interface CompileGraphResult {
  runtimePlan: any;
  compilerStatus: CompilerStatus;
  diagnostics: CompileDiagnostic[];
}

const stableSerialize = (value: any): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerialize(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",")}}`;
};

const sha256 = (value: any) =>
  crypto.createHash("sha256").update(stableSerialize(value)).digest("hex");

const nowIso = () => new Date().toISOString();

const buildDiagnostic = (
  severity: CompileSeverity,
  code: string,
  message: string,
  extras: Partial<CompileDiagnostic> = {}
): CompileDiagnostic => ({
  severity,
  code,
  message,
  sourceNodeId: extras.sourceNodeId || null,
  path: extras.path || [],
  details: extras.details || {}
});

const normalizeGraph = (estruturaFluxo: any) => {
  const nodes = Array.isArray(estruturaFluxo?.nodes)
    ? estruturaFluxo.nodes
        .filter((node: any) => node && node.id && node.type)
        .map((node: any) => ({ id: String(node.id), type: String(node.type), data: node.data || {} }))
    : [];
  const connections = Array.isArray(estruturaFluxo?.connections)
    ? estruturaFluxo.connections
        .filter((edge: any) => edge && edge.source && edge.target)
        .map((edge: any) => ({
          id: edge.id ? String(edge.id) : undefined,
          source: String(edge.source),
          target: String(edge.target),
          sourceHandle: edge.sourceHandle ? String(edge.sourceHandle) : undefined,
          targetHandle: edge.targetHandle ? String(edge.targetHandle) : undefined
        }))
    : [];

  return { nodes, connections };
};

const buildOutgoingMap = (edges: GraphEdge[]) =>
  edges.reduce((acc, edge) => {
    const existing = acc.get(edge.source) || [];
    existing.push(edge);
    acc.set(edge.source, existing);
    return acc;
  }, new Map<string, GraphEdge[]>());

const canonicalizeConditionKey = (key: string) => {
  const cleaned = String(key || "")
    .replace(/^\s*{{\s*/, "")
    .replace(/\s*}}\s*$/, "")
    .trim()
    .toLowerCase();

  switch (cleaned) {
    case "pipeline":
    case "pipelineid":
    case "pipeline_id":
      return { fact: "pipelineId" };
    case "stage":
    case "stageid":
    case "stage_id":
    case "kanban_stage":
      return { fact: "stageId" };
    case "assigneduserid":
    case "assigned_user_id":
      return { fact: "assignedUserId" };
    case "status":
      return { fact: "status" };
    case "value":
      return { fact: "value" };
    case "tag":
    case "tagid":
    case "tag_id":
      return { fact: "hasTagId" };
    case "inactiveforminutes":
    case "inactive_for_minutes":
      return { fact: "inactiveForMinutes" };
    case "instageforminutes":
    case "in_stage_for_minutes":
      return { fact: "inStageForMinutes" };
    default:
      return null;
  }
};

const mapConditionOperator = (value: any) => {
  switch (Number(value)) {
    case 1:
      return "eq";
    case 2:
      return "gte";
    case 3:
      return "lte";
    case 4:
      return "lt";
    case 5:
      return "gt";
    default:
      return "eq";
  }
};

const normalizeConditionValue = (fact: string, value: any) => {
  if (["pipelineId", "stageId", "assignedUserId", "value", "hasTagId", "inactiveForMinutes", "inStageForMinutes"].includes(fact)) {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  }
  return value;
};

const buildTriggerFromNode = (node: GraphNode, diagnostics: CompileDiagnostic[]) => {
  const triggerKindMap: Record<string, string> = {
    "OPPORTUNITY_CREATED": "card.created",
    "OPPORTUNITY_MOVED": "card.moved_to_stage",
    "OPPORTUNITY_UPDATED": "card.updated",
    "card.created": "card.created",
    "card.moved_to_stage": "card.moved_to_stage",
    "card.updated": "card.updated",
    "card.in_stage_for": "card.in_stage_for",
    "card.inactive_for": "card.inactive_for"
  };
  const rawKind = node?.data?.kind || node?.data?.triggerKind || node?.data?.eventType;
  const kind = rawKind ? triggerKindMap[String(rawKind)] : null;

  if (!kind) {
    diagnostics.push(
      buildDiagnostic("ERROR", "LEGACY_START_UNRESOLVED", "Legacy start node has no Kanban trigger mapping.", {
        sourceNodeId: node.id,
        path: [node.id]
      })
    );
    return {
      state: "UNRESOLVED",
      id: node.type === "start" ? "legacy-start" : node.id,
      kind: null,
      reasonCode: "LEGACY_START_UNRESOLVED",
      sourceNodeId: node.id,
      filters: {},
      timing: null
    };
  }

  const timingMinutes = Number(node?.data?.minutes || node?.data?.timing?.minutes || 0);
  return {
    state: "RESOLVED",
    id: node.id,
    kind,
    reasonCode: null,
    sourceNodeId: node.id,
    filters: {
      pipelineIds: Array.isArray(node?.data?.pipelineIds) ? node.data.pipelineIds.map(Number).filter(Boolean) : [],
      stageIds: Array.isArray(node?.data?.stageIds) ? node.data.stageIds.map(Number).filter(Boolean) : [],
      fromStageIds: Array.isArray(node?.data?.fromStageIds) ? node.data.fromStageIds.map(Number).filter(Boolean) : [],
      toStageIds: Array.isArray(node?.data?.toStageIds) ? node.data.toStageIds.map(Number).filter(Boolean) : [],
      assignedUserIds: Array.isArray(node?.data?.assignedUserIds) ? node.data.assignedUserIds.map(Number).filter(Boolean) : [],
      tagIds: Array.isArray(node?.data?.tagIds) ? node.data.tagIds.map(Number).filter(Boolean) : []
    },
    timing: kind === "card.in_stage_for" || kind === "card.inactive_for"
      ? {
          minutes: timingMinutes,
          resetOnReentry: kind === "card.in_stage_for" ? Boolean(node?.data?.resetOnReentry ?? true) : undefined,
          resetOnActivity: kind === "card.inactive_for" ? Boolean(node?.data?.resetOnActivity ?? true) : undefined,
          activitySources: kind === "card.inactive_for"
            ? ["opportunity.updated", "opportunity.moved", "opportunity.event_added"]
            : undefined
        }
      : null
  };
};

const emptySummary = () => ({
  trigger: { matched: false, reason: null },
  conditions: { matched: false, evaluated: [] },
  plannedActions: [],
  discrepancies: [],
  fallbackUsed: false
});

const isSupportedActionNode = (type: string) =>
  ["addTagKanban", "kanbanStage", "sendMessage", "addTag"].includes(type);

const isCompilerKnownNode = (type: string) =>
  ["start", "trigger", "interval", "condition"].includes(type) ||
  isSupportedActionNode(type) ||
  UNSUPPORTED_NODE_TYPES.has(type);

async function compileActionNode(
  node: GraphNode,
  companyId: number,
  diagnostics: CompileDiagnostic[],
  path: string[],
  legacyFallbackEnabled: boolean,
  state: { delayMinutes: number; delayAnchor: "triggered_at" | "previous_action_completed_at"; conditions: any[] }
): Promise<CompiledActionDraft | null> {
  if (node.type === "sendMessage") {
    const message = node?.data?.message || node?.data?.data?.message || "";
    const queueId = node?.data?.queueId || node?.data?.data?.queueId || null;
    if (queueId) {
      const queue = await Queue.findOne({ where: { id: queueId, companyId } });
      if (!queue) {
        diagnostics.push(buildDiagnostic("ERROR", "MISSING_RESOURCE_REFERENCE", `Queue ${queueId} not found for sendMessage node.`, {
          sourceNodeId: node.id,
          path,
          details: { queueId }
        }));
        return null;
      }
    }
    return {
      id: node.id,
      kind: "send_message",
      delay: {
        mode: state.delayMinutes > 0 ? "relative" : "none",
        minutes: state.delayMinutes,
        anchor: state.delayAnchor
      },
      config: {
        kind: "send_message",
        template: message,
        channel: "whatsapp",
        queueId,
        closeTicket: Boolean(node?.data?.closeTicket || node?.data?.data?.closeTicket)
      },
      sourceNodeId: node.id,
      pathConditions: state.conditions
    };
  }

  if (node.type === "addTag") {
    const tagId = Number(node?.data?.id || node?.data?.data?.id);
    if (!tagId) {
      diagnostics.push(buildDiagnostic("ERROR", "MISSING_RESOURCE_REFERENCE", "addTag node is missing tag id.", {
        sourceNodeId: node.id,
        path
      }));
      return null;
    }
    const tag = await Tag.findOne({ where: { id: tagId, companyId } });
    if (!tag) {
      diagnostics.push(buildDiagnostic("ERROR", "MISSING_RESOURCE_REFERENCE", `Tag ${tagId} not found for addTag node.`, {
        sourceNodeId: node.id,
        path,
        details: { tagId }
      }));
      return null;
    }
    return {
      id: node.id,
      kind: "add_tag",
      delay: {
        mode: state.delayMinutes > 0 ? "relative" : "none",
        minutes: state.delayMinutes,
        anchor: state.delayAnchor
      },
      config: {
        kind: "add_tag",
        tagId,
        applyTo: "ticket"
      },
      sourceNodeId: node.id,
      pathConditions: state.conditions
    };
  }

  if (node.type === "kanbanStage") {
    const pipelineId = Number(node?.data?.pipelineId || node?.data?.data?.pipelineId);
    const stageId = Number(node?.data?.stageId || node?.data?.data?.stageId);
    const [pipeline, stage] = await Promise.all([
      pipelineId ? Pipeline.findOne({ where: { id: pipelineId, companyId } }) : Promise.resolve(null),
      stageId ? PipelineStage.findOne({ where: { id: stageId, companyId } }) : Promise.resolve(null)
    ]);
    if (!pipeline || !stage) {
      diagnostics.push(buildDiagnostic("ERROR", "MISSING_RESOURCE_REFERENCE", "kanbanStage node references an invalid pipeline or stage.", {
        sourceNodeId: node.id,
        path,
        details: { pipelineId, stageId }
      }));
      return null;
    }
    return {
      id: node.id,
      kind: "move_card",
      delay: {
        mode: state.delayMinutes > 0 ? "relative" : "none",
        minutes: state.delayMinutes,
        anchor: state.delayAnchor
      },
      config: {
        kind: "move_card",
        pipelineId,
        stageId
      },
      sourceNodeId: node.id,
      pathConditions: state.conditions
    };
  }

  if (node.type === "addTagKanban") {
    const pipelineId = Number(node?.data?.pipelineId || node?.data?.data?.pipelineId || 0);
    const stageId = Number(node?.data?.stageId || node?.data?.data?.stageId || 0);
    const legacyTagId = Number(node?.data?.id || node?.data?.data?.id || 0);

    let resolvedPipelineId = pipelineId;
    let resolvedStageId = stageId;

    if (!resolvedPipelineId || !resolvedStageId) {
      const legacyTag = legacyTagId
        ? await Tag.findOne({ where: { id: legacyTagId, companyId } })
        : null;
      const legacyPipeline = legacyTag
        ? await Pipeline.findOne({ where: { companyId, name: "Kanban Herdado" } })
        : null;
      const legacyStage = legacyTag && legacyPipeline
        ? await PipelineStage.findOne({
            where: {
              companyId,
              pipelineId: legacyPipeline.id,
              name: legacyTag.name
            }
          })
        : null;

      if (legacyPipeline && legacyStage) {
        diagnostics.push(buildDiagnostic("WARNING", "LEGACY_FALLBACK_USED", "Legacy Kanban tag node was mapped through the migrated legacy pipeline stage.", {
          sourceNodeId: node.id,
          path,
          details: {
            legacyTagId,
            pipelineId: legacyPipeline.id,
            stageId: legacyStage.id
          }
        }));
        resolvedPipelineId = legacyPipeline.id;
        resolvedStageId = legacyStage.id;
      }
    }

    if (!resolvedPipelineId || !resolvedStageId) {
      diagnostics.push(buildDiagnostic("ERROR", "MISSING_RESOURCE_REFERENCE", "addTagKanban node could not resolve to a pipeline stage and cannot use a runtime fallback in Phase 1.", {
        sourceNodeId: node.id,
        path,
        details: {
          pipelineId,
          stageId,
          legacyTagId,
          legacyFallbackEnabled
        }
      }));
      return null;
    }

    return {
      id: node.id,
      kind: "move_card",
      delay: {
        mode: state.delayMinutes > 0 ? "relative" : "none",
        minutes: state.delayMinutes,
        anchor: state.delayAnchor
      },
      config: {
        kind: "move_card",
        pipelineId: resolvedPipelineId,
        stageId: resolvedStageId
      },
      sourceNodeId: node.id,
      pathConditions: state.conditions
    };
  }

  diagnostics.push(buildDiagnostic("ERROR", "UNSUPPORTED_ACTION_KIND", `Node type ${node.type} is not an approved Phase 1 action.`, {
    sourceNodeId: node.id,
    path,
    details: { nodeType: node.type }
  }));
  return null;
}

async function buildRuntimePlan(
  automation: KanbanAutomation,
  options: { companyId: number; legacyFallbackEnabled: boolean }
): Promise<CompileGraphResult> {
  const normalizedGraph = normalizeGraph(automation.estrutura_fluxo);
  const diagnostics: CompileDiagnostic[] = [];
  const legacyNodesSeen = new Set<string>();
  const nodeMap = new Map<string, GraphNode>();
  normalizedGraph.nodes.forEach(node => nodeMap.set(node.id, node));
  const outgoing = buildOutgoingMap(normalizedGraph.connections);

  const rootCandidates = normalizedGraph.nodes.filter(node => node.type === "start" || node.type === "trigger");
  if (rootCandidates.length === 0) {
    diagnostics.push(buildDiagnostic("ERROR", "NO_TRIGGER_ROOT", "No root trigger/start node found in graph."));
  }
  if (rootCandidates.length > 1) {
    diagnostics.push(buildDiagnostic("ERROR", "MULTIPLE_TRIGGER_ROOTS", "Multiple trigger/start root nodes found in graph.", {
      path: rootCandidates.map(node => node.id)
    }));
  }

  const rootNode = rootCandidates[0] || null;
  if (rootNode?.type === "start") {
    legacyNodesSeen.add("start");
  }

  const reachable = new Set<string>();
  const visitQueue = rootNode ? [rootNode.id] : [];
  while (visitQueue.length) {
    const current = visitQueue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);
    const edges = outgoing.get(current) || [];
    edges.forEach(edge => {
      if (!reachable.has(edge.target)) {
        visitQueue.push(edge.target);
      }
    });
  }

  const unsupportedNodes: UnsupportedNodeEntry[] = [];
  normalizedGraph.nodes.forEach(node => {
    if (UNSUPPORTED_NODE_TYPES.has(node.type) || !isCompilerKnownNode(node.type)) {
      const reachability = reachable.has(node.id) ? "REACHABLE" : "UNREACHABLE";
      unsupportedNodes.push({
        nodeId: node.id,
        nodeType: node.type,
        reachability,
        reasonCode: "UNSUPPORTED_NODE_TYPE",
        blocking: reachability === "REACHABLE",
        fallback: "NONE",
        path: rootNode ? [rootNode.id, node.id] : [node.id]
      });
      diagnostics.push(buildDiagnostic(
        reachability === "REACHABLE" ? "ERROR" : "WARNING",
        reachability === "REACHABLE" ? "UNSUPPORTED_NODE_TYPE" : "PARTIAL_UNREACHABLE_UNSUPPORTED",
        `${reachability === "REACHABLE" ? "Reachable" : "Unreachable"} node type '${node.type}' is not supported in Phase 1.`,
        {
          sourceNodeId: node.id,
          path: rootNode ? [rootNode.id, node.id] : [node.id],
          details: { nodeType: node.type }
        }
      ));
    }
  });

  const actions: CompiledActionDraft[] = [];
  const cycleSeen = new Set<string>();

  const traverse = async (
    nodeId: string,
    state: { delayMinutes: number; delayAnchor: "triggered_at" | "previous_action_completed_at"; conditions: any[] },
    path: string[]
  ): Promise<void> => {
    if (path.includes(nodeId)) {
      diagnostics.push(buildDiagnostic("ERROR", "GRAPH_CYCLE_DETECTED", "Cycle detected in reachable graph path.", {
        sourceNodeId: nodeId,
        path: [...path, nodeId]
      }));
      cycleSeen.add(nodeId);
      return;
    }

    const node = nodeMap.get(nodeId);
    if (!node) {
      diagnostics.push(buildDiagnostic("ERROR", "ORPHAN_BRANCH", `Node ${nodeId} not found in graph.`, {
        sourceNodeId: nodeId,
        path
      }));
      return;
    }

    if (node.type === "start" || node.type === "trigger") {
      const nextEdges = outgoing.get(nodeId) || [];
      for (const edge of nextEdges) {
        await traverse(edge.target, state, [...path, nodeId]);
      }
      return;
    }

    if (node.type === "interval") {
      legacyNodesSeen.add("interval");
      const nextEdges = outgoing.get(nodeId) || [];
      if (nextEdges.length !== 1) {
        diagnostics.push(buildDiagnostic("ERROR", "ORPHAN_BRANCH", "Interval node must have exactly one outgoing edge.", {
          sourceNodeId: node.id,
          path: [...path, nodeId]
        }));
        return;
      }
      const minutes = Math.round((Number(node?.data?.sec || 0) / 60) * 100) / 100;
      await traverse(nextEdges[0].target, {
        ...state,
        delayMinutes: state.delayMinutes + (Number.isFinite(minutes) ? minutes : 0)
      }, [...path, nodeId]);
      return;
    }

    if (node.type === "condition") {
      const conditions = Array.isArray(node?.data?.conditions) && node.data.conditions.length > 0
        ? node.data.conditions
        : [{ key: node?.data?.key, condition: node?.data?.condition, value: node?.data?.value }];
      if (conditions.length !== 1) {
        diagnostics.push(buildDiagnostic("ERROR", "CONDITION_NOT_CANONICAL", "Phase 1 only supports a single canonical condition per condition node.", {
          sourceNodeId: node.id,
          path: [...path, nodeId]
        }));
        return;
      }
      const conditionEntry = conditions[0];
      const factDef = canonicalizeConditionKey(conditionEntry.key);
      if (!factDef) {
        diagnostics.push(buildDiagnostic("ERROR", "CONDITION_NOT_CANONICAL", "Condition node could not be mapped to a canonical fact.", {
          sourceNodeId: node.id,
          path: [...path, nodeId],
          details: { key: conditionEntry.key }
        }));
        return;
      }

      const trueEdges = (outgoing.get(nodeId) || []).filter(edge => edge.sourceHandle === "true" || !edge.sourceHandle);
      const falseEdges = (outgoing.get(nodeId) || []).filter(edge => edge.sourceHandle === "false");

      if (falseEdges.length > 0) {
        diagnostics.push(buildDiagnostic("ERROR", "CONDITION_NOT_CANONICAL", "Phase 1 condition nodes may not have a false branch with downstream nodes.", {
          sourceNodeId: node.id,
          path: [...path, nodeId]
        }));
        return;
      }

      if (trueEdges.length !== 1) {
        diagnostics.push(buildDiagnostic("ERROR", "ORPHAN_BRANCH", "Condition node must have exactly one true branch in Phase 1.", {
          sourceNodeId: node.id,
          path: [...path, nodeId]
        }));
        return;
      }

      const clause = {
        id: `${node.id}:0`,
        fact: factDef.fact,
        operator: mapConditionOperator(conditionEntry.condition),
        value: normalizeConditionValue(factDef.fact, conditionEntry.value),
        sourceNodeId: node.id
      };
      await traverse(trueEdges[0].target, {
        ...state,
        conditions: [...state.conditions, clause]
      }, [...path, nodeId]);
      return;
    }

    if (isSupportedActionNode(node.type)) {
      const action = await compileActionNode(node, options.companyId, diagnostics, [...path, nodeId], options.legacyFallbackEnabled, state);
      if (action) {
        actions.push(action);
      }
      const nextEdges = outgoing.get(nodeId) || [];
      if (nextEdges.length > 1) {
        diagnostics.push(buildDiagnostic("ERROR", "ORPHAN_BRANCH", "Action node must have at most one outgoing edge in Phase 1.", {
          sourceNodeId: node.id,
          path: [...path, nodeId]
        }));
        return;
      }
      if (nextEdges.length === 1) {
        await traverse(nextEdges[0].target, {
          delayMinutes: 0,
          delayAnchor: "previous_action_completed_at",
          conditions: state.conditions
        }, [...path, nodeId]);
      }
      return;
    }

    if (UNSUPPORTED_NODE_TYPES.has(node.type)) {
      return;
    }

    diagnostics.push(buildDiagnostic("ERROR", "UNSUPPORTED_NODE_TYPE", `Node type '${node.type}' is not supported in Phase 1.`, {
      sourceNodeId: node.id,
      path: [...path, nodeId],
      details: { nodeType: node.type }
    }));
  };

  if (rootNode) {
    await traverse(rootNode.id, { delayMinutes: 0, delayAnchor: "triggered_at", conditions: [] }, []);
  }

  if (!actions.length) {
    diagnostics.push(buildDiagnostic("ERROR", "ORPHAN_BRANCH", "No reachable action nodes were compiled from the graph.", {
      sourceNodeId: rootNode?.id || null,
      path: rootNode ? [rootNode.id] : []
    }));
  }

  const conditionSets = Array.from(new Set(actions.map(action => stableSerialize(action.pathConditions))));
  if (conditionSets.length > 1) {
    diagnostics.push(buildDiagnostic("ERROR", "CONDITION_NOT_CANONICAL", "Compiled actions do not share a single canonical condition set.", {
      sourceNodeId: rootNode?.id || null,
      path: rootNode ? [rootNode.id] : []
    }));
  }

  const trigger = rootNode
    ? buildTriggerFromNode(rootNode, diagnostics)
    : {
        state: "UNRESOLVED",
        id: "legacy-start",
        kind: null,
        reasonCode: "NO_TRIGGER_ROOT",
        sourceNodeId: null,
        filters: {},
        timing: null
      };

  const errorDiagnostics = diagnostics.filter(diag => diag.severity === "ERROR");
  const hasUnreachableWarnings = diagnostics.some(diag => diag.code === "PARTIAL_UNREACHABLE_UNSUPPORTED");

  const compilerStatus: CompilerStatus = errorDiagnostics.length > 0
    ? "INVALID"
    : hasUnreachableWarnings
      ? "PARTIAL"
      : "VALID";

  const globalConditions = actions[0]?.pathConditions || [];
  const canonicalActions = actions.map(action => ({
    id: action.id,
    kind: action.kind,
    delay: action.delay,
    config: action.config,
    sourceNodeId: action.sourceNodeId
  }));

  return {
    compilerStatus,
    diagnostics,
    runtimePlan: {
      planVersion: PLAN_VERSION,
      compilerVersion: COMPILER_VERSION,
      compilerStatus,
      source: {
        storage: "kanban_automations",
        automationId: automation.id,
        companyId: automation.company_id,
        editorFormat: "estrutura_fluxo",
        editorGraphVersion: null,
        rootNodeId: rootNode?.id || null,
        sourceHash: sha256(normalizedGraph)
      },
      metadata: {
        name: automation.nome_automacao,
        active: automation.status,
        compiledAt: nowIso(),
        legacyNodesSeen: Array.from(legacyNodesSeen),
        reachableNodeIds: Array.from(reachable)
      },
      trigger,
      conditions: {
        all: globalConditions,
        any: []
      },
      actions: canonicalActions,
      unsupportedNodes,
      diagnostics,
      stats: {
        reachableNodeCount: reachable.size,
        conditionCount: globalConditions.length,
        actionCount: canonicalActions.length
      }
    }
  };
}

const shouldRecompile = (automation: KanbanAutomation) => {
  if (!automation.runtimePlan) return true;
  if (!automation.runtimePlanStatus || automation.runtimePlanStatus === "STALE") return true;
  const currentSourceHash = sha256(normalizeGraph(automation.estrutura_fluxo));
  if (automation.runtimePlanSourceHash !== currentSourceHash) return true;
  if (automation.runtimePlanCompilerVersion !== COMPILER_VERSION) return true;
  return false;
};

export const invalidateKanbanAutomationRuntimePlan = async (automation: KanbanAutomation) => {
  await automation.update({
    runtimePlan: null,
    runtimePlanVersion: null,
    runtimePlanCompilerVersion: null,
    runtimePlanSourceHash: null,
    runtimePlanStatus: "STALE",
    runtimePlanDiagnostics: [],
    lastCompiledAt: null
  });
};

export const compileAndPersistKanbanAutomationPlan = async (
  automation: KanbanAutomation,
  options: { legacyFallbackEnabled?: boolean } = {}
) => {
  try {
    const compileResult = await buildRuntimePlan(automation, {
      companyId: automation.company_id,
      legacyFallbackEnabled: Boolean(options.legacyFallbackEnabled)
    });

    await automation.update({
      runtimePlan: compileResult.runtimePlan,
      runtimePlanVersion: PLAN_VERSION,
      runtimePlanCompilerVersion: COMPILER_VERSION,
      runtimePlanSourceHash: compileResult.runtimePlan.source.sourceHash,
      runtimePlanStatus: compileResult.compilerStatus,
      runtimePlanDiagnostics: compileResult.diagnostics,
      lastCompiledAt: new Date()
    });

    await trackMetric("PRODUCT_EVENT", compileResult.compilerStatus === "VALID"
      ? "KANBAN_AUTOMATION_COMPILE_VALID"
      : "KANBAN_AUTOMATION_COMPILE_INVALID", {
      companyId: automation.company_id,
      metadata: {
        automationId: automation.id,
        compilerStatus: compileResult.compilerStatus
      }
    });

    return {
      runtimePlan: compileResult.runtimePlan,
      compilerStatus: compileResult.compilerStatus,
      diagnostics: compileResult.diagnostics
    };
  } catch (error) {
    logger.error({
      automationId: automation.id,
      companyId: automation.company_id,
      err: error
    }, "[KanbanAutomationCompiler] Internal compiler error");

    const diagnostics = [
      buildDiagnostic("ERROR", "COMPILER_INTERNAL_ERROR", "Internal compiler error while building runtime plan.", {
        sourceNodeId: null,
        details: { error: error.message }
      })
    ];

    await automation.update({
      runtimePlan: null,
      runtimePlanVersion: null,
      runtimePlanCompilerVersion: null,
      runtimePlanSourceHash: null,
      runtimePlanStatus: "STALE",
      runtimePlanDiagnostics: diagnostics,
      lastCompiledAt: null
    });

    await trackMetric("PRODUCT_EVENT", "KANBAN_AUTOMATION_COMPILE_INVALID", {
      companyId: automation.company_id,
      metadata: {
        automationId: automation.id,
        compilerStatus: "STALE"
      }
    });

    return {
      runtimePlan: null,
      compilerStatus: "STALE" as CompilerStatus,
      diagnostics
    };
  }
};

export const ensureKanbanAutomationRuntimePlanFresh = async (
  automation: KanbanAutomation,
  options: { force?: boolean; legacyFallbackEnabled?: boolean } = {}
) => {
  if (!options.force && !shouldRecompile(automation)) {
    return {
      automation,
      runtimePlan: automation.runtimePlan,
      compilerStatus: automation.runtimePlanStatus,
      diagnostics: automation.runtimePlanDiagnostics || []
    };
  }

  const result = await compileAndPersistKanbanAutomationPlan(automation, {
    legacyFallbackEnabled: options.legacyFallbackEnabled
  });
  await automation.reload();

  return {
    automation,
    runtimePlan: result.runtimePlan,
    compilerStatus: result.compilerStatus,
    diagnostics: result.diagnostics
  };
};

export const isPlanActiveModeSafe = (runtimePlan: any) =>
  Array.isArray(runtimePlan?.actions) &&
  runtimePlan.actions.length > 0 &&
  runtimePlan.actions.every((action: any) => ACTIVE_MODE_ALLOWED_ACTIONS.has(action.kind));

export const buildEmptyRunSummary = emptySummary;
