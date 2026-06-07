import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as InternalAgentContextController from "../controllers/InternalAgentContextController";

const internalAgentContextRoutes = Router();

internalAgentContextRoutes.get(
  "/internal-agent/context",
  isAuth,
  InternalAgentContextController.getContext
);

internalAgentContextRoutes.post(
  "/internal-agent/memory",
  isAuth,
  InternalAgentContextController.saveMemory
);

internalAgentContextRoutes.delete(
  "/internal-agent/memory/:id",
  isAuth,
  InternalAgentContextController.deleteMemory
);

export default internalAgentContextRoutes;
