import express from "express";
import isAuth from "../middleware/isAuth";
import * as WhatsappWarmupController from "../controllers/WhatsappWarmupController";

const whatsappWarmupRoutes = express.Router();

whatsappWarmupRoutes.get("/whatsapp-warmup/:whatsappId", isAuth, WhatsappWarmupController.show);
whatsappWarmupRoutes.post("/whatsapp-warmup/:whatsappId", isAuth, WhatsappWarmupController.update);
whatsappWarmupRoutes.get("/whatsapp-warmup/:whatsappId/logs", isAuth, WhatsappWarmupController.logs);

export default whatsappWarmupRoutes;
