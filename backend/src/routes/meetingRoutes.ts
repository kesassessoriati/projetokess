import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";
import * as MeetingController from "../controllers/MeetingController";

const meetingRoutes = express.Router();

const uploadMeeting = multer({
  storage: multer.diskStorage({
    destination: (req: any, _file, cb) => {
      const companyId = req.user?.companyId;
      const folder = path.resolve(uploadConfig.directory, `company${companyId}`, "meetings");
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
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB max
});

meetingRoutes.get("/meetings", isAuth, MeetingController.index);
meetingRoutes.get("/meetings/:id", isAuth, MeetingController.show);
meetingRoutes.post("/meetings/upload", isAuth, uploadMeeting.single("video"), MeetingController.upload);
meetingRoutes.put("/meetings/:id", isAuth, MeetingController.update);
meetingRoutes.post("/meetings/:id/reprocess", isAuth, MeetingController.reprocess);
meetingRoutes.delete("/meetings/:id", isAuth, MeetingController.remove);

export default meetingRoutes;
