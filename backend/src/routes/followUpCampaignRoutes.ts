import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import * as FollowUpCampaignController from "../controllers/FollowUpCampaignController";
import uploadConfig from "../config/upload";

const followUpCampaignRoutes = Router();
const upload = multer(uploadConfig);

followUpCampaignRoutes.get("/follow-up-campaigns/stats/overview", isAuth, FollowUpCampaignController.overviewStats);
followUpCampaignRoutes.get("/follow-up-boards", isAuth, FollowUpCampaignController.indexBoards);
followUpCampaignRoutes.post("/follow-up-boards", isAuth, FollowUpCampaignController.storeBoard);
followUpCampaignRoutes.put("/follow-up-boards/:id", isAuth, FollowUpCampaignController.updateBoard);
followUpCampaignRoutes.delete("/follow-up-boards/:id", isAuth, FollowUpCampaignController.removeBoard);
followUpCampaignRoutes.get("/follow-up-campaigns", isAuth, FollowUpCampaignController.index);
followUpCampaignRoutes.post("/follow-up-campaigns/upload", isAuth, upload.single("file"), FollowUpCampaignController.uploadMedia);
followUpCampaignRoutes.post("/follow-up-campaigns/test", isAuth, FollowUpCampaignController.test);
followUpCampaignRoutes.get("/follow-up-campaigns/:id", isAuth, FollowUpCampaignController.show);
followUpCampaignRoutes.post("/follow-up-campaigns", isAuth, FollowUpCampaignController.store);
followUpCampaignRoutes.put("/follow-up-campaigns/:id", isAuth, FollowUpCampaignController.update);
followUpCampaignRoutes.delete("/follow-up-campaigns/:id", isAuth, FollowUpCampaignController.remove);
followUpCampaignRoutes.get("/follow-up-campaigns/:id/stats", isAuth, FollowUpCampaignController.stats);

export default followUpCampaignRoutes;
