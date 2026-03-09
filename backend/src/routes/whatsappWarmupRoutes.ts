import express from "express";
import isAuth from "../middleware/isAuth";
import * as WhatsappWarmupController from "../controllers/WhatsappWarmupController";

const whatsappWarmupRoutes = express.Router();

// Summary of all connections + their warmup status
whatsappWarmupRoutes.get("/whatsapp-warmup/summary", isAuth, WhatsappWarmupController.summary);

// Generate script templates (AI or predefined)
whatsappWarmupRoutes.post("/whatsapp-warmup/generate-script", isAuth, WhatsappWarmupController.generateScript);

// Session orchestration
whatsappWarmupRoutes.get("/whatsapp-warmup/sessions", isAuth, WhatsappWarmupController.listSessions);
whatsappWarmupRoutes.post("/whatsapp-warmup/sessions", isAuth, WhatsappWarmupController.createSession);
whatsappWarmupRoutes.get("/whatsapp-warmup/sessions/:id/logs", isAuth, WhatsappWarmupController.sessionLogs);
whatsappWarmupRoutes.post("/whatsapp-warmup/sessions/:id/start", isAuth, WhatsappWarmupController.startSession);
whatsappWarmupRoutes.post("/whatsapp-warmup/sessions/:id/pause", isAuth, WhatsappWarmupController.pauseSession);
whatsappWarmupRoutes.post("/whatsapp-warmup/sessions/:id/resume", isAuth, WhatsappWarmupController.resumeSession);
whatsappWarmupRoutes.post("/whatsapp-warmup/sessions/:id/stop", isAuth, WhatsappWarmupController.stopSession);
whatsappWarmupRoutes.get("/whatsapp-warmup/metrics", isAuth, WhatsappWarmupController.sessionMetrics);

// Per-connection
whatsappWarmupRoutes.get("/whatsapp-warmup/:whatsappId", isAuth, WhatsappWarmupController.show);
whatsappWarmupRoutes.post("/whatsapp-warmup/:whatsappId", isAuth, WhatsappWarmupController.update);
whatsappWarmupRoutes.get("/whatsapp-warmup/:whatsappId/logs", isAuth, WhatsappWarmupController.logs);
whatsappWarmupRoutes.get("/whatsapp-warmup/:whatsappId/stats", isAuth, WhatsappWarmupController.stats);

export default whatsappWarmupRoutes;
