import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as PipelineController from "../controllers/PipelineController";
import * as OpportunityController from "../controllers/OpportunityController";
import * as ExecutiveController from "../controllers/ExecutiveController";

const pipelineRoutes = Router();

// Pipelines
pipelineRoutes.get("/pipelines", isAuth, PipelineController.index);
pipelineRoutes.post("/pipelines", isAuth, PipelineController.store);
pipelineRoutes.get("/pipelines/:id/board", isAuth, PipelineController.board);
pipelineRoutes.get("/pipelines/:id/metrics", isAuth, PipelineController.metrics);

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
pipelineRoutes.post("/opportunities/:id/move", isAuth, OpportunityController.move);
pipelineRoutes.post("/opportunities/:id/feedback", isAuth, OpportunityController.feedback);

export default pipelineRoutes;
