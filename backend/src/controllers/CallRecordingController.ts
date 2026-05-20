import path from "path";
import fs from "fs";
import { Request, Response } from "express";
import CallRecording from "../models/CallRecording";
import CallRecord from "../models/CallRecord";
import CrmLead from "../models/CrmLead";
import Opportunity from "../models/Opportunity";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import User from "../models/User";
import AppError from "../errors/AppError";
import uploadConfig from "../config/upload";
import CreateOpportunityEventService from "../services/OpportunityServices/CreateOpportunityEventService";
import { dispatchCallFlowTrigger } from "../services/FlowBuilderService/FlowTriggerPayloads";

const buildScope = (req: Request, query: any = {}) => {
  const { companyId, id: authUserId, profile } = req.user;
  const where: any = { companyId };

  if (profile !== "admin" && profile !== "super") {
    where.userId = Number(authUserId);
  } else if (query.userId) {
    where.userId = Number(query.userId);
  }

  if (query.leadId) {
    where.leadId = Number(query.leadId);
  }

  if (query.opportunityId) {
    where.opportunityId = Number(query.opportunityId);
  }

  if (query.callRecordId) {
    where.callRecordId = Number(query.callRecordId);
  }

  return where;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const where = buildScope(req, req.query as any);

  const recordings = await CallRecording.findAll({
    where,
    include: [
      { model: User, as: "user", attributes: ["id", "name"], required: false },
      { model: CallRecord, as: "callRecord", attributes: ["id", "status", "type", "fromNumber", "toNumber", "callStartedAt"], required: false },
      { model: CrmLead, as: "lead", attributes: ["id", "name", "phone"], required: false },
      { model: Opportunity, as: "opportunity", attributes: ["id", "title"], required: false },
      { model: Pipeline, as: "pipeline", attributes: ["id", "name"], required: false },
      { model: PipelineStage, as: "stage", attributes: ["id", "name"], required: false }
    ],
    order: [["createdAt", "DESC"]],
    limit: 50
  });

  return res.json(recordings);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const {
    callRecordId,
    leadId,
    opportunityId,
    pipelineId,
    stageId,
    publicUrl,
    duration,
    source = "native",
    status = "ready",
    metadata = {}
  } = req.body;

  if (!publicUrl) {
    throw new AppError("URL da gravação é obrigatória.", 400);
  }

  const recording = await CallRecording.create({
    companyId,
    userId: Number(userId),
    callRecordId: callRecordId || null,
    leadId: leadId || null,
    opportunityId: opportunityId || null,
    pipelineId: pipelineId || null,
    stageId: stageId || null,
    source,
    status,
    originalName: req.body.originalName || "recording",
    filename: req.body.filename || null,
    mimeType: req.body.mimeType || null,
    publicUrl,
    size: req.body.size || null,
    duration: Number(duration || 0),
    metadata
  });

  if (callRecordId) {
    await CallRecord.update(
      {
        recordingUrl: publicUrl,
        metadata: {
          hasRecording: true,
          recordingSource: source
        }
      },
      {
        where: {
          id: Number(callRecordId),
          companyId
        }
      }
    );
    const callRecord = await CallRecord.findOne({ where: { id: Number(callRecordId), companyId } });
    if (callRecord) dispatchCallFlowTrigger("call_recorded", callRecord, { recordingId: recording.id });
  }

  return res.status(201).json(recording);
};

export const upload = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const file = req.file as Express.Multer.File;

  if (!file) {
    throw new AppError("Arquivo de gravação é obrigatório.", 400);
  }

  const {
    callRecordId,
    leadId,
    opportunityId,
    pipelineId,
    stageId,
    duration,
    source = "browser",
    metadata
  } = req.body;

  const publicUrl = `/public/company${companyId}/call-recordings/${file.filename}`;

  const recording = await CallRecording.create({
    companyId,
    userId: Number(userId),
    callRecordId: callRecordId ? Number(callRecordId) : null,
    leadId: leadId ? Number(leadId) : null,
    opportunityId: opportunityId ? Number(opportunityId) : null,
    pipelineId: pipelineId ? Number(pipelineId) : null,
    stageId: stageId ? Number(stageId) : null,
    source,
    status: "ready",
    originalName: file.originalname,
    filename: file.filename,
    mimeType: file.mimetype,
    publicUrl,
    size: file.size,
    duration: Number(duration || 0),
    metadata: metadata ? JSON.parse(metadata) : {}
  });

  if (callRecordId) {
    const currentCallRecord = await CallRecord.findOne({
      where: { id: Number(callRecordId), companyId }
    });

    if (currentCallRecord) {
      await currentCallRecord.update({
        recordingUrl: publicUrl,
        metadata: {
          ...(currentCallRecord.metadata || {}),
          hasRecording: true,
          recordingSource: source,
          recordingId: recording.id
        }
      });
      dispatchCallFlowTrigger("call_recorded", currentCallRecord, { recordingId: recording.id });
    }
  }

  if (opportunityId) {
    try {
      await CreateOpportunityEventService({
        opportunityId: Number(opportunityId),
        companyId,
        type: "RECORDING_SAVED",
        metadata: {
          text: "Gravação da chamada salva",
          recordingId: recording.id,
          duration: Number(duration || 0),
          filename: file.originalname
        }
      });
    } catch (e) {
      console.error("[CallRecordingController] RECORDING_SAVED event error:", e);
    }
  }

  return res.status(201).json(recording);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: authUserId, profile } = req.user;
  const where: any = {
    id: Number(req.params.id),
    companyId
  };

  if (profile !== "admin" && profile !== "super") {
    where.userId = Number(authUserId);
  }

  const recording = await CallRecording.findOne({ where });

  if (!recording) {
    throw new AppError("Gravação não encontrada.", 404);
  }

  if (recording.filename) {
    const filePath = path.resolve(uploadConfig.directory, `company${companyId}`, "call-recordings", recording.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await recording.destroy();

  return res.status(200).json({ message: "Gravação removida com sucesso." });
};
