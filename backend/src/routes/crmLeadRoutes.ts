import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import * as CrmLeadController from "../controllers/CrmLeadController";
import uploadConfig from "../config/upload";

const crmLeadRoutes = Router();
const upload = multer(uploadConfig);

crmLeadRoutes.get("/crm/leads", isAuth, CrmLeadController.index);
crmLeadRoutes.post("/crm/leads/import", isAuth, upload.single("file"), CrmLeadController.importLeads);
crmLeadRoutes.get("/crm/leads/:leadId", isAuth, CrmLeadController.show);
crmLeadRoutes.post("/crm/leads", isAuth, CrmLeadController.store);
crmLeadRoutes.put("/crm/leads/:leadId", isAuth, CrmLeadController.update);
crmLeadRoutes.post("/crm/leads/:leadId/convert", isAuth, CrmLeadController.convert);
crmLeadRoutes.delete("/crm/leads/:leadId", isAuth, CrmLeadController.remove);

export default crmLeadRoutes;
