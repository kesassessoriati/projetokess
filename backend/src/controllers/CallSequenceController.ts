import { Request, Response } from "express";
import { Op } from "sequelize";
import AppError from "../errors/AppError";
import CallSequence from "../models/CallSequence";
import CallSequenceTarget from "../models/CallSequenceTarget";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import CrmLead from "../models/CrmLead";
import Opportunity from "../models/Opportunity";
import Contact from "../models/Contact";
import User from "../models/User";
import MoveOpportunityService from "../services/OpportunityServices/MoveOpportunityService";

const scopeSequenceWhere = (req: Request, extraWhere: Record<string, any> = {}) => {
  const { companyId, id: userId, profile } = req.user;
  const where: Record<string, any> = {
    companyId,
    ...extraWhere
  };

  if (profile !== "admin" && profile !== "super") {
    where.userId = Number(userId);
  }

  return where;
};

const loadSequence = async (req: Request, id: number) =>
  CallSequence.findOne({
    where: scopeSequenceWhere(req, { id }),
    include: [
      { model: User, as: "user", attributes: ["id", "name"] },
      { model: Pipeline, as: "pipeline", attributes: ["id", "name"] },
      { model: PipelineStage, as: "stage", attributes: ["id", "name", "order"] },
      { model: PipelineStage, as: "nextStage", attributes: ["id", "name", "order"] },
      {
        model: CallSequenceTarget,
        as: "targets",
        include: [
          { model: CrmLead, as: "lead", attributes: ["id", "name", "phone", "companyName", "stageId", "meetingScheduledAt"] },
          { model: Opportunity, as: "opportunity", attributes: ["id", "title", "status", "stageId", "pipelineId"] },
          { model: Contact, as: "contact", attributes: ["id", "name", "number"] }
        ],
        order: [["orderIndex", "ASC"]]
      }
    ]
  });

const recalculateSequence = async (sequenceId: number) => {
  const targets = await CallSequenceTarget.findAll({
    where: { sequenceId },
    attributes: ["id", "status"]
  });

  const totalTargets = targets.length;
  const completedTargets = targets.filter(target =>
    ["ANSWERED", "NO_ANSWER", "FAILED", "CANCELLED", "SKIPPED"].includes(target.status)
  ).length;
  const answeredTargets = targets.filter(target => target.status === "ANSWERED").length;
  const failedTargets = targets.filter(target => ["FAILED", "NO_ANSWER"].includes(target.status)).length;

  const nextStatus =
    totalTargets > 0 && completedTargets === totalTargets
      ? "COMPLETED"
      : undefined;

  await CallSequence.update(
    {
      totalTargets,
      completedTargets,
      answeredTargets,
      failedTargets,
      ...(nextStatus ? { status: nextStatus, completedAt: new Date() } : {})
    },
    { where: { id: sequenceId } }
  );
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { status, userId } = req.query as { status?: string; userId?: string };

  const where = scopeSequenceWhere(req);

  if (status) {
    where.status = status;
  }

  if (userId && (req.user.profile === "admin" || req.user.profile === "super")) {
    where.userId = Number(userId);
  }

  const sequences = await CallSequence.findAll({
    where,
    include: [
      { model: User, as: "user", attributes: ["id", "name"] },
      { model: Pipeline, as: "pipeline", attributes: ["id", "name"] },
      { model: PipelineStage, as: "stage", attributes: ["id", "name"] },
      { model: PipelineStage, as: "nextStage", attributes: ["id", "name"] }
    ],
    order: [["createdAt", "DESC"]],
    limit: 20
  });

  return res.json(sequences);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const record = await loadSequence(req, Number(req.params.id));

  if (!record) {
    throw new AppError("Sequência de chamadas não encontrada.", 404);
  }

  return res.json(record);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const {
    name,
    pipelineId,
    stageId,
    nextStageId,
    maxAttempts,
    intervalSeconds,
    onMaxAttempts,
    targets = []
  } = req.body;

  if (!pipelineId || !stageId) {
    throw new AppError("Funil e estágio são obrigatórios para iniciar a sequência.", 400);
  }

  if (!Array.isArray(targets) || targets.length === 0) {
    throw new AppError("Selecione ao menos um lead para iniciar a sequência.", 400);
  }

  if ((onMaxAttempts || "move_stage") === "move_stage" && !nextStageId) {
    throw new AppError("Informe o estagio de destino para mover leads sem atendimento.", 400);
  }

  if (nextStageId) {
    const destinationStage = await PipelineStage.findOne({
      where: {
        id: Number(nextStageId),
        pipelineId: Number(pipelineId),
        companyId
      }
    });

    if (!destinationStage || Number(destinationStage.id) === Number(stageId)) {
      throw new AppError("Estagio de destino invalido para a sequencia.", 400);
    }
  }

  const sequence = await CallSequence.create({
    companyId,
    userId: Number(userId),
    pipelineId: Number(pipelineId),
    stageId: Number(stageId),
    nextStageId: (onMaxAttempts || "move_stage") === "move_stage" && nextStageId ? Number(nextStageId) : null,
    name: name || `Sequência ${new Date().toLocaleString("pt-BR")}`,
    status: "ACTIVE",
    maxAttempts: Number(maxAttempts) || 3,
    intervalSeconds: Number(intervalSeconds) || 30,
    onMaxAttempts: onMaxAttempts || "move_stage",
    startedAt: new Date(),
    metadata: {
      createdFrom: "webphone"
    }
  });

  await CallSequenceTarget.bulkCreate(
    targets.map((target: any, index: number) => ({
      sequenceId: sequence.id,
      leadId: target.leadId || null,
      opportunityId: target.opportunityId || null,
      contactId: target.contactId || null,
      phone: target.phone || "",
      contactName: target.name || target.contactName || "",
      orderIndex: index,
      metadata: {
        stageId: target.stageId || null,
        pipelineId: target.pipelineId || pipelineId || null
      }
    }))
  );

  await recalculateSequence(sequence.id);

  const fullSequence = await loadSequence(req, sequence.id);
  return res.status(201).json(fullSequence);
};

