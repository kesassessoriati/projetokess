import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import isAuth from "../middleware/isAuth";
import requireWebphonePlan from "../middleware/requireWebphonePlan";
import uploadConfig from "../config/upload";
import * as CallRecordingController from "../controllers/CallRecordingController";

const callRecordingRoutes = express.Router();

const uploadCallRecording = multer({
  storage: multer.diskStorage({
    destination: (req: any, _file, cb) => {
      const companyId = req.user?.companyId;
      const folder = path.resolve(uploadConfig.directory, `company${companyId}`, "call-recordings");

      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        fs.chmodSync(folder, 0o777);
      }

      cb(null, folder);
    },
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${safeName}`);
    }
  })
});

callRecordingRoutes.get("/call-recordings", isAuth, requireWebphonePlan, CallRecordingController.index);
callRecordingRoutes.post("/call-recordings", isAuth, requireWebphonePlan, CallRecordingController.store);
callRecordingRoutes.post("/call-recordings/upload", isAuth, requireWebphonePlan, uploadCallRecording.single("file"), CallRecordingController.upload);
callRecordingRoutes.delete("/call-recordings/:id", isAuth, requireWebphonePlan, CallRecordingController.remove);

export default callRecordingRoutes;
