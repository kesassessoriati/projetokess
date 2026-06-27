import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as GroupManagementController from "../controllers/GroupManagementController";
import * as GroupWebhookController from "../controllers/GroupWebhookController";
import multer from "multer";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

const groupManagementRoutes = Router();

// Dashboard and sync
groupManagementRoutes.get("/group-management/dashboard", isAuth, GroupManagementController.dashboardMetrics);
groupManagementRoutes.post("/group-management/sync", isAuth, GroupManagementController.syncGroups);

// Group directory
groupManagementRoutes.get("/group-management/groups", isAuth, GroupManagementController.listGroups);
groupManagementRoutes.get("/group-management/groups/:jid/info", isAuth, GroupManagementController.getGroupInfo);
groupManagementRoutes.get("/group-management/groups/:jid/export", isAuth, GroupManagementController.exportGroupMembers);
groupManagementRoutes.patch("/group-management/groups/meta/:groupId", isAuth, GroupManagementController.updateGroupMeta);
groupManagementRoutes.post("/group-management/groups", isAuth, GroupManagementController.createGroup);
groupManagementRoutes.post("/group-management/groups/batch", isAuth, GroupManagementController.createGroupBatch);
groupManagementRoutes.put("/group-management/groups/:jid/subject", isAuth, GroupManagementController.updateGroupSubject);
groupManagementRoutes.put("/group-management/groups/:jid/description", isAuth, GroupManagementController.updateGroupDescription);
groupManagementRoutes.put("/group-management/groups/:jid/picture", isAuth, upload.single("picture"), GroupManagementController.updateGroupPictureUpload);
groupManagementRoutes.post("/group-management/groups/:jid/add-member", isAuth, GroupManagementController.addMember);
groupManagementRoutes.post("/group-management/groups/bulk-add-members", isAuth, GroupManagementController.bulkAddMembers);
groupManagementRoutes.delete("/group-management/groups/:jid/members/:memberId", isAuth, GroupManagementController.kickMember);
groupManagementRoutes.post("/group-management/groups/:jid/members/:memberId/promote", isAuth, GroupManagementController.promoteMember);
groupManagementRoutes.post("/group-management/groups/:jid/members/:memberId/demote", isAuth, GroupManagementController.demoteMember);
groupManagementRoutes.get("/group-management/groups/:jid/invite-link", isAuth, GroupManagementController.getInviteLink);
groupManagementRoutes.post("/group-management/groups/:jid/invite-revoke", isAuth, GroupManagementController.revokeInviteLink);
groupManagementRoutes.post("/group-management/groups/:jid/tag-all", isAuth, GroupManagementController.tagAll);
groupManagementRoutes.post("/group-management/groups/bulk-send", isAuth, GroupManagementController.bulkSend);

// Templates
groupManagementRoutes.get("/group-management/templates", isAuth, GroupManagementController.listTemplates);
groupManagementRoutes.post("/group-management/templates", isAuth, GroupManagementController.createTemplate);
groupManagementRoutes.put("/group-management/templates/:id", isAuth, GroupManagementController.updateTemplate);
groupManagementRoutes.delete("/group-management/templates/:id", isAuth, GroupManagementController.deleteTemplate);

// Campaigns
groupManagementRoutes.post("/group-management/campaigns/media", isAuth, upload.single("media"), GroupManagementController.uploadMedia);
groupManagementRoutes.get("/group-management/campaigns", isAuth, GroupManagementController.listCampaigns);
groupManagementRoutes.post("/group-management/campaigns", isAuth, GroupManagementController.createCampaign);
groupManagementRoutes.get("/group-management/campaigns/:id", isAuth, GroupManagementController.showCampaign);
groupManagementRoutes.put("/group-management/campaigns/:id", isAuth, GroupManagementController.updateCampaign);
groupManagementRoutes.delete("/group-management/campaigns/:id", isAuth, GroupManagementController.deleteCampaign);
groupManagementRoutes.post("/group-management/campaigns/:id/duplicate", isAuth, GroupManagementController.duplicateCampaign);
groupManagementRoutes.post("/group-management/campaigns/:id/start", isAuth, GroupManagementController.startCampaign);
groupManagementRoutes.post("/group-management/campaigns/:id/pause", isAuth, GroupManagementController.pauseCampaign);
groupManagementRoutes.post("/group-management/campaigns/:id/resume", isAuth, GroupManagementController.resumeCampaign);
groupManagementRoutes.post("/group-management/campaigns/:id/cancel", isAuth, GroupManagementController.cancelCampaign);
groupManagementRoutes.get("/group-management/campaigns/:id/logs", isAuth, GroupManagementController.listCampaignLogs);
groupManagementRoutes.get("/group-management/campaigns/:id/report", isAuth, GroupManagementController.campaignReport);

// Schedules, history and reports
groupManagementRoutes.get("/group-management/schedules", isAuth, GroupManagementController.listSchedules);
groupManagementRoutes.get("/group-management/history", isAuth, GroupManagementController.history);
groupManagementRoutes.get("/group-management/reports", isAuth, GroupManagementController.reports);

// Group webhooks (mensagens de grupo recebidas/enviadas)
groupManagementRoutes.get("/group-management/webhooks", isAuth, GroupWebhookController.index);
groupManagementRoutes.post("/group-management/webhooks", isAuth, GroupWebhookController.store);
groupManagementRoutes.put("/group-management/webhooks/:id", isAuth, GroupWebhookController.update);
groupManagementRoutes.delete("/group-management/webhooks/:id", isAuth, GroupWebhookController.remove);
groupManagementRoutes.post("/group-management/webhooks/:id/test", isAuth, GroupWebhookController.test);

export default groupManagementRoutes;
