import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as MetaMarketingCampaignPilotController from "../controllers/MetaMarketingCampaignPilotController";

const metaMarketingCampaignPilotRoutes = Router();

metaMarketingCampaignPilotRoutes.post("/meta-marketing/campaign-pilot/preflight", isAuth, MetaMarketingCampaignPilotController.preflight);
metaMarketingCampaignPilotRoutes.post("/meta-marketing/campaign-pilot/requests", isAuth, MetaMarketingCampaignPilotController.request);
metaMarketingCampaignPilotRoutes.get("/meta-marketing/campaign-pilot/requests/:requestId", isAuth, MetaMarketingCampaignPilotController.show);
metaMarketingCampaignPilotRoutes.post("/meta-marketing/campaign-pilot/requests/:requestId/execute", isAuth, MetaMarketingCampaignPilotController.execute);

export default metaMarketingCampaignPilotRoutes;
