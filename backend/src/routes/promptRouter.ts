import { Router } from "express";
import * as PromptController from "../controllers/PromptController";
import isAuth from "../middleware/isAuth";


const promptRoutes = Router();

promptRoutes.get("/prompt", isAuth, PromptController.index);

promptRoutes.post("/prompt", isAuth, PromptController.store);
promptRoutes.post("/prompt/:promptId/duplicate", isAuth, PromptController.duplicate);
promptRoutes.get("/prompt/:promptId/metrics", isAuth, PromptController.metrics);
promptRoutes.patch("/prompt/:promptId/channel-binding/toggle", isAuth, PromptController.toggleBinding);

promptRoutes.get("/prompt/:promptId", isAuth, PromptController.show);

promptRoutes.put("/prompt/:promptId", isAuth, PromptController.update);

promptRoutes.delete("/prompt/:promptId", isAuth, PromptController.remove);

export default promptRoutes;
