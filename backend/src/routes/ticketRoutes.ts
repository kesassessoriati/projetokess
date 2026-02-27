import express from "express";
import isAuth from "../middleware/isAuth";

import * as TicketController from "../controllers/TicketController";

const ticketRoutes = express.Router();

ticketRoutes.get("/tickets", isAuth, TicketController.index);

ticketRoutes.get("/tickets/:ticketId", isAuth, TicketController.show);

ticketRoutes.get("/tickets-log/:ticketId", isAuth, TicketController.showLog);

// [DEPRECATED] Funil Legado - retorna 410 Gone
ticketRoutes.get("/ticket/kanban", isAuth, (_req, res) => {
    return res.status(410).json({
        error: "Gone",
        message: "Este módulo foi desativado. Utilize a nova API do Board Inteligente: GET /pipelines e GET /pipelines/:id/board."
    });
});

ticketRoutes.get("/ticketreport/reports", isAuth, TicketController.report);

ticketRoutes.get("/tickets/u/:uuid", isAuth, TicketController.showFromUUID);

ticketRoutes.post("/tickets", isAuth, TicketController.store);

ticketRoutes.put("/setunredmsg/:ticketId", isAuth, TicketController.setunredmsg);

ticketRoutes.put("/tickets/:ticketId", isAuth, TicketController.update);

ticketRoutes.delete("/tickets/:ticketId", isAuth, TicketController.remove);

ticketRoutes.post("/tickets/closeAll", isAuth, TicketController.closeAll);

ticketRoutes.post("/tickets/cleanup", isAuth, TicketController.cleanupAll);

export default ticketRoutes;
