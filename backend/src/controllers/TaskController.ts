import { Request, Response } from "express";
import TaskBoard from "../models/TaskBoard";
import TaskList from "../models/TaskList";
import Task from "../models/Task";
import TaskChecklist from "../models/TaskChecklist";
import TaskComment from "../models/TaskComment";
import User from "../models/User";

// ======================= BOARDS =======================
export const indexBoards = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const boards = await TaskBoard.findAll({
        where: { companyId },
        include: [
            {
                model: TaskList,
                as: "lists",
                include: [
                    {
                        model: Task,
                        as: "tasks",
                        include: [
                            { model: TaskChecklist, as: "checklists" },
                            { model: TaskComment, as: "comments", include: [{ model: User, as: "user", attributes: ["id", "name"] }] },
                            { model: User, as: "responsible", attributes: ["id", "name"] },
                        ]
                    }
                ]
            }
        ],
        order: [
            ["createdAt", "ASC"],
            [{ model: TaskList, as: "lists" }, "order", "ASC"],
            [{ model: TaskList, as: "lists" }, { model: Task, as: "tasks" }, "order", "ASC"]
        ]
    });

    return res.status(200).json(boards);
};

export const storeBoard = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { name, description, color } = req.body;

    const board = await TaskBoard.create({
        companyId,
        name,
        description,
        color
    });

    return res.status(200).json(board);
};

export const updateBoard = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;
    const { name, description, color } = req.body;

    const board = await TaskBoard.findOne({ where: { id, companyId } });
    if (!board) return res.status(404).json({ error: "Board not found" });

    await board.update({ name, description, color });

    return res.status(200).json(board);
};

export const deleteBoard = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { companyId } = req.user;

    const board = await TaskBoard.findOne({ where: { id, companyId } });
    if (!board) return res.status(404).json({ error: "Board not found" });

    await board.destroy();

    return res.status(200).json({ message: "Board deleted" });
};

// ======================= LISTS =======================
export const storeList = async (req: Request, res: Response): Promise<Response> => {
    const { boardId, name, order, color } = req.body;
    const list = await TaskList.create({ boardId, name, order, color });
    return res.status(200).json(list);
};

export const updateList = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { name, order, color } = req.body;

    const list = await TaskList.findByPk(id);
    if (!list) return res.status(404).json({ error: "List not found" });

    await list.update({ name, order, color });
    return res.status(200).json(list);
};

export const deleteList = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const list = await TaskList.findByPk(id);
    if (!list) return res.status(404).json({ error: "List not found" });

    await list.destroy();
    return res.status(200).json({ message: "List deleted" });
};

// ======================= TASKS =======================
export const storeTask = async (req: Request, res: Response): Promise<Response> => {
    const { listId, title, description, priority, dueDate, responsibleId, color, url, tags, order } = req.body;
    const task = await Task.create({ listId, title, description, priority, dueDate, responsibleId, color, url, tags, order });

    const createdTask = await Task.findByPk(task.id, {
        include: [
            { model: TaskChecklist, as: "checklists" },
            { model: TaskComment, as: "comments", include: [{ model: User, as: "user", attributes: ["id", "name"] }] },
            { model: User, as: "responsible", attributes: ["id", "name"] },
        ]
    });

    return res.status(200).json(createdTask);
};

export const updateTask = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { listId, title, description, priority, dueDate, responsibleId, color, url, tags, order } = req.body;

    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    await task.update({ listId, title, description, priority, dueDate, responsibleId, color, url, tags, order });

    const updatedTask = await Task.findByPk(task.id, {
        include: [
            { model: TaskChecklist, as: "checklists" },
            { model: TaskComment, as: "comments", include: [{ model: User, as: "user", attributes: ["id", "name"] }] },
            { model: User, as: "responsible", attributes: ["id", "name"] },
        ]
    });

    return res.status(200).json(updatedTask);
};

export const deleteTask = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    await task.destroy();
    return res.status(200).json({ message: "Task deleted" });
};

// ======================= CHECKLISTS =======================
export const storeChecklist = async (req: Request, res: Response): Promise<Response> => {
    const { taskId, title, completed } = req.body;
    const checklist = await TaskChecklist.create({ taskId, title, completed });
    return res.status(200).json(checklist);
};

export const updateChecklist = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { title, completed } = req.body;

    const checklist = await TaskChecklist.findByPk(id);
    if (!checklist) return res.status(404).json({ error: "Checklist not found" });

    await checklist.update({ title, completed });
    return res.status(200).json(checklist);
};

export const deleteChecklist = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const checklist = await TaskChecklist.findByPk(id);
    if (!checklist) return res.status(404).json({ error: "Checklist not found" });

    await checklist.destroy();
    return res.status(200).json({ message: "Checklist deleted" });
};

// ======================= COMMENTS =======================
export const storeComment = async (req: Request, res: Response): Promise<Response> => {
    const { taskId, message } = req.body;
    const userId = req.user.id;
    const comment = await TaskComment.create({ taskId, userId, message });

    const createdComment = await TaskComment.findByPk(comment.id, {
        include: [{ model: User, as: "user", attributes: ["id", "name"] }]
    });

    return res.status(200).json(createdComment);
};

export const updateComment = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { message } = req.body;

    const comment = await TaskComment.findByPk(id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    await comment.update({ message });

    const updatedComment = await TaskComment.findByPk(comment.id, {
        include: [{ model: User, as: "user", attributes: ["id", "name"] }]
    });

    return res.status(200).json(updatedComment);
};

export const deleteComment = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const comment = await TaskComment.findByPk(id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    await comment.destroy();
    return res.status(200).json({ message: "Comment deleted" });
};

