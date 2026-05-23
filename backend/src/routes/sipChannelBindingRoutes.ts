import express from "express";
import isAuth from "../middleware/isAuth";
import requireWebphonePlan from "../middleware/requireWebphonePlan";
import * as SipChannelBindingController from "../controllers/SipChannelBindingController";

const sipChannelBindingRoutes = express.Router();

sipChannelBindingRoutes.get("/sip-channel-bindings", isAuth, requireWebphonePlan, SipChannelBindingController.index);
sipChannelBindingRoutes.post("/sip-channel-bindings", isAuth, requireWebphonePlan, SipChannelBindingController.store);
sipChannelBindingRoutes.put("/sip-channel-bindings/:id", isAuth, requireWebphonePlan, SipChannelBindingController.update);
sipChannelBindingRoutes.delete("/sip-channel-bindings/:id", isAuth, requireWebphonePlan, SipChannelBindingController.destroy);

export default sipChannelBindingRoutes;