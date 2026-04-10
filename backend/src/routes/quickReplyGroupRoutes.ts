import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as QuickReplyGroupController from "../controllers/QuickReplyGroupController";

const quickReplyGroupRoutes = Router();

quickReplyGroupRoutes.get(
  "/quick-reply-groups",
  isAuth,
  QuickReplyGroupController.index
);
quickReplyGroupRoutes.post(
  "/quick-reply-groups",
  isAuth,
  QuickReplyGroupController.store
);
quickReplyGroupRoutes.put(
  "/quick-reply-groups/sort",
  isAuth,
  QuickReplyGroupController.sort
);
quickReplyGroupRoutes.put(
  "/quick-reply-groups/:id",
  isAuth,
  QuickReplyGroupController.update
);
quickReplyGroupRoutes.delete(
  "/quick-reply-groups/:id",
  isAuth,
  QuickReplyGroupController.remove
);

export default quickReplyGroupRoutes;
