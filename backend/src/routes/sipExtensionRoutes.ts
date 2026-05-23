import express from "express";
import isAuth from "../middleware/isAuth";
import requireWebphonePlan from "../middleware/requireWebphonePlan";
import * as SipExtensionController from "../controllers/SipExtensionController";

const sipExtensionRoutes = express.Router();

sipExtensionRoutes.get("/sip-extensions", isAuth, requireWebphonePlan, SipExtensionController.index);
sipExtensionRoutes.post("/sip-extensions", isAuth, requireWebphonePlan, SipExtensionController.store);
sipExtensionRoutes.put("/sip-extensions/:id", isAuth, requireWebphonePlan, SipExtensionController.update);
sipExtensionRoutes.delete("/sip-extensions/:id", isAuth, requireWebphonePlan, SipExtensionController.destroy);

export default sipExtensionRoutes;