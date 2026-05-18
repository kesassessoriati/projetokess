import { Request, Response } from "express";
import { Op, fn, col, literal } from "sequelize";
import CallRecord from "../models/CallRecord";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import User from "../models/User";
import CrmLead from "../models/CrmLead";
import Opportunity from "../models/Opportunity";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import { getIO } from "../libs/socket";
import CreateOpportunityEventService from "../services/OpportunityServices/CreateOpportunityEventService";

type IndexQuery = {
  pageNumber?: string;
  status?: string;
  dateStart?: string;
  dateEnd?: string;
  contactNumber?: string;
  search?: string;
  whatsappId?: string;
  userId?: string;
  leadId?: string;
  pipelineId?: string;
  stageId?: string;
  sequenceId?: string;
  source?: string;
};

const buildScopedWhere = (req: Request, query: IndexQuery) => {
  const { companyId, id: authUserId, profile } = req.user;
  const where: any = { companyId };

  if (profile !== "admin" && profile !== "super") {
    where.userId = Number(authUserId);
  } else if (query.userId) {
    where.userId = Number(query.userId);
  }

  if (query.status) {
    where.status = query.status;
  } else {
    where.status = { [Op.ne]: "ringing" };
  }

  if (query.source) {
    where.source = query.source;
  }

  if (query.whatsappId && query.whatsappId !== "null" && query.whatsappId !== "undefined") {
    where.whatsappId = Number(query.whatsappId);
  }

  if (query.leadId) {
    where.leadId = Number(query.leadId);
  }

  if (query.pipelineId) {
    where.pipelineId = Number(query.pipelineId);
  }

  if (query.stageId) {
    where.stageId = Number(query.stageId);
  }

  if (query.sequenceId) {
    where.sequenceId = String(query.sequenceId);
  }

  if (query.dateStart && query.dateEnd) {
    where.createdAt = {
      [Op.between]: [new Date(`${query.dateStart}T00:00:00`), new Date(`${query.dateEnd}T23:59:59`)]
    };
  } else if (query.dateStart) {
    where.createdAt = {
      [Op.gte]: new Date(`${query.dateStart}T00:00:00`)
    };
  } else if (query.dateEnd) {
    where.createdAt = {
      [Op.lte]: new Date(`${query.dateEnd}T23:59:59`)
    };
  }

  const search = (query.search || query.contactNumber || "").trim();
  if (search) {
    where[Op.or] = [
      { fromNumber: { [Op.iLike]: `%${search}%` } },
      { toNumber: { [Op.iLike]: `%${search}%` } },
      { "$contact.name$": { [Op.iLike]: `%${search}%` } },
      { "$lead.name$": { [Op.iLike]: `%${search}%` } },
      { "$user.name$": { [Op.iLike]: `%${search}%` } }
    ];
  }

  return where;
};

