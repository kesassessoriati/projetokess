import express from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import * as SipSettingController from "../controllers/SipSettingController";

const sipSettingRoutes = express.Router();

sipSettingRoutes.get("/sip-settings/runtime", isAuth, SipSettingController.runtime);
sipSettingRoutes.get("/sip-settings", isAuth, isAdmin, SipSettingController.index);
sipSettingRoutes.post("/sip-settings", isAuth, isAdmin, SipSettingController.store);
sipSettingRoutes.post("/sip-settings/test", isAuth, isAdmin, SipSettingController.test);

export default sipSettingRoutes;
