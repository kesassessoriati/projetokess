import express from "express";
import isAuth from "../middleware/isAuth";
import * as CrmAiController from "../controllers/CrmAiController";

const crmAiRoutes = express.Router();

crmAiRoutes.get("/crm-ai/credits", isAuth, CrmAiController.credits);
crmAiRoutes.post("/crm-ai/chat", isAuth, CrmAiController.chat);
crmAiRoutes.post("/crm-ai/action", isAuth, CrmAiController.action);

export default crmAiRoutes;