export const control = async (req: Request, res: Response): Promise<Response> => {
  const { action } = req.body as { action: string };
  const record = await CallSequence.findOne({
    where: scopeSequenceWhere(req, { id: Number(req.params.id) })
  });

  if (!record) {
    throw new AppError("Sequência de chamadas não encontrada.", 404);
  }

  if (action === "pause") {
    await record.update({ status: "PAUSED", pausedAt: new Date() });
  } else if (action === "resume") {
    await record.update({ status: "ACTIVE", pausedAt: null });
  } else if (action === "cancel") {
    await record.update({ status: "CANCELLED", completedAt: new Date() });
    await CallSequenceTarget.update(
      { status: "CANCELLED", completedAt: new Date() },
      {
        where: {
          sequenceId: record.id,
          status: { [Op.in]: ["PENDING", "CALLING"] }
        }
      }
    );
  } else {
    throw new AppError("Ação de controle inválida.", 400);
  }

  await recalculateSequence(record.id);

  const sequence = await loadSequence(req, record.id);
  return res.json(sequence);
};

export const updateTarget = async (req: Request, res: Response): Promise<Response> => {
  const sequence = await CallSequence.findOne({
    where: scopeSequenceWhere(req, { id: Number(req.params.id) })
  });

  if (!sequence) {
    throw new AppError("Sequência de chamadas não encontrada.", 404);
  }

  const target = await CallSequenceTarget.findOne({
    where: {
      id: Number(req.params.targetId),
      sequenceId: sequence.id
    }
  });

  if (!target) {
    throw new AppError("Lead da sequência não encontrado.", 404);
  }

  const {
    status,
    callRecordId,
    callStatus,
    incrementAttempt = true,
    metadata
  } = req.body;

  const attempts = incrementAttempt ? (target.attempts || 0) + 1 : target.attempts || 0;
  let nextStatus = status || target.status;
  let completedAt: Date | null = null;
  let nextMetadata = {
    ...(target.metadata || {}),
    ...(metadata || {})
  };

  if (status === "answered") {
    nextStatus = "ANSWERED";
    completedAt = new Date();
  } else if (status === "calling") {
    nextStatus = "CALLING";
  } else if (status === "failed") {
    nextStatus = attempts >= sequence.maxAttempts ? "FAILED" : "PENDING";
    if (attempts >= sequence.maxAttempts) {
      completedAt = new Date();
    }
  } else if (status === "busy" || status === "no_answer" || status === "missed") {
    const reachedLimit = attempts >= sequence.maxAttempts;
    nextStatus = reachedLimit ? "NO_ANSWER" : "PENDING";

    if (reachedLimit) {
      completedAt = new Date();

      if (
        sequence.onMaxAttempts === "move_stage" &&
        sequence.nextStageId &&
        target.opportunityId
      ) {
        try {
          await MoveOpportunityService({
            opportunityId: target.opportunityId,
            toStageId: sequence.nextStageId,
            companyId: sequence.companyId,
            movedBy: "AUTOMATION",
            reason: "Call sequence max attempts reached"
          });

          nextMetadata = {
            ...nextMetadata,
            movedToStageId: sequence.nextStageId
          };
        } catch (error) {
          nextMetadata = {
            ...nextMetadata,
            moveError: (error as Error).message
          };
        }
      }
    }
  }

  await target.update({
    attempts,
    status: nextStatus,
    lastCallRecordId: callRecordId || target.lastCallRecordId,
    lastCallStatus: callStatus || status || target.lastCallStatus,
    lastOutcomeAt: new Date(),
    completedAt,
    metadata: nextMetadata
  });

  await recalculateSequence(sequence.id);

  const record = await loadSequence(req, sequence.id);
  return res.json(record);
};
