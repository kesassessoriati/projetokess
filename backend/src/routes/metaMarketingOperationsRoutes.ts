import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as MetaMarketingOperationsController from "../controllers/MetaMarketingOperationsController";

const metaMarketingOperationsRoutes = Router();

metaMarketingOperationsRoutes.get("/meta-marketing/operations", isAuth, MetaMarketingOperationsController.show);

export default metaMarketingOperationsRoutes;
