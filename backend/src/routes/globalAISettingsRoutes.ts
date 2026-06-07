import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as GlobalAISettingsController from "../controllers/GlobalAISettingsController";

const globalAISettingsRoutes = Router();

globalAISettingsRoutes.get("/admin/ai-settings", isAuth, GlobalAISettingsController.show);
globalAISettingsRoutes.put("/admin/ai-settings", isAuth, GlobalAISettingsController.update);
globalAISettingsRoutes.post("/admin/ai-settings/:provider/sync-models", isAuth, GlobalAISettingsController.syncModels);

globalAISettingsRoutes.get("/admin/ai/global-webhook", isAuth, GlobalAISettingsController.showGlobalWebhook);
globalAISettingsRoutes.put("/admin/ai/global-webhook", isAuth, GlobalAISettingsController.updateGlobalWebhook);
globalAISettingsRoutes.post("/admin/ai/global-webhook/test", isAuth, GlobalAISettingsController.testWebhook);

export default globalAISettingsRoutes;
