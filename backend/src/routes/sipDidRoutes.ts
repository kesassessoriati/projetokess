import express from "express";
import isAuth from "../middleware/isAuth";
import requireWebphonePlan from "../middleware/requireWebphonePlan";
import * as SipDidController from "../controllers/SipDidController";

const sipDidRoutes = express.Router();

sipDidRoutes.get("/sip-dids", isAuth, requireWebphonePlan, SipDidController.index);
sipDidRoutes.post("/sip-dids", isAuth, requireWebphonePlan, SipDidController.store);
sipDidRoutes.put("/sip-dids/:id", isAuth, requireWebphonePlan, SipDidController.update);
sipDidRoutes.delete("/sip-dids/:id", isAuth, requireWebphonePlan, SipDidController.destroy);

export default sipDidRoutes;