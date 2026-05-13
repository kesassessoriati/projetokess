import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import * as Controller from "../controllers/AiExternalRagController";

const routes = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

routes.get("/ai-agents/external/rag/:base", isAuth, Controller.index);
routes.post("/ai-agents/external/rag/:base", isAuth, Controller.store);
routes.post("/ai-agents/external/rag/:base/upload", isAuth, upload.single("file"), Controller.upload);
routes.post("/ai-agents/external/rag/:base/search", isAuth, Controller.search);
routes.delete("/ai-agents/external/rag/:base/:id", isAuth, Controller.remove);

export default routes;
