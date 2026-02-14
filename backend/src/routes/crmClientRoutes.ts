import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as CrmClientController from "../controllers/CrmClientController";

const crmClientRoutes = Router();

crmClientRoutes.get("/crm/clients", isAuth, CrmClientController.index);
crmClientRoutes.get("/crm/clients/:clientId", isAuth, CrmClientController.show);
crmClientRoutes.post("/crm/clients", isAuth, CrmClientController.store);
crmClientRoutes.put("/crm/clients/:clientId", isAuth, CrmClientController.update);
crmClientRoutes.delete("/crm/clients/:clientId", isAuth, CrmClientController.remove);

export default crmClientRoutes;
