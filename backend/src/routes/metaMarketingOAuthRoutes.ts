import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as MetaMarketingOAuthController from "../controllers/MetaMarketingOAuthController";

const metaMarketingOAuthRoutes = Router();

metaMarketingOAuthRoutes.post("/meta-marketing/oauth/start", isAuth, MetaMarketingOAuthController.start);
metaMarketingOAuthRoutes.get("/meta-marketing/oauth/callback", MetaMarketingOAuthController.callback);
metaMarketingOAuthRoutes.get("/meta-marketing/connections", isAuth, MetaMarketingOAuthController.listConnections);
metaMarketingOAuthRoutes.get("/meta-marketing/connections/:connectionId/accounts", isAuth, MetaMarketingOAuthController.listAvailableAccounts);
metaMarketingOAuthRoutes.post("/meta-marketing/connections/:connectionId/accounts", isAuth, MetaMarketingOAuthController.confirmAccounts);
metaMarketingOAuthRoutes.post("/meta-marketing/connections/:connectionId/disconnect", isAuth, MetaMarketingOAuthController.disconnect);
metaMarketingOAuthRoutes.post("/meta-marketing/deauthorize", MetaMarketingOAuthController.deauthorize);
metaMarketingOAuthRoutes.post("/meta-marketing/data-deletion", MetaMarketingOAuthController.dataDeletion);
metaMarketingOAuthRoutes.get("/meta-marketing/data-deletion/:confirmationCode", MetaMarketingOAuthController.dataDeletionStatus);

export default metaMarketingOAuthRoutes;
