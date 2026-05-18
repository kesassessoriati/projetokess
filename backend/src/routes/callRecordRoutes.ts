import express from "express";
import isAuth from "../middleware/isAuth";
import requireWebphonePlan from "../middleware/requireWebphonePlan";
import * as CallRecordController from "../controllers/CallRecordController";

const callRecordRoutes = express.Router();

callRecordRoutes.get("/call-records", isAuth, requireWebphonePlan, CallRecordController.index);
callRecordRoutes.get("/call-records/summary", isAuth, requireWebphonePlan, CallRecordController.summary);
callRecordRoutes.get("/call-records/:id", isAuth, requireWebphonePlan, CallRecordController.show);
callRecordRoutes.post("/call-records", isAuth, requireWebphonePlan, CallRecordController.store);
callRecordRoutes.put("/call-records/:id", isAuth, requireWebphonePlan, CallRecordController.update);
callRecordRoutes.delete("/call-records/:id", isAuth, requireWebphonePlan, CallRecordController.destroy);

export default callRecordRoutes;
