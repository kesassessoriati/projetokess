import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as AiExternalAgentController from "../controllers/AiExternalAgentController";

const aiExternalAgentRoutes = Router();

aiExternalAgentRoutes.get(
  "/ai-agents/external/config",
  isAuth,
  AiExternalAgentController.showConfig
);

aiExternalAgentRoutes.put(
  "/ai-agents/external/config",
  isAuth,
  AiExternalAgentController.updateConfig
);

aiExternalAgentRoutes.get(
  "/ai-agents/external/prompt/versions",
  isAuth,
  AiExternalAgentController.listPromptVersions
);

aiExternalAgentRoutes.post(
  "/ai-agents/external/prompt/versions",
  isAuth,
  AiExternalAgentController.createPromptVersion
);

aiExternalAgentRoutes.post(
  "/ai-agents/external/prompt/versions/:versionId/restore",
  isAuth,
  AiExternalAgentController.restorePromptVersion
);

aiExternalAgentRoutes.get(
  "/ai-agents/external/events",
  isAuth,
  AiExternalAgentController.listEvents
);

export default aiExternalAgentRoutes;
