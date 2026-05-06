import express from "express";
import isAuth from "../middleware/isAuth";
import requireWebphonePlan from "../middleware/requireWebphonePlan";
import * as CallSequenceController from "../controllers/CallSequenceController";

const callSequenceRoutes = express.Router();

callSequenceRoutes.get("/call-sequences", isAuth, requireWebphonePlan, CallSequenceController.index);
callSequenceRoutes.get("/call-sequences/:id", isAuth, requireWebphonePlan, CallSequenceController.show);
callSequenceRoutes.post("/call-sequences", isAuth, requireWebphonePlan, CallSequenceController.store);
callSequenceRoutes.post("/call-sequences/:id/control", isAuth, requireWebphonePlan, CallSequenceController.control);
callSequenceRoutes.post("/call-sequences/:id/targets/:targetId", isAuth, requireWebphonePlan, CallSequenceController.updateTarget);

export default callSequenceRoutes;
