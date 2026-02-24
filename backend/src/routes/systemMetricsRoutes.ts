import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as SystemMetricsController from "../controllers/SystemMetricsController";

const systemMetricsRoutes = Router();

// Endpoints protegidos para visualização de métricas globais do sistema
systemMetricsRoutes.get("/system-metrics", isAuth, SystemMetricsController.index);

export default systemMetricsRoutes;
