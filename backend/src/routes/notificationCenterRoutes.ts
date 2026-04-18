import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as NotificationCenterController from "../controllers/NotificationCenterController";

const notificationCenterRoutes = Router();

// GET  /notification-center          - list notifications for current user
// PUT  /notification-center/read-all - mark all as read
// PUT  /notification-center/:id/read - mark single notification as read
notificationCenterRoutes.get(
  "/notification-center",
  isAuth,
  NotificationCenterController.index
);

notificationCenterRoutes.put(
  "/notification-center/read-all",
  isAuth,
  NotificationCenterController.markAllRead
);

notificationCenterRoutes.put(
  "/notification-center/:id/read",
  isAuth,
  NotificationCenterController.markRead
);

notificationCenterRoutes.delete(
  "/notification-center/all",
  isAuth,
  NotificationCenterController.deleteAllNotifications
);

notificationCenterRoutes.delete(
  "/notification-center/:id",
  isAuth,
  NotificationCenterController.deleteNotification
);

export default notificationCenterRoutes;
