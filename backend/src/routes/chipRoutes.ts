import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as ChipController from "../controllers/ChipController";

const chipRoutes = Router();

chipRoutes.get("/chips/dashboard", isAuth, ChipController.dashboard);
chipRoutes.get("/chips", isAuth, ChipController.index);
chipRoutes.get("/chips/:id", isAuth, ChipController.show);
chipRoutes.get("/chips/:id/logs", isAuth, ChipController.logs);
chipRoutes.post("/chips", isAuth, ChipController.store);
chipRoutes.put("/chips/:id", isAuth, ChipController.update);
chipRoutes.delete("/chips/:id", isAuth, ChipController.remove);
chipRoutes.post("/chips/:id/recharge", isAuth, ChipController.recharge);
chipRoutes.post("/chips/:id/link-whatsapp", isAuth, ChipController.linkWhatsapp);
chipRoutes.post("/chips/monitoring/refresh", isAuth, ChipController.refreshMonitoring);

export default chipRoutes;
