import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as BackendMetricsController from "../controllers/BackendMetricsController";

const performanceRoutes = Router();

// Endpoints protegidos para visualização de métricas de performance técnica do backend
performanceRoutes.get("/admin/performance", isAuth, BackendMetricsController.index);

export default performanceRoutes;
