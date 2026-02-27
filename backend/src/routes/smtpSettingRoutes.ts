import express from "express";
import isAuth from "../middleware/isAuth";
import * as SmtpSettingController from "../controllers/SmtpSettingController";

const smtpSettingRoutes = express.Router();

smtpSettingRoutes.get("/smtp", isAuth, SmtpSettingController.index);
smtpSettingRoutes.post("/smtp", isAuth, SmtpSettingController.store);

export default smtpSettingRoutes;
