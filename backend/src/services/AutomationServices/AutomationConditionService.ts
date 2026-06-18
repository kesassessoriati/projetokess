import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";
import TicketTag from "../../models/TicketTag";
import AutomationAction from "../../models/AutomationAction";
import StageAutomationExecutionLog from "../../models/StageAutomationExecutionLog";
import logger from "../../utils/logger";

/**
 * Motor de condições / controle de fluxo / anti-loop das automações por etapa
 * (Fase A). Mantém compatibilidade total com automações antigas: ausência de
 * `condition`/`flowControl`/`actionUid` é tratada com os defaults legados.
 */

export interface AutomationConditionConfig {
  type: string;
  operator: string | null;
  value: any;
  stopIfFalse: boolean;
}

export interface AutomationFlowControlConfig {
  stopAfterExecute: boolean;
  skipIfAlreadyExecuted: boolean;
}

export interface ConditionContext {
  companyId: number;
  opportunityId?: number | null;
  contact: Contact | null;
  ticket: Ticket | null;
  cycleStartedAt: Date;
  expectedStageId?: number | null;
}

export type StageLogStatus = "executed" | "skipped" | "stopped" | "failed";

// Condições suportadas nesta fase. As demais (has_product, has_appointment,
// button_clicked, ...) ficam para fases futuras e, se aparecerem, são tratadas
// como "always" para não bloquear o fluxo.
const SUPPORTED_CONDITIONS = new Set([
  "always",
  "if_replied",
  "if_not_replied",
  "has_tag",
  "not_has_tag",
  "is_in_stage",
  "not_in_stage"
]);

export const normalizeCondition = (raw: any): AutomationConditionConfig => {
  const condition = raw && typeof raw === "object" ? raw : {};
  const type = typeof condition.type === "string" && condition.type ? condition.type : "always";
  return {
    type,
    operator: condition.operator ?? null,
    value: condition.value ?? null,
    stopIfFalse: condition.stopIfFalse === true
  };
};

export const normalizeFlowControl = (raw: any): AutomationFlowControlConfig => {
  const flow = raw && typeof raw === "object" ? raw : {};
  return {
    stopAfterExecute: flow.stopAfterExecute === true,
    // Default legado: pular se já executou no ciclo
    skipIfAlreadyExecuted: flow.skipIfAlreadyExecuted !== false
  };
};

// Identificador estável da ação. Para ações legadas sem actionUid, usa o id
// (estável enquanto a automação não for re-salva).
export const getEffectiveActionUid = (action: AutomationAction): string =>
  action.actionUid || `id:${action.id}`;

const hasInboundReplySince = async (
  ticket: Ticket | null,
  since: Date
): Promise<boolean> => {
  if (!ticket) return false;
  const message = await Message.findOne({
    where: {
      ticketId: ticket.id,
      fromMe: false,
      createdAt: { [Op.gte]: since }
    },
    attributes: ["id"]
  });
  return !!message;
};

const evaluateTagCondition = async (
  shouldHave: boolean,
  condition: AutomationConditionConfig,
  ctx: ConditionContext
): Promise<{ pass: boolean; reason: string }> => {
  const tagId = Number(condition.value);
  if (!tagId) {
    return { pass: false, reason: "Condição de etiqueta sem tagId configurado." };
  }

  const tag = await Tag.findOne({ where: { id: tagId, companyId: ctx.companyId } });
  if (!tag) {
    // Tag inexistente/de outra empresa: o contato não a possui.
    return {
      pass: !shouldHave,
      reason: `Etiqueta ${tagId} não encontrada para a empresa ${ctx.companyId}.`
    };
  }

  let has = false;
  if (ctx.contact) {
    has = !!(await ContactTag.findOne({
      where: { contactId: ctx.contact.id, tagId }
    }));
  }
  if (!has && ctx.ticket) {
    has = !!(await TicketTag.findOne({
      where: { ticketId: ctx.ticket.id, tagId }
    }));
  }

  return {
    pass: shouldHave ? has : !has,
    reason: `Etiqueta "${tag.name}" ${has ? "presente" : "ausente"} (esperado ${shouldHave ? "presente" : "ausente"}).`
  };
};

