import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as AiExternalWebhookController from "../controllers/AiExternalWebhookController";

const aiExternalWebhookRoutes = Router();

aiExternalWebhookRoutes.get(
  "/ai-agents/external/webhooks",
  isAuth,
  AiExternalWebhookController.list
);

aiExternalWebhookRoutes.post(
  "/ai-agents/external/webhooks",
  isAuth,
  AiExternalWebhookController.create
);

aiExternalWebhookRoutes.put(
  "/ai-agents/external/webhooks/:id",
  isAuth,
  AiExternalWebhookController.update
);

aiExternalWebhookRoutes.patch(
  "/ai-agents/external/webhooks/:id/toggle",
  isAuth,
  AiExternalWebhookController.toggle
);

aiExternalWebhookRoutes.delete(
  "/ai-agents/external/webhooks/:id",
  isAuth,
  AiExternalWebhookController.remove
);

export default aiExternalWebhookRoutes;
