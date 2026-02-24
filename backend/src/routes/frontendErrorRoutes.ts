import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as FrontendErrorController from "../controllers/FrontendErrorController";

const frontendErrorRoutes = Router();

// Endpoint público para capturar erros do frontend
frontendErrorRoutes.post("/frontend-errors", FrontendErrorController.store);

// Endpoints protegidos para visualização e gestão
frontendErrorRoutes.get("/frontend-errors", isAuth, FrontendErrorController.index);
frontendErrorRoutes.put("/frontend-errors/:errorId", isAuth, FrontendErrorController.update);

export default frontendErrorRoutes;
