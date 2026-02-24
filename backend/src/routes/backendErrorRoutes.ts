import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as BackendErrorController from "../controllers/BackendErrorController";

const backendErrorRoutes = Router();

// Endpoints protegidos para visualização e gestão de erros do backend
backendErrorRoutes.get("/backend-errors", isAuth, BackendErrorController.index);
backendErrorRoutes.put("/backend-errors/:errorId", isAuth, BackendErrorController.update);

export default backendErrorRoutes;
