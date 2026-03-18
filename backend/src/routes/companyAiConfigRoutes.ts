import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as CompanyAIConfigController from "../controllers/CompanyAIConfigController";

const companyAiConfigRoutes = Router();

companyAiConfigRoutes.get(
  "/companies/:companyId/ai-config",
  isAuth,
  CompanyAIConfigController.show
);

companyAiConfigRoutes.put(
  "/companies/:companyId/ai-config",
  isAuth,
  CompanyAIConfigController.update
);

export default companyAiConfigRoutes;
