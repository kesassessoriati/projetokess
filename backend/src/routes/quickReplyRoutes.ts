import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import * as QuickReplyController from "../controllers/QuickReplyController";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

const quickReplyRoutes = Router();

quickReplyRoutes.get("/quick-replies", isAuth, QuickReplyController.index);
quickReplyRoutes.get("/quick-replies/:id/media", isAuth, QuickReplyController.mediaShow);
quickReplyRoutes.post("/quick-replies", isAuth, QuickReplyController.store);
quickReplyRoutes.put("/quick-replies/:id", isAuth, QuickReplyController.update);
quickReplyRoutes.post("/quick-replies/:id/media", isAuth, upload.single("media"), QuickReplyController.mediaUpload);
quickReplyRoutes.delete("/quick-replies/:id", isAuth, QuickReplyController.remove);

export default quickReplyRoutes;
