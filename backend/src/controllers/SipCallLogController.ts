import { Request, Response } from "express";
import SipCallLog from "../models/SipCallLog";
import { Op } from "sequelize";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    direction,
    status,
    userId,
    didId,
    extensionId,
    contactId,
    ticketId,
    startDate,
    endDate,
    pageNumber = 1,
    limit = 50
  } = req.query;

  const where: any = { companyId };

  if (direction) where.direction = direction;
  if (status) where.status = status;
  if (userId) where.userId = Number(userId);
  if (didId) where.didId = Number(didId);
  if (extensionId) where.extensionId = Number(extensionId);
  if (contactId) where.contactId = Number(contactId);
  if (ticketId) where.ticketId = Number(ticketId);

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(String(startDate));
    if (endDate) where.createdAt[Op.lte] = new Date(String(endDate));
  }

  const offset = (Number(pageNumber) - 1) * Number(limit);

  const { count, rows } = await SipCallLog.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: Number(limit),
    offset
  });

  return res.json({
    records: rows,
    count,
    hasMore: offset + Number(limit) < count
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    callId,
    providerCallId,
    direction,
    status,
    fromNumber,
    toNumber,
    didId,
    extensionId,
    userId,
    queueId,
    channelId,
    ticketId,
    contactId,
    metadata
  } = req.body;

  if (!direction || !status) {
    throw new AppError("direction e status são obrigatórios.", 400);
  }

  const log = await SipCallLog.create({
    companyId,
    callId: callId || `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    providerCallId,
    direction,
    status,
    fromNumber,
    toNumber,
    didId: didId || null,
    extensionId: extensionId || null,
    userId: userId || null,
    queueId: queueId || null,
    channelId: channelId || null,
    ticketId: ticketId || null,
    contactId: contactId || null,
    startedAt: new Date(),
    metadata: metadata || {}
  });

  return res.status(201).json(log);
};

export const updateStatus = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { status, answeredAt, endedAt, recordingUrl, metadata } = req.body;

  const log = await SipCallLog.findOne({ where: { id, companyId } });

  if (!log) {
    throw new AppError("Registro de chamada não encontrado.", 404);
  }

  const updateData: any = {};

  if (status) updateData.status = status;
  if (answeredAt) updateData.answeredAt = new Date(answeredAt);
  if (endedAt) {
    updateData.endedAt = new Date(endedAt);
    if (log.startedAt) {
      const start = new Date(log.startedAt).getTime();
      const end = new Date(endedAt).getTime();
      updateData.duration = Math.max(0, Math.round((end - start) / 1000));
    }
  }
  if (recordingUrl) updateData.recordingUrl = recordingUrl;
  if (metadata) {
    updateData.metadata = { ...(log.metadata || {}), ...metadata };
  }

  await log.update(updateData);

  return res.json(log);
};