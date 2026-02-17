import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as ExternalAppController from "../controllers/ExternalAppController";

const externalAppRoutes = Router();

externalAppRoutes.get("/external-apps", isAuth, ExternalAppController.index);
externalAppRoutes.get("/external-apps/:id", isAuth, ExternalAppController.show);
externalAppRoutes.post("/external-apps", isAuth, ExternalAppController.store);
externalAppRoutes.put("/external-apps/:id", isAuth, ExternalAppController.update);
externalAppRoutes.delete("/external-apps/:id", isAuth, ExternalAppController.remove);

export default externalAppRoutes;
