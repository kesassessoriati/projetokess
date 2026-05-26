import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as Controller from "../controllers/AiExternalChatMemoryController";

const routes = Router();

routes.get("/ai-agents/external/chat-memory", isAuth, Controller.index);
routes.get("/ai-agents/external/chat-memory/:id", isAuth, Controller.show);
routes.delete("/ai-agents/external/chat-memory/company", isAuth, Controller.removeCompany);
routes.delete("/ai-agents/external/chat-memory/lead/:leadId", isAuth, Controller.removeByLead);
routes.delete("/ai-agents/external/chat-memory/session/:sessionId", isAuth, Controller.removeBySession);
routes.delete("/ai-agents/external/chat-memory/:id", isAuth, Controller.remove);

export default routes;
