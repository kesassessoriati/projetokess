import express from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import requireWebphonePlan from "../middleware/requireWebphonePlan";
import * as CallProviderSettingsController from "../controllers/CallProviderSettingsController";

const callProviderSettingRoutes = express.Router();

callProviderSettingRoutes.get("/call-providers/settings", isAuth, requireWebphonePlan, CallProviderSettingsController.show);
callProviderSettingRoutes.put("/call-providers/settings", isAuth, isAdmin, requireWebphonePlan, CallProviderSettingsController.update);
callProviderSettingRoutes.post("/call-providers/start", isAuth, requireWebphonePlan, CallProviderSettingsController.start);

export default callProviderSettingRoutes;
