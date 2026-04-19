import express from "express";
import isAuth from "../middleware/isAuth";
import * as CallSequenceController from "../controllers/CallSequenceController";

const callSequenceRoutes = express.Router();

callSequenceRoutes.get("/call-sequences", isAuth, CallSequenceController.index);
callSequenceRoutes.get("/call-sequences/:id", isAuth, CallSequenceController.show);
callSequenceRoutes.post("/call-sequences", isAuth, CallSequenceController.store);
callSequenceRoutes.post("/call-sequences/:id/control", isAuth, CallSequenceController.control);
callSequenceRoutes.post("/call-sequences/:id/targets/:targetId", isAuth, CallSequenceController.updateTarget);

export default callSequenceRoutes;
