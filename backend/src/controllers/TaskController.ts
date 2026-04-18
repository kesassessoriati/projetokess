import { Request, Response } from "express";
import { Op } from "sequelize";
import TaskBoard from "../models/TaskBoard";
import TaskList from "../models/TaskList";
import Task from "../models/Task";
import TaskChecklist from "../models/TaskChecklist";
import TaskComment from "../models/TaskComment";
import User from "../models/User";
import { getIO } from "../libs/socket";

const emitTaskEvent = (companyId: number, action: string, task?: any) => {
    try {
        const io = getIO();
        io.to(companyId.toString()).emit(`company-${companyId}-task`, { action, task });
    } catch (_) { /* socket may not be ready during tests */ }
};

// ======================= ACCESS HELPERS =======================

/**
 * Returns true for company admins and system superadmins.
 * These profiles can see/edit all boards within their company.
 * Common users (profile "user" or any other value) see only own boards.
 */
const isPrivileged = (profile: string): boolean =>
    profile === "admin" || profile === "super";

/**
 * Checks whether the authenticated user is allowed to access a specific board.
 * - Privileged users (admin/super): always allowed within the same company
 *   (company boundary is already enforced by the caller via companyId in the WHERE clause).
 * - Common users: only allowed if they created the board.
 *   Legacy boards without createdBy (null) are inaccessible to common users.
 */
const canAccessBoard = (board: TaskBoard, userId: string, profile: string): boolean => {
    if (isPrivileged(profile)) return true;
    return board.createdBy !== null && board.createdBy === parseInt(userId, 10);
};

/**
 * Resolves the parent TaskBoard of a given TaskList.
 * The WHERE on TaskBoard includes companyId to prevent cross-tenant traversal.
 */
const resolveBoardByListId = async (listId: number, companyId: number): Promise<TaskBoard | null> => {
    const list = await TaskList.findByPk(listId, {
        include: [{ model: TaskBoard, as: "board", where: { companyId }, required: true }]
    });
    return (list as any)?.board ?? null;
};

/**
 * Resolves the parent TaskBoard of a given Task (Task → TaskList → TaskBoard).
 */
const resolveBoardByTaskId = async (taskId: number, companyId: number): Promise<TaskBoard | null> => {
    const task = await Task.findByPk(taskId, {
        include: [{
            model: TaskList,
            as: "list",
            include: [{ model: TaskBoard, as: "board", where: { companyId }, required: true }],
            required: true
        }]
    });
    return (task as any)?.list?.board ?? null;
};

/**
 * Resolves the parent TaskBoard of a given TaskChecklist
 * (TaskChecklist → Task → TaskList → TaskBoard).
 */
const resolveBoardByChecklistId = async (checklistId: number, companyId: number): Promise<TaskBoard | null> => {
    const checklist = await TaskChecklist.findByPk(checklistId, {
        include: [{
            model: Task,
            as: "task",
            include: [{
                model: TaskList,
                as: "list",
                include: [{ model: TaskBoard, as: "board", where: { companyId }, required: true }],
                required: true
            }],
            required: true
        }]
    });
    return (checklist as any)?.task?.list?.board ?? null;
};

/**
 * Resolves the parent TaskBoard of a given TaskComment
 * (TaskComment → Task → TaskList → TaskBoard).
 */
const resolveBoardByCommentId = async (commentId: number, companyId: number): Promise<TaskBoard | null> => {
    const comment = await TaskComment.findByPk(commentId, {
        include: [{
            model: Task,
            as: "task",
            include: [{
                model: TaskList,
                as: "list",
                include: [{ model: TaskBoard, as: "board", where: { companyId }, required: true }],
                required: true
            }],
            required: true
        }]
    });
    return (comment as any)?.task?.list?.board ?? null;
};

const ACTIVE_TASK_WHERE = {
    [Op.or]: [
        { status: null },
        { status: "active" }
    ]
};

const buildTaskInclude = (includeBoard = false) => ([
    ...(includeBoard ? [{
        model: TaskList,
        as: "list",
        include: [{ model: TaskBoard, as: "board" }],
    }] : []),
    { model: TaskChecklist, as: "checklists" },
    { model: TaskComment, as: "comments", include: [{ model: User, as: "user", attributes: ["id", "name"] }] },
    { model: User, as: "responsible", attributes: ["id", "name"] },
    { model: User, as: "completedByUser", attributes: ["id", "name"] },
]);

// ======================= BOARDS =======================

export const indexBoards = async (req: Request, res: Response): Promise<Response> => {
    const { id: userId, profile, companyId } = req.user;

    // Privileged users see all boards in the company.
    // Common users see only the boards they created.
    const where: Record<string, any> = { companyId };
    if (!isPrivileged(profile)) {
        where.createdBy = parseInt(userId, 10);
    }

    const boards = await TaskBoard.findAll({
        where,
        include: [
            {
                model: TaskList,
                as: "lists",
                include: [
                    {
                        model: Task,
                        as: "tasks",
                        where: ACTIVE_TASK_WHERE,
                        required: false,
                        include: buildTaskInclude(),
                    }
                ]
            }
        ],
        order: [
            ["createdAt", "ASC"],
            [{ model: TaskList, as: "lists" }, "order", "ASC"],
            [{ model: TaskList, as: "lists" }, "id", "ASC"],
            [{ model: TaskList, as: "lists" }, { model: Task, as: "tasks" }, "order", "ASC"],
            [{ model: TaskList, as: "lists" }, { model: Task, as: "tasks" }, "id", "ASC"]
        ]
    });

    return res.status(200).json(boards);
};

