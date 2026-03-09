import fs from "fs";
import path from "path";
import multer from "multer";
import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as MySiteBoardController from "../controllers/MySiteBoardController";

const uploadsRoot = path.resolve(__dirname, "..", "..", "public");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const companyId = req.user?.companyId;
    const cardId = req.params.cardId;
    const folder = path.resolve(uploadsRoot, `company${companyId}`, "mysites", String(cardId));
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}_${file.originalname}`.replace(/[^\w.\-]/g, "_");
    cb(null, safe);
  }
});

const upload = multer({ storage });
const mySiteBoardRoutes = Router();

mySiteBoardRoutes.get("/my-sites/board", isAuth, MySiteBoardController.board);

mySiteBoardRoutes.post("/my-sites/columns", isAuth, MySiteBoardController.createColumn);
mySiteBoardRoutes.put("/my-sites/columns/:id", isAuth, MySiteBoardController.updateColumn);
mySiteBoardRoutes.delete("/my-sites/columns/:id", isAuth, MySiteBoardController.deleteColumn);
mySiteBoardRoutes.post("/my-sites/columns/reorder", isAuth, MySiteBoardController.reorderColumns);

mySiteBoardRoutes.post("/my-sites/cards", isAuth, MySiteBoardController.createCard);
mySiteBoardRoutes.put("/my-sites/cards/:id", isAuth, MySiteBoardController.updateCard);
mySiteBoardRoutes.delete("/my-sites/cards/:id", isAuth, MySiteBoardController.deleteCard);
mySiteBoardRoutes.post("/my-sites/cards/:id/move", isAuth, MySiteBoardController.moveCard);

mySiteBoardRoutes.post("/my-sites/cards/:cardId/checklist", isAuth, MySiteBoardController.createChecklistItem);
mySiteBoardRoutes.put("/my-sites/checklist/:id", isAuth, MySiteBoardController.updateChecklistItem);
mySiteBoardRoutes.delete("/my-sites/checklist/:id", isAuth, MySiteBoardController.deleteChecklistItem);

mySiteBoardRoutes.post("/my-sites/cards/:cardId/comments", isAuth, MySiteBoardController.createComment);
mySiteBoardRoutes.delete("/my-sites/comments/:id", isAuth, MySiteBoardController.deleteComment);

mySiteBoardRoutes.post("/my-sites/cards/:cardId/attachments", isAuth, upload.single("file"), MySiteBoardController.uploadAttachment);
mySiteBoardRoutes.post("/my-sites/cards/:cardId/attachments/link", isAuth, MySiteBoardController.createAttachmentLink);
mySiteBoardRoutes.delete("/my-sites/attachments/:id", isAuth, MySiteBoardController.deleteAttachment);

export default mySiteBoardRoutes;

