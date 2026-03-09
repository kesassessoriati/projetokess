import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as SocialController from "../controllers/SocialController";

const socialRoutes = Router();

socialRoutes.get("/social-boards", isAuth, SocialController.indexBoards);
socialRoutes.get("/social-boards/:id", isAuth, SocialController.showBoard);
socialRoutes.post("/social-boards", isAuth, SocialController.storeBoard);
socialRoutes.put("/social-boards/:id", isAuth, SocialController.updateBoard);
socialRoutes.delete("/social-boards/:id", isAuth, SocialController.deleteBoard);
socialRoutes.post("/social-boards/:id/duplicate", isAuth, SocialController.duplicateBoard);

socialRoutes.post("/social-contents", isAuth, SocialController.storeContent);
socialRoutes.put("/social-contents/:id", isAuth, SocialController.updateContent);
socialRoutes.delete("/social-contents/:id", isAuth, SocialController.deleteContent);
socialRoutes.post("/social-contents/:id/move", isAuth, SocialController.moveContent);

export default socialRoutes;

