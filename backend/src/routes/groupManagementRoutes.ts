import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as GroupManagementController from "../controllers/GroupManagementController";

const groupManagementRoutes = Router();

// List all groups from connected WhatsApps
groupManagementRoutes.get("/group-management/groups", isAuth, GroupManagementController.listGroups);

// Get detailed info of a specific group
groupManagementRoutes.get("/group-management/groups/:jid/info", isAuth, GroupManagementController.getGroupInfo);

// Tag all members in a group
groupManagementRoutes.post("/group-management/groups/:jid/tag-all", isAuth, GroupManagementController.tagAll);

// Kick a member
groupManagementRoutes.delete("/group-management/groups/:jid/members/:memberId", isAuth, GroupManagementController.kickMember);

// Promote a member to admin
groupManagementRoutes.post("/group-management/groups/:jid/members/:memberId/promote", isAuth, GroupManagementController.promoteMember);

// Demote an admin to member
groupManagementRoutes.post("/group-management/groups/:jid/members/:memberId/demote", isAuth, GroupManagementController.demoteMember);

// Get invite link
groupManagementRoutes.get("/group-management/groups/:jid/invite-link", isAuth, GroupManagementController.getInviteLink);

// Revoke invite link
groupManagementRoutes.post("/group-management/groups/:jid/invite-revoke", isAuth, GroupManagementController.revokeInviteLink);

export default groupManagementRoutes;
