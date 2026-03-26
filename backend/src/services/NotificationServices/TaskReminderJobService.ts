import { Op } from "sequelize";
import { addHours, startOfDay, endOfDay, addDays } from "date-fns";
import Task from "../../models/Task";
import TaskList from "../../models/TaskList";
import TaskBoard from "../../models/TaskBoard";
import User from "../../models/User";
import Notification from "../../models/Notification";
import CreateNotificationService from "./CreateNotificationService";
import logger from "../../utils/logger";

/**
 * Runs every hour. Sends reminders for tasks due within 24 hours
 * and overdue notifications for tasks past their dueDate.
 * Avoids duplicate notifications by checking metadata.taskId + type.
 */
const runTaskReminderJob = async (): Promise<void> => {
  try {
    const now = new Date();
    const in24h = addHours(now, 24);
    const yesterday = addHours(now, -24);

    // Tasks approaching due date (due in the next 24 hours)
    const upcomingTasks = await Task.findAll({
      where: {
        dueDate: { [Op.between]: [now, in24h] as any },
        responsibleId: { [Op.not]: null },
      },
      include: [
        { model: User, as: "responsible" },
        {
          model: TaskList,
          as: "list",
          include: [{ model: TaskBoard, as: "board" }],
        },
      ],
    });

    for (const task of upcomingTasks) {
      if (!task.responsible) continue;

      const board = (task.list as any)?.board;
      const companyId = board?.companyId;
      if (!companyId) continue;

      // Check if already notified today for this task
      const alreadySent = await Notification.findOne({
        where: {
          userId: task.responsibleId,
          companyId,
          type: "task_due",
          metadata: { taskId: task.id } as any,
          createdAt: { [Op.gte]: startOfDay(now) },
        },
      });

      if (alreadySent) continue;

      const hoursLeft = Math.round((task.dueDate.getTime() - now.getTime()) / 3600000);
      const timeLabel = hoursLeft <= 1 ? "em menos de 1 hora" : `em ${hoursLeft} horas`;

      await CreateNotificationService({
        userId: task.responsibleId,
        companyId,
        type: "task_due",
        title: `Tarefa vence ${timeLabel}: ${task.title}`,
        body: task.description || undefined,
        channel: "in_app",
        metadata: { taskId: task.id, dueDate: task.dueDate },
        sendEmail: true,
      });
    }

    // Overdue tasks (dueDate in the last 24h and no overdue notification sent today)
    const overdueTasks = await Task.findAll({
      where: {
        dueDate: { [Op.between]: [yesterday, now] as any },
        responsibleId: { [Op.not]: null },
      },
      include: [
        { model: User, as: "responsible" },
        {
          model: TaskList,
          as: "list",
          include: [{ model: TaskBoard, as: "board" }],
        },
      ],
    });

    for (const task of overdueTasks) {
      if (!task.responsible) continue;

      const board = (task.list as any)?.board;
      const companyId = board?.companyId;
      if (!companyId) continue;

      const alreadySent = await Notification.findOne({
        where: {
          userId: task.responsibleId,
          companyId,
          type: "task_overdue",
          metadata: { taskId: task.id } as any,
          createdAt: { [Op.gte]: startOfDay(now) },
        },
      });

      if (alreadySent) continue;

      await CreateNotificationService({
        userId: task.responsibleId,
        companyId,
        type: "task_overdue",
        title: `Tarefa atrasada: ${task.title}`,
        body: `Prazo encerrado. Por favor, atualize o status da tarefa.`,
        channel: "in_app",
        metadata: { taskId: task.id, dueDate: task.dueDate },
        sendEmail: true,
      });
    }
  } catch (err) {
    logger.error("TaskReminderJob failed:", err);
  }
};

export default runTaskReminderJob;
