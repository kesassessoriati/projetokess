import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as Controller from "../controllers/AiExternalSystemPromptAiController";

const aiExternalSystemPromptAiRoutes = Router();

aiExternalSystemPromptAiRoutes.get(
  "/ai-agents/external/system-prompt/templates",
  isAuth,
  Controller.templates
);

aiExternalSystemPromptAiRoutes.post(
  "/ai-agents/external/system-prompt/analyze",
  isAuth,
  Controller.analyze
);

aiExternalSystemPromptAiRoutes.post(
  "/ai-agents/external/system-prompt/improve",
  isAuth,
  Controller.improve
);

aiExternalSystemPromptAiRoutes.post(
  "/ai-agents/external/system-prompt/examples-from-memory",
  isAuth,
  Controller.examplesFromMemory
);

export default aiExternalSystemPromptAiRoutes;
