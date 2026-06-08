import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as Controller from "../controllers/AiExternalFollowUpController";

const routes = Router();

routes.get("/ai-agents/external/follow-ups", isAuth, Controller.index);
routes.post("/ai-agents/external/follow-ups/mark", isAuth, Controller.mark);
routes.post("/ai-agents/external/follow-ups/process", isAuth, Controller.process);
routes.get("/ai-agents/external/follow-ups/config", isAuth, Controller.showConfig);
routes.put("/ai-agents/external/follow-ups/config", isAuth, Controller.updateConfig);
routes.get("/ai-agents/external/follow-ups/logs", isAuth, Controller.logs);
routes.post("/ai-agents/external/follow-ups/logs/:logId/retry", isAuth, Controller.retry);

export default routes;
