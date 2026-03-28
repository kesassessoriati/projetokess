import { Router } from "express";
import isAuthExternal from "../../middleware/isAuthExternal";
import * as ExternalAppointmentController from "../../controllers/api/ExternalAppointmentController";

const externalAppointmentRoutes = Router();

externalAppointmentRoutes.get(
  "/appointments",
  isAuthExternal,
  ExternalAppointmentController.index
);

externalAppointmentRoutes.get(
  "/appointments/:id",
  isAuthExternal,
  ExternalAppointmentController.show
);

externalAppointmentRoutes.post(
  "/appointments",
  isAuthExternal,
  ExternalAppointmentController.store
);

externalAppointmentRoutes.put(
  "/appointments/:id",
  isAuthExternal,
  ExternalAppointmentController.update
);

externalAppointmentRoutes.delete(
  "/appointments/:id",
  isAuthExternal,
  ExternalAppointmentController.remove
);

export default externalAppointmentRoutes;
