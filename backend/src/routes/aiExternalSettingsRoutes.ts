import express from "express";
import isAuth from "../middleware/isAuth";
import * as AiExternalSettingsController from "../controllers/AiExternalSettingsController";

const aiExternalSettingsRoutes = express.Router();

aiExternalSettingsRoutes.get("/ai-external/settings", isAuth, AiExternalSettingsController.getSettings);
aiExternalSettingsRoutes.post("/ai-external/settings/ensure", isAuth, AiExternalSettingsController.ensureSettings);

export default aiExternalSettingsRoutes;
