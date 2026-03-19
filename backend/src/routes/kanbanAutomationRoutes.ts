import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as KanbanAutomationController from "../controllers/KanbanAutomationController";

const kanbanAutomationRoutes = Router();

kanbanAutomationRoutes.post(
    "/kanban-automations",
    isAuth,
    KanbanAutomationController.store
);

kanbanAutomationRoutes.get(
    "/kanban-automations",
    isAuth,
    KanbanAutomationController.index
);

kanbanAutomationRoutes.put(
    "/kanban-automations/:id",
    isAuth,
    KanbanAutomationController.update
);

kanbanAutomationRoutes.get(
    "/kanban-automations/:id/runs",
    isAuth,
    KanbanAutomationController.runs
);

kanbanAutomationRoutes.get(
    "/kanban-automations/:id",
    isAuth,
    KanbanAutomationController.show
);

kanbanAutomationRoutes.get(
    "/kanban-automation-runs/:runId",
    isAuth,
    KanbanAutomationController.showRun
);

kanbanAutomationRoutes.delete(
    "/kanban-automations/:id",
    isAuth,
    KanbanAutomationController.remove
);

export default kanbanAutomationRoutes;
