import express from "express";
import isAuth from "../middleware/isAuth";
import * as QuickSendController from "../controllers/QuickSendController";

const quickSendRoutes = express.Router();

// ─── Lista conexões disponíveis para o dropdown do modal ──────────────────────
quickSendRoutes.get(
    "/quick-send/connections",
    isAuth,
    QuickSendController.listConnections
);

// ─── Envio rápido: valida número, cria contato/ticket, envia mensagem ─────────
quickSendRoutes.post(
    "/quick-send",
    isAuth,
    QuickSendController.quickSend
);

export default quickSendRoutes;
