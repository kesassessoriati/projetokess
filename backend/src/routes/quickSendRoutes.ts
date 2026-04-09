import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";
import * as QuickSendController from "../controllers/QuickSendController";

const quickSendRoutes = express.Router();
const upload = multer(uploadConfig);

// ─── Lista conexões disponíveis para o dropdown do modal ──────────────────────
quickSendRoutes.get(
    "/quick-send/connections",
    isAuth,
    QuickSendController.listConnections
);

// ─── Valida número no WhatsApp antes do envio ─────────────────────────────────
quickSendRoutes.get(
    "/quick-send/validate",
    isAuth,
    QuickSendController.validateNumber
);

// ─── Envio rápido: valida número, cria contato/ticket, envia mensagem ─────────
quickSendRoutes.post(
    "/quick-send",
    isAuth,
    upload.array("medias"),
    QuickSendController.quickSend
);

quickSendRoutes.post(
    "/quick-send/campaign",
    isAuth,
    upload.any(),
    QuickSendController.createCampaign
);

export default quickSendRoutes;
