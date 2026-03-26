import { Op } from "sequelize";
import Notification from "../../models/Notification";

interface ListNotificationsParams {
  userId: number;
  companyId: number;
  status?: "unread" | "read" | "all";
  limit?: number;
  offset?: number;
}

const ListNotificationsService = async ({
  userId,
  companyId,
  status = "all",
  limit = 50,
  offset = 0,
}: ListNotificationsParams): Promise<{ notifications: Notification[]; count: number; unreadCount: number }> => {
  const where: any = {
    userId,
    companyId,
    channel: "in_app",
  };

  if (status !== "all") {
    where.status = status;
  }

  const { rows: notifications, count } = await Notification.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const unreadCount = await Notification.count({
    where: { userId, companyId, status: "unread", channel: "in_app" },
  });

  return { notifications, count, unreadCount };
};

export default ListNotificationsService;
