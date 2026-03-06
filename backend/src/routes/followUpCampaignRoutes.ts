import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as FollowUpCampaignController from "../controllers/FollowUpCampaignController";

const followUpCampaignRoutes = Router();

followUpCampaignRoutes.get("/follow-up-campaigns", isAuth, FollowUpCampaignController.index);
followUpCampaignRoutes.get("/follow-up-campaigns/:id", isAuth, FollowUpCampaignController.show);
followUpCampaignRoutes.post("/follow-up-campaigns", isAuth, FollowUpCampaignController.store);
followUpCampaignRoutes.put("/follow-up-campaigns/:id", isAuth, FollowUpCampaignController.update);
followUpCampaignRoutes.delete("/follow-up-campaigns/:id", isAuth, FollowUpCampaignController.remove);
followUpCampaignRoutes.get("/follow-up-campaigns/:id/stats", isAuth, FollowUpCampaignController.stats);

export default followUpCampaignRoutes;
