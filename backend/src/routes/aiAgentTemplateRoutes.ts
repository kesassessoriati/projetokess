import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as AIAgentTemplateController from "../controllers/AIAgentTemplateController";

const aiAgentTemplateRoutes = Router();

aiAgentTemplateRoutes.get(
  "/ai-agent-templates",
  isAuth,
  AIAgentTemplateController.index
);

export default aiAgentTemplateRoutes;
