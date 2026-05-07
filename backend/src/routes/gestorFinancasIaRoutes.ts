import { Router } from "express";
import isAuth from "../middleware/isAuth";
import requireGestorFinancasIaPlan from "../middleware/requireGestorFinancasIaPlan";
import * as GestorFinancasIaController from "../controllers/GestorFinancasIaController";

const gestorFinancasIaRoutes = Router();

gestorFinancasIaRoutes.get(
  "/gestor-financas-ia/me",
  isAuth,
  requireGestorFinancasIaPlan,
  GestorFinancasIaController.me
);

gestorFinancasIaRoutes.post(
  "/gestor-financas-ia/:resource/query",
  isAuth,
  requireGestorFinancasIaPlan,
  GestorFinancasIaController.query
);

export default gestorFinancasIaRoutes;
