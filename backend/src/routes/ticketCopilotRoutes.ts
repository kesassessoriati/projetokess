import { Router } from "express";
import isAuth from "../middleware/isAuth";

import * as TicketCopilotController from "../controllers/TicketCopilotController";

const ticketCopilotRoutes = Router();

ticketCopilotRoutes.post("/tickets/:ticketId/copilot", isAuth, TicketCopilotController.run);

export default ticketCopilotRoutes;