const evaluateStageCondition = async (
  shouldBeIn: boolean,
  condition: AutomationConditionConfig,
  ctx: ConditionContext
): Promise<{ pass: boolean; reason: string }> => {
  const target =
    condition.value != null && !Number.isNaN(Number(condition.value))
      ? Number(condition.value)
      : ctx.expectedStageId ?? null;

  if (!target || !ctx.opportunityId) {
    return {
      pass: !shouldBeIn,
      reason: "Não foi possível resolver etapa alvo/oportunidade para a condição de etapa."
    };
  }

  const Opportunity = (await import("../../models/Opportunity")).default;
  const opp = await Opportunity.findOne({
    where: { id: ctx.opportunityId, companyId: ctx.companyId },
    attributes: ["id", "stageId"]
  });

  if (!opp) {
    return { pass: !shouldBeIn, reason: "Oportunidade não encontrada na avaliação da condição de etapa." };
  }

  const inStage = Number(opp.stageId) === Number(target);
  return {
    pass: shouldBeIn ? inStage : !inStage,
    reason: `Oportunidade na etapa ${opp.stageId} (alvo ${target}, esperado ${shouldBeIn ? "dentro" : "fora"}).`
  };
};

export const evaluateCondition = async (
  rawCondition: any,
  ctx: ConditionContext
): Promise<{ pass: boolean; reason: string }> => {
  const condition = normalizeCondition(rawCondition);

  if (!SUPPORTED_CONDITIONS.has(condition.type)) {
    logger.warn(
      `[AutomationCondition] Tipo de condição não suportado nesta fase: "${condition.type}". Tratando como "always".`
    );
    return { pass: true, reason: `Condição "${condition.type}" não suportada nesta fase — tratada como always.` };
  }

  switch (condition.type) {
    case "always":
      return { pass: true, reason: "always" };
    case "if_replied": {
      const replied = await hasInboundReplySince(ctx.ticket, ctx.cycleStartedAt);
      return { pass: replied, reason: replied ? "Lead respondeu no ciclo." : "Lead não respondeu no ciclo." };
    }
    case "if_not_replied": {
      const replied = await hasInboundReplySince(ctx.ticket, ctx.cycleStartedAt);
      return { pass: !replied, reason: replied ? "Lead respondeu no ciclo." : "Lead não respondeu no ciclo." };
    }
    case "has_tag":
      return evaluateTagCondition(true, condition, ctx);
    case "not_has_tag":
      return evaluateTagCondition(false, condition, ctx);
    case "is_in_stage":
      return evaluateStageCondition(true, condition, ctx);
    case "not_in_stage":
      return evaluateStageCondition(false, condition, ctx);
    default:
      return { pass: true, reason: "always (fallback)" };
  }
};

// ---------------------------------------------------------------------------
// Ledger de ciclo (anti-loop / auditoria)
// ---------------------------------------------------------------------------

interface RecordLogParams {
  companyId: number;
  automationId: number;
  actionUid: string;
  cycleId: string;
  status: StageLogStatus;
  reason?: string;
  opportunityId?: number | null;
  contactId?: number | null;
  ticketId?: number | null;
  stageId?: number | null;
  metadata?: any;
}

export const recordStageAutomationLog = async (
  params: RecordLogParams
): Promise<void> => {
  try {
    await StageAutomationExecutionLog.create({
      companyId: params.companyId,
      automationId: params.automationId,
      actionUid: params.actionUid,
      cycleId: params.cycleId,
      status: params.status,
      reason: params.reason || null,
      opportunityId: params.opportunityId ?? null,
      contactId: params.contactId ?? null,
      ticketId: params.ticketId ?? null,
      stageId: params.stageId ?? null,
      metadata: params.metadata || {},
      executedAt: new Date()
    } as any);
  } catch (err: any) {
    logger.error(`[AutomationCondition] Falha ao registrar log de ciclo: ${err.message}`);
  }
};

export const hasExecutedInCycle = async (
  companyId: number,
  cycleId: string,
  actionUid: string
): Promise<boolean> => {
  const row = await StageAutomationExecutionLog.findOne({
    where: { companyId, cycleId, actionUid, status: "executed" },
    attributes: ["id"]
  });
  return !!row;
};

export const isCycleStopped = async (
  companyId: number,
  cycleId: string
): Promise<boolean> => {
  const row = await StageAutomationExecutionLog.findOne({
    where: { companyId, cycleId, status: "stopped" },
    attributes: ["id"]
  });
  return !!row;
};
