import { Router } from "express";
import * as InternalMessageSyncController from "../controllers/InternalMessageSyncController";

const internalMessageSyncRoutes = Router();

internalMessageSyncRoutes.post(
  "/internal/message-sync/inbound",
  InternalMessageSyncController.inbound
);

export default internalMessageSyncRoutes;
