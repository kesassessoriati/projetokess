import { Router } from "express";
import * as SessionController from "../controllers/SessionController";
import * as UserController from "../controllers/UserController";
import * as MobileAuthController from "../controllers/MobileAuthController";
import isAuth from "../middleware/isAuth";
import envTokenAuth from "../middleware/envTokenAuth";

const authRoutes = Router();

authRoutes.post("/signup", UserController.store);
authRoutes.get("/check-email", UserController.checkEmail);
authRoutes.post("/login", SessionController.store);
authRoutes.post("/refresh_token", SessionController.update);
authRoutes.delete("/logout", isAuth, SessionController.remove);
authRoutes.get("/me", isAuth, SessionController.me);
authRoutes.post("/mobile-login", MobileAuthController.mobileLogin);
authRoutes.post("/mobile/auth/webview", MobileAuthController.mobileWebViewAuth);

export default authRoutes;
