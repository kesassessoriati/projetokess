import { Router } from "express";
import isAuthExternal from "../../middleware/isAuthExternal";
import * as ExternalCrmLeadController from "../../controllers/api/ExternalCrmLeadController";

const externalCrmLeadRoutes = Router();

externalCrmLeadRoutes.get(
  "/crm-leads",
  isAuthExternal,
  ExternalCrmLeadController.index
);

externalCrmLeadRoutes.get(
  "/crm-leads/:id",
  isAuthExternal,
  ExternalCrmLeadController.show
);

externalCrmLeadRoutes.post(
  "/crm-leads",
  isAuthExternal,
  ExternalCrmLeadController.store
);

externalCrmLeadRoutes.post(
  "/crm-leads/follow-up/mark",
  isAuthExternal,
  ExternalCrmLeadController.markFollowUpByLookup
);

externalCrmLeadRoutes.put(
  "/crm-leads/:id",
  isAuthExternal,
  ExternalCrmLeadController.update
);

externalCrmLeadRoutes.post(
  "/crm-leads/:id/convert",
  isAuthExternal,
  ExternalCrmLeadController.convert
);

externalCrmLeadRoutes.post(
  "/crm-leads/:id/follow-up",
  isAuthExternal,
  ExternalCrmLeadController.markFollowUp
);

export default externalCrmLeadRoutes;
