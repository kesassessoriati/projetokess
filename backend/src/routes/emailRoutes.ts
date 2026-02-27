import express from "express";
import { sendCrmEmail, sendLeadEmail } from "../controllers/EmailController";
import isAuth from "../middleware/isAuth";
import multer from "multer";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

const emailRoutes = express.Router();

emailRoutes.post("/send-crm-email", sendCrmEmail);
emailRoutes.post("/send-lead-email", isAuth, upload.array("files"), sendLeadEmail);

export default emailRoutes;
