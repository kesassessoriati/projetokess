import { Router, RequestHandler } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";
import * as MediaDriveController from "../controllers/MediaDriveController";

const mediaDriveRoutes = Router();
const upload = multer(uploadConfig);

mediaDriveRoutes.get("/media-folders", isAuth, MediaDriveController.listFolders as RequestHandler);
mediaDriveRoutes.post("/media-folders", isAuth, MediaDriveController.createFolder as RequestHandler);
mediaDriveRoutes.put("/media-folders/:folderId", isAuth, MediaDriveController.updateFolder as RequestHandler);
mediaDriveRoutes.delete("/media-folders/:folderId", isAuth, MediaDriveController.deleteFolder as RequestHandler);
mediaDriveRoutes.get("/media-folders/:folderId/files", isAuth, MediaDriveController.listFolderFiles as RequestHandler);
mediaDriveRoutes.post(
  "/media-folders/:folderId/files",
  isAuth,
  upload.array("files"),
  MediaDriveController.uploadFiles as RequestHandler
);

mediaDriveRoutes.get("/media-files", isAuth, MediaDriveController.listFiles as RequestHandler);
mediaDriveRoutes.put("/media-files/:fileId", isAuth, MediaDriveController.updateFile as RequestHandler);
mediaDriveRoutes.delete("/media-files/:fileId", isAuth, MediaDriveController.deleteFile as RequestHandler);
mediaDriveRoutes.get("/media-files/:fileId/download", isAuth, MediaDriveController.downloadFile as RequestHandler);

export default mediaDriveRoutes;