export const storeBoard = async (req: Request, res: Response): Promise<Response> => {
    const { id: userId, companyId } = req.user;
    const { name, description, color } = req.body;

    const board = await TaskBoard.create({
        companyId,
        name,
        description,
        color,
        createdBy: parseInt(userId, 10)
    });

    return res.status(200).json(board);
};

export const updateBoard = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;
    const { name, description, color } = req.body;

    const board = await TaskBoard.findOne({ where: { id, companyId } });
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await board.update({ name, description, color });

    return res.status(200).json(board);
};

export const deleteBoard = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;

    const board = await TaskBoard.findOne({ where: { id, companyId } });
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await board.destroy();

    return res.status(200).json({ message: "Board deleted" });
};

// ======================= LISTS =======================

export const storeList = async (req: Request, res: Response): Promise<Response> => {
    const { id: userId, profile, companyId } = req.user;
    const { boardId, name, order, color } = req.body;

    const board = await TaskBoard.findOne({ where: { id: boardId, companyId } });
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    const list = await TaskList.create({ boardId, name, order, color });
    return res.status(200).json(list);
};

export const updateList = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;
    const { name, order, color } = req.body;

    const list = await TaskList.findByPk(id);
    if (!list) return res.status(404).json({ error: "List not found" });

    const board = await resolveBoardByListId(list.boardId, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await list.update({ name, order, color });
    return res.status(200).json(list);
};

export const deleteList = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;

    const list = await TaskList.findByPk(id);
    if (!list) return res.status(404).json({ error: "List not found" });

    const board = await resolveBoardByListId(list.boardId, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await list.destroy();
    return res.status(200).json({ message: "List deleted" });
};

// ======================= TASKS =======================

export const indexTasksByLead = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { leadId } = req.params;

    const tasks = await Task.findAll({
        where: { leadId: parseInt(leadId, 10) },
        include: [
            {
                model: TaskList,
                as: "list",
                include: [{ model: TaskBoard, as: "board", where: { companyId }, required: true }],
                required: true,
            },
            { model: TaskChecklist, as: "checklists" },
            { model: TaskComment, as: "comments", include: [{ model: User, as: "user", attributes: ["id", "name"] }] },
            { model: User, as: "responsible", attributes: ["id", "name"] },
            { model: User, as: "completedByUser", attributes: ["id", "name"] },
        ],
        order: [["status", "ASC"], ["completedAt", "DESC"], ["createdAt", "DESC"]],
    });

    return res.status(200).json(tasks);
};

export const indexCompletedTasks = async (req: Request, res: Response): Promise<Response> => {
    const { id: userId, profile, companyId } = req.user;
    const boardId = req.query.boardId ? parseInt(String(req.query.boardId), 10) : null;

    const boardWhere: Record<string, any> = { companyId };
    if (boardId) {
        boardWhere.id = boardId;
    }
    if (!isPrivileged(profile)) {
        boardWhere.createdBy = parseInt(userId, 10);
    }

    const tasks = await Task.findAll({
        where: { status: "completed" },
        include: [
            {
                model: TaskList,
                as: "list",
                include: [{ model: TaskBoard, as: "board", where: boardWhere, required: true }],
                required: true,
            },
            { model: TaskChecklist, as: "checklists" },
            { model: TaskComment, as: "comments", include: [{ model: User, as: "user", attributes: ["id", "name"] }] },
            { model: User, as: "responsible", attributes: ["id", "name"] },
            { model: User, as: "completedByUser", attributes: ["id", "name"] },
        ],
        order: [["completedAt", "DESC"], ["updatedAt", "DESC"]],
    });

    return res.status(200).json(tasks);
};

