import { Router } from "express";
import isAuthExternal from "../../middleware/isAuthExternal";
import * as ExternalHttpChannelController from "../../controllers/api/ExternalHttpChannelController";

const externalHttpChannelRoutes = Router();

externalHttpChannelRoutes.get("/http-channels", isAuthExternal, ExternalHttpChannelController.index);
externalHttpChannelRoutes.get("/http-channels/:id", isAuthExternal, ExternalHttpChannelController.show);
externalHttpChannelRoutes.get("/http-channels/:id/status", isAuthExternal, ExternalHttpChannelController.status);
externalHttpChannelRoutes.post("/http-channels", isAuthExternal, ExternalHttpChannelController.store);
externalHttpChannelRoutes.put("/http-channels/:id", isAuthExternal, ExternalHttpChannelController.update);
externalHttpChannelRoutes.delete("/http-channels/:id", isAuthExternal, ExternalHttpChannelController.remove);
externalHttpChannelRoutes.post("/http-channels/:id/messages/inbound", isAuthExternal, ExternalHttpChannelController.inbound);
externalHttpChannelRoutes.post("/http-channels/:id/messages/send", isAuthExternal, ExternalHttpChannelController.send);

export default externalHttpChannelRoutes;
