import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as ButtonCampaignController from "../controllers/ButtonCampaignController";

const buttonCampaignRoutes = Router();

buttonCampaignRoutes.get("/button-campaigns", isAuth, ButtonCampaignController.index);
buttonCampaignRoutes.get("/button-campaigns/:id", isAuth, ButtonCampaignController.show);
buttonCampaignRoutes.post("/button-campaigns", isAuth, ButtonCampaignController.store);
buttonCampaignRoutes.put("/button-campaigns/:id", isAuth, ButtonCampaignController.update);
buttonCampaignRoutes.delete("/button-campaigns/:id", isAuth, ButtonCampaignController.remove);
buttonCampaignRoutes.post("/button-campaigns/:id/start", isAuth, ButtonCampaignController.start);
buttonCampaignRoutes.post("/button-campaigns/:id/cancel", isAuth, ButtonCampaignController.cancel);

export default buttonCampaignRoutes;
