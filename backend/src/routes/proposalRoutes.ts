import express from "express";

import isAuth from "../middleware/isAuth";
import * as ProposalController from "../controllers/ProposalController";

const proposalRoutes = express.Router();

// Rota pública para visualização de proposta pelo slug
proposalRoutes.get("/proposals/public/:slug", ProposalController.showPublic);

proposalRoutes.use(isAuth);

proposalRoutes.get("/proposals", ProposalController.index);
proposalRoutes.get("/proposals/:proposalId", ProposalController.show);
proposalRoutes.post("/proposals", ProposalController.store);
proposalRoutes.put("/proposals/:proposalId", ProposalController.update);
proposalRoutes.delete("/proposals/:proposalId", ProposalController.remove);
proposalRoutes.post("/proposals/:proposalId/duplicate", ProposalController.duplicate);

export default proposalRoutes;
