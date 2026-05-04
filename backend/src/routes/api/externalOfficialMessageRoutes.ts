import express from "express";
import multer from "multer";

import uploadConfig from "../../config/upload";
import isAuthExternal from "../../middleware/isAuthExternal";
import * as ExternalOfficialMessageController from "../../controllers/api/ExternalOfficialMessageController";

const upload = multer(uploadConfig);
const externalOfficialMessageRoutes = express.Router();

externalOfficialMessageRoutes.post(
  "/official/messages/send",
  isAuthExternal,
  upload.array("medias"),
  ExternalOfficialMessageController.send
);

externalOfficialMessageRoutes.post(
  "/official/messages/send-template",
  isAuthExternal,
  ExternalOfficialMessageController.sendTemplate
);

export default externalOfficialMessageRoutes;
