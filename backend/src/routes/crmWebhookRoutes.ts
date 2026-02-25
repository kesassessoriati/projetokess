import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as CRMWebhookController from "../controllers/CRMWebhookController";

const crmWebhookRoutes = Router();

crmWebhookRoutes.get("/crm/webhooks", isAuth, CRMWebhookController.index);
crmWebhookRoutes.post("/crm/webhooks", isAuth, CRMWebhookController.store);
crmWebhookRoutes.put("/crm/webhooks/:webhookId", isAuth, CRMWebhookController.update);
crmWebhookRoutes.delete("/crm/webhooks/:webhookId", isAuth, CRMWebhookController.remove);

export default crmWebhookRoutes;
