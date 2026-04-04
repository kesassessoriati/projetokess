import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as PipelineController from "../controllers/PipelineController";
import * as OpportunityController from "../controllers/OpportunityController";
import * as ExecutiveController from "../controllers/ExecutiveController";

const pipelineRoutes = Router();

// Pipelines
pipelineRoutes.get("/pipelines", isAuth, PipelineController.index);
pipelineRoutes.post("/pipelines", isAuth, PipelineController.store);
pipelineRoutes.put("/pipelines/:id", isAuth, PipelineController.update);
pipelineRoutes.get("/pipelines/:id/board", isAuth, PipelineController.board);
pipelineRoutes.get("/pipelines/:id/metrics", isAuth, PipelineController.metrics);
pipelineRoutes.delete("/pipelines/:id", isAuth, PipelineController.remove);

// Stages management
pipelineRoutes.put("/pipelines/:id/stages/sort", isAuth, PipelineController.updateStageOrder);
pipelineRoutes.post("/pipelines/:id/stages", isAuth, PipelineController.storeStage);
pipelineRoutes.put("/pipelines/stages/:stageId", isAuth, PipelineController.updateStage);
pipelineRoutes.delete("/pipelines/stages/:stageId", isAuth, PipelineController.deleteStage);

pipelineRoutes.get("/executive/dashboard", isAuth, ExecutiveController.index);

// Opportunities
pipelineRoutes.get("/opportunities", isAuth, OpportunityController.index);
pipelineRoutes.post("/opportunities", isAuth, OpportunityController.store);
pipelineRoutes.get("/opportunities/:id", isAuth, OpportunityController.show);
pipelineRoutes.put("/opportunities/:id", isAuth, OpportunityController.update);
pipelineRoutes.delete("/opportunities/:id", isAuth, OpportunityController.remove);
pipelineRoutes.post("/opportunities/:id/move", isAuth, OpportunityController.move);
pipelineRoutes.post("/opportunities/:id/feedback", isAuth, OpportunityController.feedback);
pipelineRoutes.post("/opportunities/:id/events", isAuth, OpportunityController.addEvent);
pipelineRoutes.get("/opportunities/:id/events", isAuth, OpportunityController.listEvents);
pipelineRoutes.put("/opportunities/events/:eventId", isAuth, OpportunityController.updateEvent);
pipelineRoutes.delete("/opportunities/events/:eventId", isAuth, OpportunityController.removeEvent);

export default pipelineRoutes;
