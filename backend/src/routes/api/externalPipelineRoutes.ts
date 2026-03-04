import { Router } from "express";
import isAuthExternal from "../../middleware/isAuthExternal";
import * as ExternalPipelineController from "../../controllers/api/ExternalPipelineController";

const externalPipelineRoutes = Router();

externalPipelineRoutes.get(
  "/pipelines",
  isAuthExternal,
  ExternalPipelineController.listPipelines
);

externalPipelineRoutes.get(
  "/pipelines/:id/board",
  isAuthExternal,
  ExternalPipelineController.getPipelineBoard
);

externalPipelineRoutes.get(
  "/opportunities",
  isAuthExternal,
  ExternalPipelineController.listOpportunities
);

externalPipelineRoutes.get(
  "/opportunities/:id",
  isAuthExternal,
  ExternalPipelineController.showOpportunity
);

externalPipelineRoutes.post(
  "/opportunities",
  isAuthExternal,
  ExternalPipelineController.createOpportunity
);

externalPipelineRoutes.put(
  "/opportunities/:id",
  isAuthExternal,
  ExternalPipelineController.updateOpportunity
);

externalPipelineRoutes.post(
  "/opportunities/:id/move",
  isAuthExternal,
  ExternalPipelineController.moveOpportunity
);

export default externalPipelineRoutes;
