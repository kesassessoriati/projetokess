import { Request, Response } from "express";
import { Op } from "sequelize";
import TimerTask from "../models/TimerTask";
import TimerSession from "../models/TimerSession";
import User from "../models/User";
import Ticket from "../models/Ticket";

export const listTasks = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;

    const tasks = await TimerTask.findAll({
        where: {
            companyId,
            [Op.or]: [
                { visibility: "team" },
                { visibility: "private", userId }
            ]
        },
        order: [["name", "ASC"]]
    });

    return res.status(200).json(tasks);
};

export const createTask = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const { name, defaultTime, category, visibility } = req.body;

    const task = await TimerTask.create({
        name,
        defaultTime,
        category,
        visibility: visibility || "team",
        companyId,
        userId
    });

    return res.status(201).json(task);
};

export const updateTask = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const { taskId } = req.params;
    const { name, defaultTime, category, visibility } = req.body;

    const task = await TimerTask.findOne({ where: { id: taskId, companyId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (task.visibility === "private" && task.userId !== parseInt(userId.toString(), 10)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await task.update({ name, defaultTime, category, visibility });
    return res.status(200).json(task);
};

export const deleteTask = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const { taskId } = req.params;

    const task = await TimerTask.findOne({ where: { id: taskId, companyId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (task.visibility === "private" && task.userId !== parseInt(userId.toString(), 10)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await task.destroy();
    return res.status(200).json({ message: "Task deleted" });
};

// Sessions
export const listSessions = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { dateFrom, dateTo } = req.query;

    const whereCondition: any = { companyId };

    if (dateFrom && dateTo) {
        whereCondition.startTime = {
            [Op.between]: [
                new Date(`${dateFrom}T00:00:00.000Z`),
                new Date(`${dateTo}T23:59:59.999Z`)
            ]
        };
    }

    const sessions = await TimerSession.findAll({
        where: whereCondition,
        include: [
            { model: TimerTask, as: "task" },
            { model: User, as: "user", attributes: ["id", "name"] },
            { model: Ticket, as: "ticket", attributes: ["id"] }
        ],
        order: [["createdAt", "DESC"]]
    });

    return res.status(200).json(sessions);
};


export const createSession = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const { taskId, ticketId, status } = req.body;

    const session = await TimerSession.create({
        taskId: taskId || null,
        ticketId: ticketId || null,
        userId,
        companyId,
        startTime: new Date(),
        status: status || "active"
    });

    return res.status(201).json(session);
};

export const updateSession = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const { sessionId } = req.params;
    const { status, timeSpent, endTime } = req.body;

    const session = await TimerSession.findOne({ where: { id: sessionId, companyId, userId } });
    if (!session) return res.status(404).json({ error: "Session not found" });

    await session.update({
        status,
        timeSpent,
        endTime: endTime ? new Date(endTime) : session.endTime
    });

    return res.status(200).json(session);
};
