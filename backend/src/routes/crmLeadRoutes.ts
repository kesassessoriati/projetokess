import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import isAuth from "../middleware/isAuth";
import * as CrmLeadController from "../controllers/CrmLeadController";
import uploadConfig from "../config/upload";

const crmLeadRoutes = Router();
const upload = multer(uploadConfig);

// Multer dedicado para anexos de leads — usa leadId do req.params na destination
// para não depender da ordem de campos no multipart/form-data
const publicFolder = uploadConfig.directory;
const uploadLeadFiles = multer({
  storage: multer.diskStorage({
    destination: (req: any, _file, cb) => {
      const companyId = req.user?.companyId;
      const { leadId } = req.params;
      const folder = path.resolve(publicFolder, `company${companyId}`, "leads", String(leadId));
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        fs.chmodSync(folder, 0o777);
      }
      cb(null, folder);
    },
    filename: (_req, file, cb) => {
      const ts = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${ts}_${safeName}`);
    }
  })
});

crmLeadRoutes.get("/crm/leads", isAuth, CrmLeadController.index);
crmLeadRoutes.get("/crm/leads/export", isAuth, CrmLeadController.exportLeads);
crmLeadRoutes.post("/crm/leads/import", isAuth, upload.single("file"), CrmLeadController.importLeads);
crmLeadRoutes.get("/crm/leads/:leadId", isAuth, CrmLeadController.show);
crmLeadRoutes.post("/crm/leads", isAuth, CrmLeadController.store);
crmLeadRoutes.put("/crm/leads/:leadId", isAuth, CrmLeadController.update);
crmLeadRoutes.patch("/crm/leads/:leadId/fields", isAuth, CrmLeadController.updateFields);
crmLeadRoutes.post("/crm/leads/:leadId/convert", isAuth, CrmLeadController.convert);
crmLeadRoutes.delete("/crm/leads/:leadId", isAuth, CrmLeadController.remove);

crmLeadRoutes.get("/crm/leads/:leadId/events", isAuth, CrmLeadController.listEvents);
crmLeadRoutes.post("/crm/leads/:leadId/events", isAuth, CrmLeadController.createEvent);

crmLeadRoutes.get("/crm/leads/:leadId/messages", isAuth, CrmLeadController.listMessages);
crmLeadRoutes.post("/crm/leads/:leadId/messages", isAuth, CrmLeadController.createMessage);

// Anexos
crmLeadRoutes.get("/crm/leads/:leadId/attachments", isAuth, CrmLeadController.listAttachments);
crmLeadRoutes.post("/crm/leads/:leadId/attachments", isAuth, uploadLeadFiles.array("files", 20), CrmLeadController.uploadAttachments);
crmLeadRoutes.delete("/crm/leads/:leadId/attachments/:attachmentId", isAuth, CrmLeadController.deleteAttachment);

export default crmLeadRoutes;
