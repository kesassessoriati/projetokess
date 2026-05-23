import { Request, Response } from "express";
import SipCallLog from "../models/SipCallLog";
import { Op } from "sequelize";

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