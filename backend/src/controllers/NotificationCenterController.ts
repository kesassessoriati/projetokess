import { Request, Response } from "express";
import CreateNotificationService from "../services/NotificationServices/CreateNotificationService";
import ListNotificationsService from "../services/NotificationServices/ListNotificationsService";
import MarkNotificationsReadService from "../services/NotificationServices/MarkNotificationsReadService";
import { getIO } from "../libs/socket";
import Notification from "../models/Notification";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  const { companyId } = req.user;
  const { status = "all", limit = "50", offset = "0" } = req.query as any;

  const result = await ListNotificationsService({
    userId,
    companyId,
    status,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
  });

  return res.json(result);
};

export const markRead = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  const { companyId } = req.user;
  const notificationId = req.params.id ? parseInt(req.params.id, 10) : undefined;

  await MarkNotificationsReadService(userId, companyId, notificationId);

  // Emit unread count update
  try {
    const io = getIO();
    io.of(companyId.toString()).emit(`company-${companyId}-notification`, {
      action: "markRead",
      notificationId: notificationId || null,
      userId,
    });
  } catch (_) {}

  return res.json({ success: true });
};

export const markAllRead = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  const { companyId } = req.user;

  await MarkNotificationsReadService(userId, companyId);

  try {
    const io = getIO();
    io.of(companyId.toString()).emit(`company-${companyId}-notification`, {
      action: "markAllRead",
      userId,
    });
  } catch (_) {}

  return res.json({ success: true });
};

export const deleteNotification = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  const { companyId } = req.user;
  const notificationId = parseInt(req.params.id, 10);

  const notification = await Notification.findOne({
    where: { id: notificationId, userId, companyId, channel: "in_app" }
  });
  if (!notification) return res.status(404).json({ error: "Notification not found" });

  await notification.destroy();

  try {
    const io = getIO();
    io.of(companyId.toString()).emit(`company-${companyId}-notification`, {
      action: "delete",
      notificationId,
      userId,
    });
  } catch (_) {}

  return res.json({ success: true });
};

export const deleteAllNotifications = async (req: Request, res: Response): Promise<Response> => {
  const userId = Number(req.user.id);
  const { companyId } = req.user;

  await Notification.destroy({
    where: { userId, companyId, channel: "in_app" }
  });

  try {
    const io = getIO();
    io.of(companyId.toString()).emit(`company-${companyId}-notification`, {
      action: "deleteAll",
      userId,
    });
  } catch (_) {}

  return res.json({ success: true });
};
