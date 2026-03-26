import { Op } from "sequelize";
import Notification from "../../models/Notification";

/**
 * Mark one or all notifications as read for a user.
 * If notificationId is provided, marks that single notification.
 * Otherwise marks ALL unread notifications for the user.
 */
const MarkNotificationsReadService = async (
  userId: number,
  companyId: number,
  notificationId?: number
): Promise<void> => {
  const where: any = { userId, companyId, status: "unread" };

  if (notificationId) {
    where.id = notificationId;
  }

  await Notification.update({ status: "read" }, { where });
};

export default MarkNotificationsReadService;
