import express from "express";
import isAuth from "../middleware/isAuth";

import * as TaskController from "../controllers/TaskController";

const taskRoutes = express.Router();

// Boards
taskRoutes.get("/tasks", isAuth, TaskController.indexBoards);
taskRoutes.post("/tasks", isAuth, TaskController.storeBoard);
taskRoutes.put("/tasks/:id", isAuth, TaskController.updateBoard);
taskRoutes.delete("/tasks/:id", isAuth, TaskController.deleteBoard);

// Lists
taskRoutes.post("/tasks/list", isAuth, TaskController.storeList);
taskRoutes.put("/tasks/list/:id", isAuth, TaskController.updateList);
taskRoutes.delete("/tasks/list/:id", isAuth, TaskController.deleteList);

// Tasks by Lead
taskRoutes.get("/tasks/lead/:leadId", isAuth, TaskController.indexTasksByLead);

// Task Items
taskRoutes.post("/tasks/item", isAuth, TaskController.storeTask);
taskRoutes.put("/tasks/item/:id", isAuth, TaskController.updateTask);
taskRoutes.delete("/tasks/item/:id", isAuth, TaskController.deleteTask);

// Task Checklists
taskRoutes.post("/tasks/item/:taskId/checklist", isAuth, TaskController.storeChecklist);
taskRoutes.put("/tasks/checklist/:id", isAuth, TaskController.updateChecklist);
taskRoutes.delete("/tasks/checklist/:id", isAuth, TaskController.deleteChecklist);

// Task Comments
taskRoutes.post("/tasks/item/:taskId/comment", isAuth, TaskController.storeComment);
taskRoutes.put("/tasks/comment/:id", isAuth, TaskController.updateComment);
taskRoutes.delete("/tasks/comment/:id", isAuth, TaskController.deleteComment);

export default taskRoutes;
