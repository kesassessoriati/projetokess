import express from "express";
import isAuth from "../middleware/isAuth";
import requireWebphonePlan from "../middleware/requireWebphonePlan";
import * as SipCallLogController from "../controllers/SipCallLogController";

const sipCallLogRoutes = express.Router();

sipCallLogRoutes.get("/sip-call-logs", isAuth, requireWebphonePlan, SipCallLogController.index);

export default sipCallLogRoutes;