const callRecordIncludes = [
  {
    model: Contact,
    as: "contact",
    attributes: ["id", "name", "number", "profilePicUrl"],
    required: false
  },
  {
    model: Whatsapp,
    as: "whatsapp",
    attributes: ["id", "name"],
    required: false
  },
  {
    model: User,
    as: "user",
    attributes: ["id", "name"],
    required: false
  },
  {
    model: CrmLead,
    as: "lead",
    attributes: ["id", "name", "phone", "companyName", "stageId"],
    required: false
  },
  {
    model: Pipeline,
    as: "pipeline",
    attributes: ["id", "name"],
    required: false
  },
  {
    model: PipelineStage,
    as: "stage",
    attributes: ["id", "name", "pipelineId", "order"],
    required: false
  },
  {
    model: Opportunity,
    as: "opportunity",
    attributes: ["id", "title", "pipelineId", "stageId", "leadId", "status"],
    required: false
  }
];

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const {
    contactId,
    whatsappId,
    ticketId,
    toNumber,
    fromNumber,
    type,
    status,
    leadId,
    opportunityId,
    pipelineId,
    stageId,
    sequenceId,
    source,
    disposition,
    metadata,
    duration,
    callStartedAt,
    answeredAt
  } = req.body;

  try {
    const callRecord = await CallRecord.create({
      callId: req.body.callId || `call-${Date.now()}`,
      type: type || "outgoing",
      status: status || "ringing",
      fromNumber: fromNumber || "",
      toNumber: toNumber || "",
      duration: Number(duration) || 0,
      contactId: contactId || null,
      whatsappId: whatsappId || null,
      ticketId: ticketId || null,
      userId: Number(userId),
      companyId,
      leadId: leadId || null,
      opportunityId: opportunityId || null,
      pipelineId: pipelineId || null,
      stageId: stageId || null,
      sequenceId: sequenceId ? String(sequenceId) : null,
      source: source || "manual",
      disposition: disposition || null,
      metadata: metadata || {},
      callStartedAt: callStartedAt ? new Date(callStartedAt) : new Date(),
      answeredAt: answeredAt ? new Date(answeredAt) : null
    });

    const fullRecord = await CallRecord.findByPk(callRecord.id, { include: callRecordIncludes });

    if (opportunityId) {
      try {
        await CreateOpportunityEventService({
          opportunityId: Number(opportunityId),
          companyId,
          type: "CALL_STARTED",
          metadata: {
            text: "Ligação iniciada",
            callRecordId: callRecord.id,
            toNumber: toNumber || "",
            fromNumber: fromNumber || "",
            direction: type || "outgoing"
          }
        });
      } catch (e) {
        console.error("[CallRecordController] CALL_STARTED event error:", e);
      }
    }

    const io = getIO();
    io.to(String(companyId)).emit(`company-${companyId}-call`, {
      action: "created",
      record: fullRecord
    });

    return res.status(201).json(fullRecord);
  } catch (err) {
    console.error("[CallRecordController] store error:", err);
    return res.status(500).json({ error: "Erro ao registrar chamada" });
  }
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  const {
    status,
    duration,
    leadId,
    opportunityId,
    pipelineId,
    stageId,
    sequenceId,
    source,
    disposition,
    metadata,
    answeredAt,
    callStartedAt,
    callEndedAt
  } = req.body;

  try {
    const record = await CallRecord.findOne({ where: { id, companyId } });
    if (!record) {
      return res.status(404).json({ error: "Registro não encontrado" });
    }

    const nextStatus = status || record.status;
    const isTerminalStatus = ["answered", "missed", "busy", "rejected", "failed"].includes(nextStatus);

    await record.update({
      status: nextStatus,
      duration: duration !== undefined ? Number(duration) || 0 : record.duration,
      leadId: leadId !== undefined ? leadId : record.leadId,
      opportunityId: opportunityId !== undefined ? opportunityId : record.opportunityId,
      pipelineId: pipelineId !== undefined ? pipelineId : record.pipelineId,
      stageId: stageId !== undefined ? stageId : record.stageId,
      sequenceId: sequenceId !== undefined ? String(sequenceId || "") || null : record.sequenceId,
      source: source || record.source,
      disposition: disposition !== undefined ? disposition : record.disposition,
      metadata: metadata ? { ...(record.metadata || {}), ...metadata } : record.metadata,
      answeredAt: answeredAt ? new Date(answeredAt) : nextStatus === "answered" && !record.answeredAt ? new Date() : record.answeredAt,
      callStartedAt: callStartedAt ? new Date(callStartedAt) : record.callStartedAt,
      callEndedAt: callEndedAt ? new Date(callEndedAt) : isTerminalStatus ? new Date() : record.callEndedAt
    });

    const fullRecord = await CallRecord.findByPk(record.id, { include: callRecordIncludes });

    if (isTerminalStatus && record.opportunityId) {
      const statusLabels: Record<string, string> = {
        answered: "Ligação atendida",
        missed: "Ligação não atendida",
        busy: "Ligação ocupado",
        rejected: "Ligação rejeitada",
        failed: "Ligação falhou"
      };
      try {
        await CreateOpportunityEventService({
          opportunityId: Number(record.opportunityId),
          companyId,
          type: "CALL_ENDED",
          metadata: {
            text: statusLabels[nextStatus] || "Ligação encerrada",
            callRecordId: record.id,
            status: nextStatus,
            duration: duration !== undefined ? Number(duration) || 0 : record.duration
          }
        });
      } catch (e) {
        console.error("[CallRecordController] CALL_ENDED event error:", e);
      }
    }

    const io = getIO();
    io.to(String(companyId)).emit(`company-${companyId}-call`, {
      action: isTerminalStatus ? "ended" : "updated",
      record: fullRecord
    });

    return res.json(fullRecord);
  } catch (err) {
    console.error("[CallRecordController] update error:", err);
    return res.status(500).json({ error: "Erro ao atualizar chamada" });
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  try {
    const query = req.query as IndexQuery;
    const pageNumber = Number(query.pageNumber || "1");
    const limit = 40;
    const offset = limit * (pageNumber - 1);
    const where = buildScopedWhere(req, query);

    const { count, rows: records } = await CallRecord.findAndCountAll({
      where,
      include: callRecordIncludes,
      distinct: true,
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    const hasMore = count > offset + records.length;

    return res.json({ records, count, hasMore });
  } catch (err: any) {
    console.error("[CallRecordController] index error:", err);
    return res.status(500).json({ error: "Erro ao buscar registros de chamadas" });
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId, id: authUserId, profile } = req.user;

  const where: any = { id, companyId };
  if (profile !== "admin" && profile !== "super") {
    where.userId = Number(authUserId);
  }

  const record = await CallRecord.findOne({
    where,
    include: callRecordIncludes
  });

  if (!record) {
    return res.status(404).json({ error: "Call record not found" });
  }

  return res.json(record);
};

export const destroy = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;

  if (profile !== "super") {
    return res.status(403).json({ error: "Apenas Super Admin pode excluir registros do histórico de chamadas." });
  }

  const record = await CallRecord.findOne({ where: { id, companyId } });
  if (!record) {
    return res.status(404).json({ error: "Registro não encontrado." });
  }

  await record.destroy();

  const io = getIO();
  io.to(String(companyId)).emit(`company-${companyId}-call`, {
    action: "deleted",
    recordId: Number(id)
  });

  return res.status(200).json({ message: "Registro excluído com sucesso." });
};

export const summary = async (req: Request, res: Response): Promise<Response> => {
  const query = req.query as IndexQuery;
  const where = buildScopedWhere(req, query);

  const [total, answered, missed, busy, failed, rejected, totalDuration] = await Promise.all([
    CallRecord.count({ where }),
    CallRecord.count({ where: { ...where, status: "answered" } }),
    CallRecord.count({ where: { ...where, status: "missed" } }),
    CallRecord.count({ where: { ...where, status: "busy" } }),
    CallRecord.count({ where: { ...where, status: "failed" } }),
    CallRecord.count({ where: { ...where, status: "rejected" } }),
    CallRecord.sum("duration", { where })
  ]);

  let userBreakdown: any[] = [];
  if (req.user.profile === "admin" || req.user.profile === "super") {
    userBreakdown = await CallRecord.findAll({
      where,
      attributes: [
        "userId",
        [fn("COUNT", col("CallRecord.id")), "totalCalls"],
        [fn("SUM", col("duration")), "totalDuration"]
      ],
      include: [{ model: User, as: "user", attributes: ["id", "name"], required: false }],
      group: ["CallRecord.userId", "user.id"],
      order: [[literal("\"totalCalls\""), "DESC"]],
      limit: 50
    });
  }

  return res.json({
    total,
    answered,
    missed,
    busy,
    failed,
    rejected,
    totalDuration: Number(totalDuration || 0),
    averageDuration: answered > 0 ? Math.round(Number(totalDuration || 0) / answered) : 0,
    userBreakdown
  });
};
