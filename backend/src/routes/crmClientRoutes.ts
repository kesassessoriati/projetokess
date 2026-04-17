import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import * as CrmClientController from "../controllers/CrmClientController";
import uploadConfig from "../config/upload";

const crmClientRoutes = Router();
const upload = multer(uploadConfig);

crmClientRoutes.post("/crm/clients/import", isAuth, upload.single("file"), CrmClientController.importClients);
crmClientRoutes.post("/crm/clients/bulk-tags", isAuth, CrmClientController.bulkAssignTags);
crmClientRoutes.post("/crm/clients/bulk-remove-tags", isAuth, CrmClientController.bulkRemoveTags);
crmClientRoutes.get("/crm/clients", isAuth, CrmClientController.index);
crmClientRoutes.get("/crm/clients/:clientId", isAuth, CrmClientController.show);
crmClientRoutes.post("/crm/clients", isAuth, CrmClientController.store);
crmClientRoutes.put("/crm/clients/:clientId", isAuth, CrmClientController.update);
crmClientRoutes.delete("/crm/clients/:clientId", isAuth, CrmClientController.remove);

export default crmClientRoutes;
