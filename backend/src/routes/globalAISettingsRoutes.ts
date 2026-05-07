import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as GlobalAISettingsController from "../controllers/GlobalAISettingsController";

const globalAISettingsRoutes = Router();

globalAISettingsRoutes.get("/admin/ai-settings", isAuth, GlobalAISettingsController.show);
globalAISettingsRoutes.put("/admin/ai-settings", isAuth, GlobalAISettingsController.update);
globalAISettingsRoutes.post("/admin/ai-settings/:provider/sync-models", isAuth, GlobalAISettingsController.syncModels);

export default globalAISettingsRoutes;
