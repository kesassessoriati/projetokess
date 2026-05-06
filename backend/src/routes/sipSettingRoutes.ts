import express from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import requireWebphonePlan from "../middleware/requireWebphonePlan";
import * as SipSettingController from "../controllers/SipSettingController";

const sipSettingRoutes = express.Router();

sipSettingRoutes.get("/sip-settings/runtime", isAuth, requireWebphonePlan, SipSettingController.runtime);
sipSettingRoutes.get("/sip-settings", isAuth, isAdmin, requireWebphonePlan, SipSettingController.index);
sipSettingRoutes.post("/sip-settings", isAuth, isAdmin, requireWebphonePlan, SipSettingController.store);
sipSettingRoutes.post("/sip-settings/test", isAuth, isAdmin, requireWebphonePlan, SipSettingController.test);

export default sipSettingRoutes;
