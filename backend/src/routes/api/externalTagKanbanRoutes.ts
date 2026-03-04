import { Router, Request, Response, NextFunction } from "express";
import isAuthExternal from "../../middleware/isAuthExternal";
import * as ExternalTagKanbanController from "../../controllers/api/ExternalTagKanbanController";

const deprecationWarning = (_req: Request, res: Response, next: NextFunction): void => {
  res.set("X-Deprecated", "true");
  res.set("X-Deprecated-Message", "Use /api/external/pipelines instead of /api/external/tags-kanban");
  next();
};

const externalTagKanbanRoutes = Router();

externalTagKanbanRoutes.get(
  "/tags-kanban",
  isAuthExternal,
  deprecationWarning,
  ExternalTagKanbanController.index
);

externalTagKanbanRoutes.get(
  "/tags-kanban/:id",
  isAuthExternal,
  deprecationWarning,
  ExternalTagKanbanController.show
);

externalTagKanbanRoutes.post(
  "/tags-kanban",
  isAuthExternal,
  deprecationWarning,
  ExternalTagKanbanController.store
);

externalTagKanbanRoutes.put(
  "/tags-kanban/:id",
  isAuthExternal,
  deprecationWarning,
  ExternalTagKanbanController.update
);

externalTagKanbanRoutes.delete(
  "/tags-kanban/:id",
  isAuthExternal,
  deprecationWarning,
  ExternalTagKanbanController.remove
);

export default externalTagKanbanRoutes;
