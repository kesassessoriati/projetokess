import express from "express";
import isAuth from "../middleware/isAuth";
import requireWebphonePlan from "../middleware/requireWebphonePlan";
import * as SipDidRouteController from "../controllers/SipDidRouteController";

const sipDidRouteRoutes = express.Router();

sipDidRouteRoutes.get("/sip-routes", isAuth, requireWebphonePlan, SipDidRouteController.index);
sipDidRouteRoutes.post("/sip-routes", isAuth, requireWebphonePlan, SipDidRouteController.store);
sipDidRouteRoutes.put("/sip-routes/:id", isAuth, requireWebphonePlan, SipDidRouteController.update);
sipDidRouteRoutes.delete("/sip-routes/:id", isAuth, requireWebphonePlan, SipDidRouteController.destroy);

export default sipDidRouteRoutes;