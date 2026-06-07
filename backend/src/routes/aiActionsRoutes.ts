import express from "express";
import isAuth from "../middleware/isAuth";
import AiActionsController from "../controllers/AiActionsController";

const aiActionsRoutes = express.Router();

aiActionsRoutes.get("/ai-actions/status", isAuth, AiActionsController.status);
aiActionsRoutes.get("/ai-actions/blocked-contacts", isAuth, AiActionsController.blockedContacts);
aiActionsRoutes.post("/ai-actions/contacts/:contactId/pause", isAuth, AiActionsController.pause);
aiActionsRoutes.post("/ai-actions/contacts/:contactId/pause-until", isAuth, AiActionsController.pauseUntil);
aiActionsRoutes.post("/ai-actions/contacts/:contactId/resume", isAuth, AiActionsController.resume);

aiActionsRoutes.get("/ai-actions/company-status", isAuth, AiActionsController.companyStatus);
aiActionsRoutes.post("/ai-actions/company/pause", isAuth, AiActionsController.companyPause);
aiActionsRoutes.post("/ai-actions/company/disable", isAuth, AiActionsController.companyDisable);
aiActionsRoutes.post("/ai-actions/company/resume", isAuth, AiActionsController.companyResume);

export default aiActionsRoutes;
