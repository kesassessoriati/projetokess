import express from "express";
import isAuth from "../middleware/isAuth";
import * as WhatsappWarmupController from "../controllers/WhatsappWarmupController";

const whatsappWarmupRoutes = express.Router();

// Summary of all connections + their warmup status
whatsappWarmupRoutes.get("/whatsapp-warmup/summary", isAuth, WhatsappWarmupController.summary);

// Generate script templates (AI or predefined)
whatsappWarmupRoutes.post("/whatsapp-warmup/generate-script", isAuth, WhatsappWarmupController.generateScript);

// Per-connection
whatsappWarmupRoutes.get("/whatsapp-warmup/:whatsappId", isAuth, WhatsappWarmupController.show);
whatsappWarmupRoutes.post("/whatsapp-warmup/:whatsappId", isAuth, WhatsappWarmupController.update);
whatsappWarmupRoutes.get("/whatsapp-warmup/:whatsappId/logs", isAuth, WhatsappWarmupController.logs);
whatsappWarmupRoutes.get("/whatsapp-warmup/:whatsappId/stats", isAuth, WhatsappWarmupController.stats);

export default whatsappWarmupRoutes;
