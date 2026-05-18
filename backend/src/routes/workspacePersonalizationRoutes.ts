import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as WorkspacePersonalizationController from "../controllers/WorkspacePersonalizationController";

const workspacePersonalizationRoutes = Router();

workspacePersonalizationRoutes.get("/workspace/menu-preferences", isAuth, WorkspacePersonalizationController.showMenuPreferences);
workspacePersonalizationRoutes.put("/workspace/menu-preferences", isAuth, WorkspacePersonalizationController.updateMenuPreferences);

export default workspacePersonalizationRoutes;
