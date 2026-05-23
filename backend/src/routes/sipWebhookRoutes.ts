import express from "express";
import * as SipWebhookController from "../controllers/SipWebhookController";

const sipWebhookRoutes = express.Router();

sipWebhookRoutes.post("/api/sip/webhook/events", SipWebhookController.handleEvent);

export default sipWebhookRoutes;