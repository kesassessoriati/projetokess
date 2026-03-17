import { Router } from "express";
import isAuthExternal from "../../middleware/isAuthExternal";
import * as PresenceController from "../../controllers/PresenceController";

const externalPresenceRoutes = Router();

externalPresenceRoutes.post("/presence/typing", isAuthExternal, PresenceController.sendTyping);
externalPresenceRoutes.post("/presence/stop", isAuthExternal, PresenceController.stopTyping);

export default externalPresenceRoutes;
