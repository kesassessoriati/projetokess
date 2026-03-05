import express from "express";
import isAuth from "../middleware/isAuth";
import * as TimerController from "../controllers/TimerController";

const timerRoutes = express.Router();

timerRoutes.get("/timer-tasks", isAuth, TimerController.listTasks);
timerRoutes.post("/timer-tasks", isAuth, TimerController.createTask);
timerRoutes.put("/timer-tasks/:taskId", isAuth, TimerController.updateTask);
timerRoutes.delete("/timer-tasks/:taskId", isAuth, TimerController.deleteTask);

timerRoutes.get("/timer-sessions", isAuth, TimerController.listSessions);
timerRoutes.post("/timer-sessions", isAuth, TimerController.createSession);
timerRoutes.put("/timer-sessions/:sessionId", isAuth, TimerController.updateSession);

export default timerRoutes;
