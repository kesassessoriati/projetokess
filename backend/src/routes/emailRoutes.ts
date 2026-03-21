import express from "express";
import { sendCrmEmail, sendLeadEmail } from "../controllers/EmailController";
import isAuth from "../middleware/isAuth";
import multer from "multer";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

// Multer com limite de 10 MB por arquivo para anexos de email
const uploadEmail = multer({
  ...uploadConfig,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }
});

const emailRoutes = express.Router();

emailRoutes.post("/send-crm-email", isAuth, sendCrmEmail);
emailRoutes.post("/send-lead-email", isAuth, uploadEmail.array("attachments", 10), sendLeadEmail);

export default emailRoutes;