export const storeTask = async (req: Request, res: Response): Promise<Response> => {
    const { id: userId, profile, companyId } = req.user;
    const { listId, title, description, priority, dueDate, responsibleId, color, url, tags, order, leadId } = req.body;

    const board = await resolveBoardByListId(listId, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    const task = await Task.create({
        listId,
        title,
        description,
        priority,
        dueDate,
        responsibleId,
        color,
        url,
        tags,
        order,
        leadId: leadId || null,
        status: "active",
        completedAt: null,
        completedBy: null
    });

    const createdTask = await Task.findByPk(task.id, {
        include: buildTaskInclude(true)
    });

    emitTaskEvent(companyId, "create", createdTask);
    return res.status(200).json(createdTask);
};

export const updateTask = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;
    const { listId, title, description, priority, dueDate, responsibleId, color, url, tags, order, leadId, status } = req.body;

    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const board = await resolveBoardByTaskId(task.id, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    const payload: Record<string, any> = {};

    if (listId !== undefined) payload.listId = listId;
    if (title !== undefined) payload.title = title;
    if (description !== undefined) payload.description = description;
    if (priority !== undefined) payload.priority = priority;
    if (dueDate !== undefined) payload.dueDate = dueDate;
    if (responsibleId !== undefined) payload.responsibleId = responsibleId;
    if (color !== undefined) payload.color = color;
    if (url !== undefined) payload.url = url;
    if (tags !== undefined) payload.tags = tags;
    if (order !== undefined) payload.order = order;
    if (leadId !== undefined) payload.leadId = leadId || null;

    if (status === "completed") {
        payload.status = "completed";
        payload.completedAt = task.completedAt || new Date();
        payload.completedBy = parseInt(userId, 10);
    } else if (status === "active") {
        payload.status = "active";
        payload.completedAt = null;
        payload.completedBy = null;
    }

    await task.update(payload);

    const updatedTask = await Task.findByPk(task.id, {
        include: buildTaskInclude(true)
    });

    emitTaskEvent(companyId, "update", updatedTask);
    return res.status(200).json(updatedTask);
};

export const completeTask = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;

    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const board = await resolveBoardByTaskId(task.id, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await task.update({
        status: "completed",
        completedAt: new Date(),
        completedBy: parseInt(userId, 10),
    });

    const completedTask = await Task.findByPk(task.id, {
        include: buildTaskInclude(true)
    });

    emitTaskEvent(companyId, "update", completedTask);
    return res.status(200).json(completedTask);
};

export const reopenTask = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;

    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const board = await resolveBoardByTaskId(task.id, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await task.update({
        status: "active",
        completedAt: null,
        completedBy: null,
    });

    const reopenedTask = await Task.findByPk(task.id, {
        include: buildTaskInclude(true)
    });

    emitTaskEvent(companyId, "update", reopenedTask);
    return res.status(200).json(reopenedTask);
};

export const deleteTask = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;

    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const board = await resolveBoardByTaskId(task.id, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await task.destroy();
    emitTaskEvent(companyId, "delete", { id: parseInt(id, 10) });
    return res.status(200).json({ message: "Task deleted" });
};

// ======================= CHECKLISTS =======================

export const storeChecklist = async (req: Request, res: Response): Promise<Response> => {
    const { id: userId, profile, companyId } = req.user;
    const { taskId, title, completed } = req.body;

    const board = await resolveBoardByTaskId(taskId, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    const checklist = await TaskChecklist.create({ taskId, title, completed });
    return res.status(200).json(checklist);
};

export const updateChecklist = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;
    const { title, completed } = req.body;

    const checklist = await TaskChecklist.findByPk(id);
    if (!checklist) return res.status(404).json({ error: "Checklist not found" });

    const board = await resolveBoardByChecklistId(checklist.id, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await checklist.update({ title, completed });
    return res.status(200).json(checklist);
};

export const deleteChecklist = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;

    const checklist = await TaskChecklist.findByPk(id);
    if (!checklist) return res.status(404).json({ error: "Checklist not found" });

    const board = await resolveBoardByChecklistId(checklist.id, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await checklist.destroy();
    return res.status(200).json({ message: "Checklist deleted" });
};

// ======================= COMMENTS =======================

export const storeComment = async (req: Request, res: Response): Promise<Response> => {
    const { id: userId, profile, companyId } = req.user;
    const { taskId, message } = req.body;

    const board = await resolveBoardByTaskId(taskId, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    const comment = await TaskComment.create({ taskId, userId: parseInt(userId, 10), message });

    const createdComment = await TaskComment.findByPk(comment.id, {
        include: [{ model: User, as: "user", attributes: ["id", "name"] }]
    });

    return res.status(200).json(createdComment);
};

export const updateComment = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;
    const { message } = req.body;

    const comment = await TaskComment.findByPk(id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const board = await resolveBoardByCommentId(comment.id, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    // Common users can only edit their own comments; admins can edit any.
    if (!isPrivileged(profile) && comment.userId !== parseInt(userId, 10)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await comment.update({ message });

    const updatedComment = await TaskComment.findByPk(comment.id, {
        include: [{ model: User, as: "user", attributes: ["id", "name"] }]
    });

    return res.status(200).json(updatedComment);
};

export const deleteComment = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { id: userId, profile, companyId } = req.user;

    const comment = await TaskComment.findByPk(id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const board = await resolveBoardByCommentId(comment.id, companyId);
    if (!board) return res.status(404).json({ error: "Board not found" });

    if (!canAccessBoard(board, userId, profile)) {
        return res.status(403).json({ error: "Access denied" });
    }

    // Common users can only delete their own comments; admins can delete any.
    if (!isPrivileged(profile) && comment.userId !== parseInt(userId, 10)) {
        return res.status(403).json({ error: "Access denied" });
    }

    await comment.destroy();
    return res.status(200).json({ message: "Comment deleted" });
};
