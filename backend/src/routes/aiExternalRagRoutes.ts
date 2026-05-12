import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as Controller from "../controllers/AiExternalRagController";

const routes = Router();

routes.get("/ai-agents/external/rag/:base", isAuth, Controller.index);
routes.post("/ai-agents/external/rag/:base", isAuth, Controller.store);
routes.post("/ai-agents/external/rag/:base/search", isAuth, Controller.search);
routes.delete("/ai-agents/external/rag/:base/:id", isAuth, Controller.remove);

export default routes;
