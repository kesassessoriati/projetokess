import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";
import * as FirecrawlController from "../controllers/FirecrawlController";

const firecrawlRoutes = Router();

firecrawlRoutes.get(
  "/firecrawl/config/me",
  isAuth,
  FirecrawlController.showPersonalConfig
);

firecrawlRoutes.put(
  "/firecrawl/config/me",
  isAuth,
  FirecrawlController.updatePersonalConfig
);

firecrawlRoutes.get(
  "/firecrawl/config/global",
  isAuth,
  isSuper,
  FirecrawlController.showGlobalConfig
);

firecrawlRoutes.put(
  "/firecrawl/config/global",
  isAuth,
  isSuper,
  FirecrawlController.updateGlobalConfig
);

firecrawlRoutes.post(
  "/crm/firecrawl/search",
  isAuth,
  FirecrawlController.searchInternetLeads
);

firecrawlRoutes.post(
  "/crm/firecrawl/import",
  isAuth,
  FirecrawlController.importInternetLeads
);

export default firecrawlRoutes;
