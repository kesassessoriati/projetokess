import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as Controller from "../controllers/AiExternalReminderController";

const routes = Router();

routes.get("/ai-agents/external/reminders", isAuth, Controller.index);
routes.post("/ai-agents/external/reminders", isAuth, Controller.store);
routes.post("/ai-agents/external/reminders/:id/send-now", isAuth, Controller.sendNow);
routes.post("/ai-agents/external/reminders/:id/send-group", isAuth, Controller.sendGroup);
routes.put("/ai-agents/external/reminders/:id", isAuth, Controller.update);
routes.delete("/ai-agents/external/reminders/:id", isAuth, Controller.remove);

export default routes;
