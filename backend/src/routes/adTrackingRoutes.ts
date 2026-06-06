import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as AdTrackingController from "../controllers/AdTrackingController";

const adTrackingRoutes = Router();

adTrackingRoutes.get("/ad-tracking/:provider/config", isAuth, AdTrackingController.getConfig);
adTrackingRoutes.post("/ad-tracking/:provider/config", isAuth, AdTrackingController.saveConfig);
adTrackingRoutes.post("/ad-tracking/:provider/test", isAuth, AdTrackingController.testConnection);

adTrackingRoutes.get("/ad-tracking/:provider/mappings", isAuth, AdTrackingController.getMappings);
adTrackingRoutes.post("/ad-tracking/:provider/mappings", isAuth, AdTrackingController.createMapping);
adTrackingRoutes.put("/ad-tracking/:provider/mappings/:id", isAuth, AdTrackingController.updateMapping);
adTrackingRoutes.delete("/ad-tracking/:provider/mappings/:id", isAuth, AdTrackingController.deleteMapping);

adTrackingRoutes.get("/ad-tracking/:provider/events", isAuth, AdTrackingController.getEvents);

export default adTrackingRoutes;
