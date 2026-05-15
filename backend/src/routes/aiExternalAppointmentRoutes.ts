import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as AiExternalAppointmentController from "../controllers/AiExternalAppointmentController";

const aiExternalAppointmentRoutes = Router();

aiExternalAppointmentRoutes.get(
  "/ai-agents/external/appointments",
  isAuth,
  AiExternalAppointmentController.index
);

aiExternalAppointmentRoutes.post(
  "/ai-agents/external/appointments",
  isAuth,
  AiExternalAppointmentController.store
);

aiExternalAppointmentRoutes.post(
  "/ai-agents/external/appointments/:id/send-group",
  isAuth,
  AiExternalAppointmentController.sendGroup
);

aiExternalAppointmentRoutes.put(
  "/ai-agents/external/appointments/:id",
  isAuth,
  AiExternalAppointmentController.update
);

aiExternalAppointmentRoutes.delete(
  "/ai-agents/external/appointments/:id",
  isAuth,
  AiExternalAppointmentController.remove
);

export default aiExternalAppointmentRoutes;
