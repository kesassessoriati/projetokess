import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as OfficialBroadcastController from "../controllers/OfficialBroadcastController";

const officialBroadcastRoutes = Router();

officialBroadcastRoutes.get("/official-dispatch/connections", isAuth, OfficialBroadcastController.listConnections);
officialBroadcastRoutes.get("/official-dispatch/overview", isAuth, OfficialBroadcastController.overview);
officialBroadcastRoutes.get(
  "/official-dispatch/connections/:whatsappId/verification",
  isAuth,
  OfficialBroadcastController.verification
);
officialBroadcastRoutes.post(
  "/official-dispatch/connections/:whatsappId/templates/sync",
  isAuth,
  OfficialBroadcastController.syncTemplates
);
officialBroadcastRoutes.get(
  "/official-dispatch/connections/:whatsappId/templates",
  isAuth,
  OfficialBroadcastController.indexTemplates
);
officialBroadcastRoutes.post(
  "/official-dispatch/connections/:whatsappId/templates",
  isAuth,
  OfficialBroadcastController.storeTemplate
);
officialBroadcastRoutes.put(
  "/official-dispatch/connections/:whatsappId/templates/:templateId",
  isAuth,
  OfficialBroadcastController.updateTemplate
);
officialBroadcastRoutes.delete(
  "/official-dispatch/connections/:whatsappId/templates/:templateId",
  isAuth,
  OfficialBroadcastController.removeTemplate
);

officialBroadcastRoutes.post("/official-dispatch/campaigns/preview", isAuth, OfficialBroadcastController.previewPayload);
officialBroadcastRoutes.get("/official-dispatch/campaigns", isAuth, OfficialBroadcastController.indexCampaigns);
officialBroadcastRoutes.get("/official-dispatch/campaigns/:id", isAuth, OfficialBroadcastController.showCampaign);
officialBroadcastRoutes.post("/official-dispatch/campaigns", isAuth, OfficialBroadcastController.storeCampaign);
officialBroadcastRoutes.put("/official-dispatch/campaigns/:id", isAuth, OfficialBroadcastController.updateCampaign);
officialBroadcastRoutes.delete("/official-dispatch/campaigns/:id", isAuth, OfficialBroadcastController.removeCampaign);
officialBroadcastRoutes.post("/official-dispatch/campaigns/:id/start", isAuth, OfficialBroadcastController.startCampaign);
officialBroadcastRoutes.post("/official-dispatch/campaigns/:id/pause", isAuth, OfficialBroadcastController.pauseCampaign);
officialBroadcastRoutes.post("/official-dispatch/campaigns/:id/resume", isAuth, OfficialBroadcastController.resumeCampaign);
officialBroadcastRoutes.post("/official-dispatch/campaigns/:id/cancel", isAuth, OfficialBroadcastController.cancelCampaign);

export default officialBroadcastRoutes;
