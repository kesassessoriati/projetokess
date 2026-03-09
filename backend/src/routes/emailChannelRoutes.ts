import express from "express";
import isAuth from "../middleware/isAuth";
import * as EmailChannelController from "../controllers/EmailChannelController";

const emailChannelRoutes = express.Router();

emailChannelRoutes.get("/email-channels", isAuth, EmailChannelController.index);
emailChannelRoutes.get("/email-channels/:emailChannelId", isAuth, EmailChannelController.show);
emailChannelRoutes.post("/email-channels", isAuth, EmailChannelController.store);
emailChannelRoutes.put("/email-channels/:emailChannelId", isAuth, EmailChannelController.update);
emailChannelRoutes.delete("/email-channels/:emailChannelId", isAuth, EmailChannelController.remove);
emailChannelRoutes.post("/email-channels/:emailChannelId/sync", isAuth, EmailChannelController.syncNow);

export default emailChannelRoutes;

