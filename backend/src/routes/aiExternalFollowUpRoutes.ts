import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as Controller from "../controllers/AiExternalFollowUpController";

const routes = Router();

routes.get("/ai-agents/external/follow-ups", isAuth, Controller.index);
routes.post("/ai-agents/external/follow-ups/mark", isAuth, Controller.mark);
routes.post("/ai-agents/external/follow-ups/process", isAuth, Controller.process);

export default routes;
