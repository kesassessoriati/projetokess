import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as MetaLeadAdsController from "../controllers/MetaLeadAdsController";

const metaLeadAdsRoutes = Router();

// Webhook público da Meta (sem autenticação)
metaLeadAdsRoutes.get("/webhooks/meta/leadads", MetaLeadAdsController.verifyWebhook);
metaLeadAdsRoutes.post("/webhooks/meta/leadads", MetaLeadAdsController.receiveWebhook);

// CRUD de integrações (autenticado)
metaLeadAdsRoutes.get("/meta-lead-ads/integrations", isAuth, MetaLeadAdsController.listIntegrations);
metaLeadAdsRoutes.post("/meta-lead-ads/integrations", isAuth, MetaLeadAdsController.createIntegration);
metaLeadAdsRoutes.put("/meta-lead-ads/integrations/:id", isAuth, MetaLeadAdsController.updateIntegration);
metaLeadAdsRoutes.delete("/meta-lead-ads/integrations/:id", isAuth, MetaLeadAdsController.deleteIntegration);

// Histórico de leads recebidos
metaLeadAdsRoutes.get("/meta-lead-ads/leads", isAuth, MetaLeadAdsController.listLeads);

// Simulação de lead
metaLeadAdsRoutes.post("/meta-lead-ads/simulate", isAuth, MetaLeadAdsController.simulateLead);

export default metaLeadAdsRoutes;
