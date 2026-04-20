import path from "path";
import fs from "fs";
import { Request, Response } from "express";
import Meeting from "../models/Meeting";
import User from "../models/User";
import CrmLead from "../models/CrmLead";
import Opportunity from "../models/Opportunity";
import Contact from "../models/Contact";
import AppError from "../errors/AppError";
import uploadConfig from "../config/upload";
import { meetingQueue } from "../queues";

const buildScope = (req: Request, query: any = {}) => {
  const { companyId, id: authUserId, profile } = req.user;
  const where: any = { companyId };

  if (profile !== "admin" && profile !== "super") {
    where.userId = Number(authUserId);
  } else if (query.userId) {
    where.userId = Number(query.userId);
  }

  if (query.leadId) where.leadId = Number(query.leadId);
  if (query.opportunityId) where.opportunityId = Number(query.opportunityId);
  if (query.status) where.status = query.status;

  return where;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const where = buildScope(req, req.query as any);

  const meetings = await Meeting.findAll({
    where,
    include: [
      { model: User, as: "user", attributes: ["id", "name"], required: false },
      { model: CrmLead, as: "lead", attributes: ["id", "name", "phone"], required: false },
      { model: Opportunity, as: "opportunity", attributes: ["id", "title"], required: false },
      { model: Contact, as: "contact", attributes: ["id", "name", "number"], required: false }
    ],
    order: [["createdAt", "DESC"]],
    limit: 50
  });

  return res.json(meetings);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const meeting = await Meeting.findOne({
    where: { id: Number(id), companyId },
    include: [
      { model: User, as: "user", attributes: ["id", "name"], required: false },
      { model: CrmLead, as: "lead", attributes: ["id", "name", "phone"], required: false },
      { model: Opportunity, as: "opportunity", attributes: ["id", "title"], required: false },
      { model: Contact, as: "contact", attributes: ["id", "name", "number"], required: false }
    ]
  });

  if (!meeting) {
    throw new AppError("Reunião não encontrada.", 404);
  }

  return res.json(meeting);
};

export const upload = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const file = req.file as Express.Multer.File;

  if (!file) {
    throw new AppError("Arquivo de vídeo é obrigatório.", 400);
  }

  const { leadId, opportunityId, contactId, title, duration } = req.body;

  const meeting = await Meeting.create({
    companyId,
    userId: Number(userId),
    leadId: leadId ? Number(leadId) : null,
    opportunityId: opportunityId ? Number(opportunityId) : null,
    contactId: contactId ? Number(contactId) : null,
    title: title || `Reunião ${new Date().toLocaleDateString("pt-BR")}`,
    status: "pending",
    videoFilename: file.filename,
    duration: duration ? Number(duration) : null
  });

  // Enqueue processing job
  await meetingQueue.add(
    "ProcessMeeting",
    { meetingId: meeting.id, companyId },
    { attempts: 2, backoff: { type: "exponential", delay: 5000 } }
  );

  return res.status(201).json(meeting);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: authUserId, profile } = req.user;
  const { id } = req.params;

  const where: any = { id: Number(id), companyId };
  if (profile !== "admin" && profile !== "super") {
    where.userId = Number(authUserId);
  }

  const meeting = await Meeting.findOne({ where });
  if (!meeting) {
    throw new AppError("Reunião não encontrada.", 404);
  }

  const { title, leadId, opportunityId, contactId } = req.body;

  await meeting.update({
    title: title ?? meeting.title,
    leadId: leadId !== undefined ? (leadId ? Number(leadId) : null) : meeting.leadId,
    opportunityId: opportunityId !== undefined ? (opportunityId ? Number(opportunityId) : null) : meeting.opportunityId,
    contactId: contactId !== undefined ? (contactId ? Number(contactId) : null) : meeting.contactId
  });

  return res.json(meeting);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: authUserId, profile } = req.user;
  const { id } = req.params;

  const where: any = { id: Number(id), companyId };
  if (profile !== "admin" && profile !== "super") {
    where.userId = Number(authUserId);
  }

  const meeting = await Meeting.findOne({ where });
  if (!meeting) {
    throw new AppError("Reunião não encontrada.", 404);
  }

  // Remove video file
  if (meeting.videoFilename) {
    const videoPath = path.join(
      uploadConfig.directory,
      `company${companyId}`,
      "meetings",
      meeting.videoFilename
    );
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
  }

  await meeting.destroy();

  return res.status(200).json({ message: "Reunião removida com sucesso." });
};

export const reprocess = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const meeting = await Meeting.findOne({ where: { id: Number(id), companyId } });
  if (!meeting) {
    throw new AppError("Reunião não encontrada.", 404);
  }

  if (!meeting.videoFilename) {
    throw new AppError("Arquivo de vídeo não disponível para reprocessamento.", 400);
  }

  await meeting.update({ status: "pending", errorMessage: null, transcription: null, insights: {} });

  await meetingQueue.add(
    "ProcessMeeting",
    { meetingId: meeting.id, companyId },
    { attempts: 2, backoff: { type: "exponential", delay: 5000 } }
  );

  return res.json({ message: "Reunião enfileirada para reprocessamento." });
};
