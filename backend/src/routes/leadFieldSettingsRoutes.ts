import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as LeadFieldSettingsController from "../controllers/LeadFieldSettingsController";

const leadFieldSettingsRoutes = Router();

leadFieldSettingsRoutes.get("/crm/lead-field-settings", isAuth, LeadFieldSettingsController.index);
leadFieldSettingsRoutes.get("/crm/lead-field-settings/usage", isAuth, LeadFieldSettingsController.usage);
leadFieldSettingsRoutes.put("/crm/lead-field-settings", isAuth, LeadFieldSettingsController.update);
leadFieldSettingsRoutes.post("/crm/lead-field-settings/custom-fields", isAuth, LeadFieldSettingsController.createCustom);
leadFieldSettingsRoutes.delete("/crm/lead-field-settings/custom-fields/:id", isAuth, LeadFieldSettingsController.removeCustom);

export default leadFieldSettingsRoutes;
