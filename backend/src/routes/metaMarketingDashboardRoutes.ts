import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as MetaMarketingDashboardController from "../controllers/MetaMarketingDashboardController";

const metaMarketingDashboardRoutes = Router();

metaMarketingDashboardRoutes.get("/meta-marketing/dashboard", isAuth, MetaMarketingDashboardController.dashboard);

export default metaMarketingDashboardRoutes;
