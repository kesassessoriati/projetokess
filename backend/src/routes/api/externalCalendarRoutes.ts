import { Router } from "express";
import isAuthExternal from "../../middleware/isAuthExternal";
import * as ExternalCalendarContextController from "../../controllers/api/ExternalCalendarContextController";

const externalCalendarRoutes = Router();

// GET /api/external/calendar/context
externalCalendarRoutes.get(
  "/calendar/context",
  isAuthExternal,
  ExternalCalendarContextController.calendarContext
);

export default externalCalendarRoutes;
