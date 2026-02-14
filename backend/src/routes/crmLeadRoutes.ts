import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as CrmLeadController from "../controllers/CrmLeadController";

const crmLeadRoutes = Router();

crmLeadRoutes.get("/crm/leads", isAuth, CrmLeadController.index);
crmLeadRoutes.get("/crm/leads/:leadId", isAuth, CrmLeadController.show);
crmLeadRoutes.post("/crm/leads", isAuth, CrmLeadController.store);
crmLeadRoutes.put("/crm/leads/:leadId", isAuth, CrmLeadController.update);
crmLeadRoutes.post("/crm/leads/:leadId/convert", isAuth, CrmLeadController.convert);
crmLeadRoutes.delete("/crm/leads/:leadId", isAuth, CrmLeadController.remove);

export default crmLeadRoutes;
