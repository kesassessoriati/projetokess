import express from "express";
import multer from "multer";

import uploadConfig from "../../config/upload";
import isAuthExternal from "../../middleware/isAuthExternal";
import * as ApiController from "../../controllers/ApiController";

const upload = multer(uploadConfig);
const externalMessageRoutes = express.Router();

externalMessageRoutes.post(
  "/messages/send",
  isAuthExternal,
  upload.array("medias"),
  ApiController.index
);

externalMessageRoutes.post(
  "/messages/send/linkImage",
  isAuthExternal,
  ApiController.indexImage
);

externalMessageRoutes.post(
  "/messages/check-number",
  isAuthExternal,
  ApiController.checkNumber
);

export default externalMessageRoutes;
