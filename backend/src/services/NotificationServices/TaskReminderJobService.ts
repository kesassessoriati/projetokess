import { Op } from "sequelize";
import { startOfDay, endOfDay, addDays } from "date-fns";
import Task from "../../models/Task";
import TaskList from "../../models/TaskList";
import TaskBoard from "../../models/TaskBoard";
import User from "../../models/User";
import Notification from "../../models/Notification";
import CreateNotificationService from "./CreateNotificationService";
import logger from "../../utils/logger";

/**
 * Runs every hour. Sends reminders for tasks due on the next day
 * and overdue notifications for tasks past their dueDate.
 * Avoids duplicate notifications by checking metadata.taskId + type.
 */
const runTaskReminderJob = async (): Promise<void> => {
  try {
    const now = new Date();
    const tomorrowStart = startOfDay(addDays(now, 1));
    const tomorrowEnd = endOfDay(addDays(now, 1));

    // Tasks approaching due date (due tomorrow)
    const upcomingTasks = await Task.findAll({
      where: {
        dueDate: { [Op.between]: [tomorrowStart, tomorrowEnd] as any },
        responsibleId: { [Op.not]: null },
        [Op.or]: [{ status: null }, { status: "active" }],
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

      await CreateNotificationService({
        userId: task.responsibleId,
        companyId,
        type: "task_due",
        title: `Tarefa vence amanha: ${task.title}`,
        body: task.description || "Sua tarefa vence amanha. Vale revisar antes do prazo.",
        channel: "in_app",
        metadata: { taskId: task.id, leadId: task.leadId || null, dueDate: task.dueDate },
        sendEmail: true,
      });
    }

    // Overdue tasks (any active task already past due and not notified today)
    const overdueTasks = await Task.findAll({
      where: {
        dueDate: { [Op.lt]: now } as any,
        responsibleId: { [Op.not]: null },
        [Op.or]: [{ status: null }, { status: "active" }],
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
        metadata: { taskId: task.id, leadId: task.leadId || null, dueDate: task.dueDate },
        sendEmail: true,
      });
    }
  } catch (err) {
    logger.error("TaskReminderJob failed:", err);
  }
};

export default runTaskReminderJob;
