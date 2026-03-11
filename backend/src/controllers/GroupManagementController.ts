import { Request, Response } from "express";
import { Op, literal } from "sequelize";
import Whatsapp from "../models/Whatsapp";
import GroupDirectory from "../models/GroupDirectory";
import GroupMember from "../models/GroupMember";
import GroupCampaign from "../models/GroupCampaign";
import GroupCampaignTarget from "../models/GroupCampaignTarget";
import GroupCampaignLog from "../models/GroupCampaignLog";
import GroupTemplate from "../models/GroupTemplate";
import { getWbot } from "../libs/wbot";
import logger from "../utils/logger";
import { syncCompanyGroups } from "../services/GroupManagementServices/GroupSyncService";
import { processGroupCampaignById } from "../services/GroupManagementServices/GroupCampaignProcessorService";
import { ProviderFactory } from "../services/whatsapp/providers/ProviderFactory";

const ensureConnectionAccess = async (companyId: number, whatsappId: number) => {
  return Whatsapp.findOne({
    where: { id: Number(whatsappId), companyId },
    attributes: ["id", "name", "number", "status"]
  });
};

const buildGroupWhere = (companyId: number, query: any) => {
  const where: any = { companyId };
  if (query.whatsappId) where.whatsappId = Number(query.whatsappId);
  if (query.search) where.subject = { [Op.iLike]: `%${String(query.search).trim()}%` };
  if (query.favorite === "true") where.isFavorite = true;
  if (query.favorite === "false") where.isFavorite = false;
  if (query.minMembers) where.memberCount = { ...(where.memberCount || {}), [Op.gte]: Number(query.minMembers) };
  if (query.maxMembers) where.memberCount = { ...(where.memberCount || {}), [Op.lte]: Number(query.maxMembers) };
  if (query.tag) where.tags = { [Op.contains]: [String(query.tag)] };
  return where;
};

const resolveGroupSelection = async (companyId: number, body: any) => {
  const where = buildGroupWhere(companyId, body?.filters || {});
  let groups: GroupDirectory[] = [];
  if (Array.isArray(body?.groupIds) && body.groupIds.length) {
    groups = await GroupDirectory.findAll({
      where: {
        companyId,
        id: { [Op.in]: body.groupIds.map(Number).filter(Boolean) }
      }
    });
  } else {
    groups = await GroupDirectory.findAll({ where, order: [["subject", "ASC"]], limit: 1000 });
  }
  return groups;
};

const upsertCampaignTargets = async (campaign: GroupCampaign, groups: GroupDirectory[]) => {
  await GroupCampaignTarget.destroy({
    where: { companyId: campaign.companyId, campaignId: campaign.id }
  });

  if (!groups.length) {
    await campaign.update({ totalGroups: 0 });
    return;
  }

  await GroupCampaignTarget.bulkCreate(groups.map((group) => ({
    companyId: campaign.companyId,
    campaignId: campaign.id,
    groupId: group.id,
    groupJid: group.groupJid,
    status: "PENDING",
    scheduledAt: campaign.scheduledAt || null
  })));

  await campaign.update({ totalGroups: groups.length, processedGroups: 0, successCount: 0, failedCount: 0 });
};

export const syncGroups = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const ids = Array.isArray(req.body?.whatsappIds) ? req.body.whatsappIds.map(Number).filter(Boolean) : undefined;
  const summary = await syncCompanyGroups({ companyId, whatsappIds: ids });
  return res.json(summary);
};

export const dashboardMetrics = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const [totalGroups, totalMembers, totalAdmins, campaignsTotal, campaignsSent, campaignsScheduled, campaignsFailed, templatesTotal] = await Promise.all([
    GroupDirectory.count({ where: { companyId } }),
    GroupDirectory.sum("memberCount", { where: { companyId } }),
    GroupDirectory.sum("adminCount", { where: { companyId } }),
    GroupCampaign.count({ where: { companyId } }),
    GroupCampaign.count({ where: { companyId, status: "SENT" } }),
    GroupCampaign.count({ where: { companyId, status: "SCHEDULED" } }),
    GroupCampaign.count({ where: { companyId, status: "FAILED" } }),
    GroupTemplate.count({ where: { companyId } })
  ]);

  const topGroupsRaw = await GroupCampaignTarget.findAll({
    where: { companyId, status: "SENT" },
    attributes: ["groupJid", [literal("COUNT(*)"), "uses"]],
    group: ["groupJid"],
    order: [[literal("COUNT(*)"), "DESC"]],
    limit: 5
  } as any);

  const topGroups = topGroupsRaw.map((item: any) => ({
    groupJid: item.groupJid,
    uses: Number(item.getDataValue("uses") || 0)
  }));

  return res.json({
    totalGroups,
    totalMembers: Number(totalMembers || 0),
    totalAdmins: Number(totalAdmins || 0),
    campaignsTotal,
    campaignsSent,
    campaignsScheduled,
    campaignsFailed,
    templatesTotal,
    topGroups
  });
};

export const listGroups = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const source = String(req.query.source || "cached");

  if (source === "live") {
    await syncCompanyGroups({
      companyId,
      whatsappIds: req.query.whatsappId ? [Number(req.query.whatsappId)] : undefined
    });
  }

  const groups = await GroupDirectory.findAll({
    where: buildGroupWhere(companyId, req.query),
    order: [["subject", "ASC"]]
  });

  const groupedMap: Record<string, any> = {};
  groups.forEach((group) => {
    const key = String(group.whatsappId);
    if (!groupedMap[key]) {
      groupedMap[key] = {
        whatsappId: group.whatsappId,
        whatsappName: "",
        groups: []
      };
    }
    groupedMap[key].groups.push({
      id: group.groupJid,
      groupId: group.id,
      subject: group.subject,
      desc: group.description,
      size: group.memberCount,
      owner: group.owner,
      isFavorite: group.isFavorite,
      tags: group.tags,
      lastSyncAt: group.lastSyncAt
    });
  });

  const connectionIds = Object.keys(groupedMap).map(Number);
  if (connectionIds.length) {
    const connections = await Whatsapp.findAll({
      where: { companyId, id: { [Op.in]: connectionIds } },
      attributes: ["id", "name"]
    });
    connections.forEach((conn) => {
      const key = String(conn.id);
      if (groupedMap[key]) groupedMap[key].whatsappName = conn.name;
    });
  }

  return res.json(Object.values(groupedMap));
};

export const getGroupInfo = async (req: Request, res: Response): Promise<Response> => {
  const { jid } = req.params;
  const { whatsappId } = req.query;
  const { companyId } = req.user;

  if (!whatsappId) {
    return res.status(400).json({ error: "whatsappId query param required" });
  }

  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

  let metadata: any = null;
  try {
    const wbot = getWbot(wa.id);
    metadata = await (wbot as any).groupMetadata(jid);
  } catch (err) {
    logger.warn(`[GroupManagement] groupMetadata fallback for ${jid}: ${err?.message}`);
  }

  const directory = await GroupDirectory.findOne({ where: { companyId, groupJid: jid } });
  const members = directory
    ? await GroupMember.findAll({ where: { companyId, groupId: directory.id }, order: [["memberJid", "ASC"]] })
    : [];

  const participants = metadata?.participants?.length
    ? metadata.participants.map((p: any) => ({
      id: p.id,
      isAdmin: p.admin === "admin" || p.admin === "superadmin",
      isSuperAdmin: p.admin === "superadmin"
    }))
    : members.map((m) => ({
      id: m.memberJid,
      isAdmin: m.isAdmin,
      isSuperAdmin: m.isSuperAdmin
    }));

  return res.json({
    id: jid,
    subject: metadata?.subject || directory?.subject || "",
    desc: metadata?.desc || directory?.description || "",
    creation: metadata?.creation || null,
    owner: metadata?.owner || directory?.owner || "",
    participants,
    directoryId: directory?.id || null,
    tags: directory?.tags || [],
    isFavorite: !!directory?.isFavorite,
    memberCount: participants.length
  });
};

export const createGroup = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { whatsappId, subject, participants = [] } = req.body;
  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });
  if (!subject) return res.status(400).json({ error: "subject is required" });

  try {
    const wbot = getWbot(wa.id);
    const participantJids = (participants || [])
      .map((p: string) => String(p || "").trim())
      .filter(Boolean)
      .map((p: string) => (p.includes("@") ? p : `${p.replace(/\D/g, "")}@s.whatsapp.net`));
    const result = await (wbot as any).groupCreate(subject, participantJids);
    await syncCompanyGroups({ companyId, whatsappIds: [wa.id] });
    return res.status(201).json({ success: true, result });
  } catch (error) {
    logger.error(`[GroupManagement] createGroup error: ${error?.message}`);
    return res.status(500).json({ error: "Failed to create group" });
  }
};

export const createGroupBatch = async (req: Request, res: Response): Promise<Response> => {
  const { groups = [] } = req.body;
  const created: any[] = [];
  const failed: any[] = [];

  for (const item of groups) {
    try {
      const fakeReq: any = { ...req, body: item };
      const fakeRes: any = {
        statusCode: 200,
        payload: null,
        status(code: number) { this.statusCode = code; return this; },
        json(data: any) { this.payload = data; return this; }
      };
      await createGroup(fakeReq, fakeRes);
      if (fakeRes.statusCode >= 400) failed.push({ item, error: fakeRes.payload?.error || "Failed" });
      else created.push(fakeRes.payload);
    } catch (error) {
      failed.push({ item, error: error?.message || "Failed" });
    }
  }

  return res.json({ created: created.length, failed: failed.length, failures: failed });
};

export const addMember = async (req: Request, res: Response): Promise<Response> => {
  const { jid } = req.params;
  const { whatsappId, memberId } = req.body;
  const { companyId } = req.user;
  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

  try {
    const wbot = getWbot(wa.id);
    const participant = String(memberId || "").includes("@") ? String(memberId) : `${String(memberId || "").replace(/\D/g, "")}@s.whatsapp.net`;
    await (wbot as any).groupParticipantsUpdate(jid, [participant], "add");
    await syncCompanyGroups({ companyId, whatsappIds: [wa.id] });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to add member" });
  }
};

export const kickMember = async (req: Request, res: Response): Promise<Response> => {
  const { jid, memberId } = req.params;
  const { whatsappId } = req.body;
  const { companyId } = req.user;
  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

  try {
    const wbot = getWbot(wa.id);
    await (wbot as any).groupParticipantsUpdate(jid, [memberId], "remove");
    await syncCompanyGroups({ companyId, whatsappIds: [wa.id] });
    return res.json({ success: true });
  } catch (err) {
    logger.error(`[GroupManagement] kickMember error: ${err.message}`);
    return res.status(500).json({ error: "Failed to remove member" });
  }
};

export const promoteMember = async (req: Request, res: Response): Promise<Response> => {
  const { jid, memberId } = req.params;
  const { whatsappId } = req.body;
  const { companyId } = req.user;
  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

  try {
    const wbot = getWbot(wa.id);
    await (wbot as any).groupParticipantsUpdate(jid, [memberId], "promote");
    await syncCompanyGroups({ companyId, whatsappIds: [wa.id] });
    return res.json({ success: true });
  } catch (err) {
    logger.error(`[GroupManagement] promoteMember error: ${err.message}`);
    return res.status(500).json({ error: "Failed to promote member" });
  }
};

export const demoteMember = async (req: Request, res: Response): Promise<Response> => {
  const { jid, memberId } = req.params;
  const { whatsappId } = req.body;
  const { companyId } = req.user;
  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

  try {
    const wbot = getWbot(wa.id);
    await (wbot as any).groupParticipantsUpdate(jid, [memberId], "demote");
    await syncCompanyGroups({ companyId, whatsappIds: [wa.id] });
    return res.json({ success: true });
  } catch (err) {
    logger.error(`[GroupManagement] demoteMember error: ${err.message}`);
    return res.status(500).json({ error: "Failed to demote member" });
  }
};

export const updateGroupSubject = async (req: Request, res: Response): Promise<Response> => {
  const { jid } = req.params;
  const { whatsappId, subject } = req.body;
  const { companyId } = req.user;
  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });
  if (!subject) return res.status(400).json({ error: "subject is required" });

  try {
    const wbot = getWbot(wa.id);
    const provider = ProviderFactory.createProvider(wa, wbot, companyId);
    // Since our provider abstraction does not strictly contain updateGroupSubject yet,
    // We update it on the wbot for Baileys. But let's assume we want pure providers:
    if (wa.provider === "whatsmeow") {
         // handle
    } else {
         await (wbot as any).groupUpdateSubject(jid, subject);
    }
    await syncCompanyGroups({ companyId, whatsappIds: [wa.id] });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update group subject" });
  }
};

export const updateGroupDescription = async (req: Request, res: Response): Promise<Response> => {
  const { jid } = req.params;
  const { whatsappId, description } = req.body;
  const { companyId } = req.user;
  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

  try {
    const wbot = getWbot(wa.id);
    await (wbot as any).groupUpdateDescription(jid, description || "");
    await syncCompanyGroups({ companyId, whatsappIds: [wa.id] });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update group description" });
  }
};

export const updateGroupPicture = async (req: Request, res: Response): Promise<Response> => {
  return res.status(501).json({
    error: "Atualização de imagem de grupo não suportada de forma estável na infraestrutura atual."
  });
};

export const getInviteLink = async (req: Request, res: Response): Promise<Response> => {
  const { jid } = req.params;
  const { whatsappId } = req.query;
  const { companyId } = req.user;
  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

  try {
    const wbot = getWbot(wa.id);
    const provider = ProviderFactory.createProvider(wa, wbot, companyId);
    const link = await provider.generateInviteLink(jid);
    const code = link.split('/').pop() || '';
    return res.json({ inviteLink: link, code });
  } catch (err) {
    logger.error(`[GroupManagement] getInviteLink error: ${err.message}`);
    return res.status(500).json({ error: "Failed to get invite link" });
  }
};

export const revokeInviteLink = async (req: Request, res: Response): Promise<Response> => {
  const { jid } = req.params;
  const { whatsappId } = req.body;
  const { companyId } = req.user;
  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

  try {
    const wbot = getWbot(wa.id);
    await (wbot as any).groupRevokeInvite(jid);
    const newCode = await (wbot as any).groupInviteCode(jid);
    return res.json({ success: true, newInviteLink: `https://chat.whatsapp.com/${newCode}` });
  } catch (err) {
    logger.error(`[GroupManagement] revokeInviteLink error: ${err.message}`);
    return res.status(500).json({ error: "Failed to revoke invite link" });
  }
};

export const tagAll = async (req: Request, res: Response): Promise<Response> => {
  const { jid } = req.params;
  const { whatsappId, message } = req.body;
  const { companyId } = req.user;
  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "WhatsApp connection not found" });

  try {
    const wbot = getWbot(wa.id);
    const provider = ProviderFactory.createProvider(wa, wbot, companyId);
    await provider.mentionAll(jid, message || "");
    return res.json({ success: true });
  } catch (err) {
    logger.error(`[GroupManagement] tagAll error: ${err.message}`);
    return res.status(500).json({ error: "Failed to tag all members" });
  }
};

export const bulkSend = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    whatsappId,
    groupIds = [],
    message = "",
    mentionsMode = "none",
    segmentedMentions = [],
    scheduleAt = null,
    intervalSeconds = 2
  } = req.body;

  const selectedGroups = await resolveGroupSelection(companyId, {
    groupIds,
    filters: { whatsappId }
  });

  if (!selectedGroups.length) {
    return res.status(400).json({ error: "Nenhum grupo selecionado." });
  }

  const campaign = await GroupCampaign.create({
    companyId,
    whatsappId: Number(whatsappId),
    name: `Envio manual ${new Date().toLocaleString("pt-BR")}`,
    status: scheduleAt ? "SCHEDULED" : "PROCESSING",
    messageType: "text",
    mentionsMode,
    message,
    segmentedMentions,
    groupIds: selectedGroups.map((g) => g.id),
    scheduledAt: scheduleAt ? new Date(scheduleAt) : null,
    intervalSeconds: Number(intervalSeconds) || 2,
    recurrenceRule: "none"
  });

  await upsertCampaignTargets(campaign, selectedGroups);
  if (!scheduleAt) processGroupCampaignById(campaign.id);

  return res.status(201).json(campaign);
};

export const updateGroupMeta = async (req: Request, res: Response): Promise<Response> => {
  const { groupId } = req.params;
  const { tags, isFavorite } = req.body;
  const { companyId } = req.user;
  const group = await GroupDirectory.findOne({ where: { id: Number(groupId), companyId } });
  if (!group) return res.status(404).json({ error: "Grupo não encontrado." });
  await group.update({
    tags: Array.isArray(tags) ? tags : group.tags,
    isFavorite: typeof isFavorite === "boolean" ? isFavorite : group.isFavorite
  });
  return res.json(group);
};

export const listTemplates = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const templates = await GroupTemplate.findAll({
    where: { companyId },
    order: [["isFavorite", "DESC"], ["name", "ASC"]]
  });
  return res.json(templates);
};

export const createTemplate = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Nome do template é obrigatório." });
  }
  const template = await GroupTemplate.create({
    companyId,
    ...req.body
  });
  return res.status(201).json(template);
};

export const updateTemplate = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const template = await GroupTemplate.findOne({ where: { id, companyId } });
  if (!template) return res.status(404).json({ error: "Template não encontrado." });
  await template.update(req.body);
  return res.json(template);
};

export const deleteTemplate = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const template = await GroupTemplate.findOne({ where: { id, companyId } });
  if (!template) return res.status(404).json({ error: "Template não encontrado." });
  await template.destroy();
  return res.status(204).send();
};

export const listCampaigns = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const where: any = { companyId };
  if (req.query.status) where.status = req.query.status;
  if (req.query.whatsappId) where.whatsappId = Number(req.query.whatsappId);
  if (req.query.search) where.name = { [Op.iLike]: `%${String(req.query.search).trim()}%` };

  const campaigns = await GroupCampaign.findAll({
    where,
    include: [
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name", "number"], required: false },
      { model: GroupTemplate, as: "template", attributes: ["id", "name"], required: false }
    ],
    order: [["createdAt", "DESC"]],
    limit: Math.min(Number(req.query.limit) || 200, 500)
  });
  return res.json(campaigns);
};

export const createCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    name,
    whatsappId,
    templateId,
    messageType = "text",
    mentionsMode = "none",
    message = "",
    buttons = [],
    listItems = [],
    segmentedMentions = [],
    filters = {},
    groupIds = [],
    scheduledAt,
    recurrenceRule = "none",
    intervalSeconds = 2,
    windowStart,
    windowEnd,
    mediaPath,
    mediaName
  } = req.body;

  const wa = await ensureConnectionAccess(companyId, Number(whatsappId));
  if (!wa) return res.status(404).json({ error: "Conexão não encontrada." });

  const groups = await resolveGroupSelection(companyId, { groupIds, filters });
  if (!groups.length) return res.status(400).json({ error: "Nenhum grupo encontrado para os filtros selecionados." });

  const campaign = await GroupCampaign.create({
    companyId,
    whatsappId: Number(whatsappId),
    templateId: templateId || null,
    name: name || `Campanha de grupos ${new Date().toLocaleString("pt-BR")}`,
    status: scheduledAt ? "SCHEDULED" : "PROCESSING",
    messageType,
    mentionsMode,
    message,
    buttons,
    listItems,
    segmentedMentions,
    filters,
    groupIds: groups.map((g) => g.id),
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    recurrenceRule,
    intervalSeconds: Number(intervalSeconds) || 2,
    windowStart: windowStart || null,
    windowEnd: windowEnd || null,
    mediaPath: mediaPath || null,
    mediaName: mediaName || null
  });

  await upsertCampaignTargets(campaign, groups);
  await GroupCampaignLog.create({
    companyId,
    campaignId: campaign.id,
    type: "CREATED",
    message: "Campanha criada",
    payload: { totalGroups: groups.length, recurrenceRule }
  });

  if (!scheduledAt) processGroupCampaignById(campaign.id);
  return res.status(201).json(campaign);
};

export const uploadMedia = async (req: Request, res: Response): Promise<Response> => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  return res.json({
    mediaPath: req.file.filename,
    mediaName: req.file.originalname
  });
};

export const showCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const campaign = await GroupCampaign.findOne({
    where: { id, companyId },
    include: [
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name", "number"], required: false },
      { model: GroupTemplate, as: "template", attributes: ["id", "name"], required: false }
    ]
  });
  if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });
  return res.json(campaign);
};

export const updateCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const campaign = await GroupCampaign.findOne({ where: { id, companyId } });
  if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });
  if (["PROCESSING"].includes(campaign.status)) return res.status(400).json({ error: "Campanha em processamento não pode ser editada." });

  const next = { ...req.body };
  if (next.scheduledAt) next.scheduledAt = new Date(next.scheduledAt);
  await campaign.update(next);

  if (req.body.groupIds || req.body.filters) {
    const groups = await resolveGroupSelection(companyId, {
      groupIds: req.body.groupIds || campaign.groupIds,
      filters: req.body.filters || campaign.filters
    });
    await upsertCampaignTargets(campaign, groups);
  }

  return res.json(campaign);
};

export const deleteCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const campaign = await GroupCampaign.findOne({ where: { id, companyId } });
  if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });
  await GroupCampaignLog.destroy({ where: { companyId, campaignId: campaign.id } });
  await GroupCampaignTarget.destroy({ where: { companyId, campaignId: campaign.id } });
  await campaign.destroy();
  return res.status(204).send();
};

export const duplicateCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const campaign = await GroupCampaign.findOne({ where: { id, companyId } });
  if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });

  const payload: any = campaign.get({ plain: true });
  delete payload.id;
  delete payload.createdAt;
  delete payload.updatedAt;

  const clone = await GroupCampaign.create({
    ...payload,
    name: `${campaign.name} (cópia)`,
    status: "DRAFT",
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    processedGroups: 0,
    successCount: 0,
    failedCount: 0
  } as any);

  const targets = await GroupCampaignTarget.findAll({ where: { companyId, campaignId: campaign.id } });
  await GroupCampaignTarget.bulkCreate(targets.map((t) => ({
    companyId,
    campaignId: clone.id,
    groupId: t.groupId,
    groupJid: t.groupJid,
    status: "PENDING"
  })));

  await clone.update({ totalGroups: targets.length });
  return res.status(201).json(clone);
};

const updateCampaignStatus = async (companyId: number, campaignId: string, status: string, message: string) => {
  const campaign = await GroupCampaign.findOne({ where: { id: campaignId, companyId } });
  if (!campaign) return null;
  await campaign.update({ status, ...(status === "CANCELED" ? { completedAt: new Date() } : {}) });
  await GroupCampaignLog.create({ companyId, campaignId: campaign.id, type: status, message });
  return campaign;
};

export const startCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const campaign = await updateCampaignStatus(companyId, req.params.id, "PROCESSING", "Campanha iniciada manualmente");
  if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });
  processGroupCampaignById(campaign.id);
  return res.json({ success: true });
};

export const pauseCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const campaign = await updateCampaignStatus(companyId, req.params.id, "PAUSED", "Campanha pausada");
  if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });
  return res.json({ success: true });
};

export const resumeCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const campaign = await updateCampaignStatus(companyId, req.params.id, "PROCESSING", "Campanha retomada");
  if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });
  processGroupCampaignById(campaign.id);
  return res.json({ success: true });
};

export const cancelCampaign = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const campaign = await updateCampaignStatus(companyId, req.params.id, "CANCELED", "Campanha cancelada");
  if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });
  await GroupCampaignTarget.update({ status: "CANCELED" }, {
    where: { companyId, campaignId: campaign.id, status: { [Op.in]: ["PENDING", "PROCESSING"] } }
  });
  return res.json({ success: true });
};

export const listCampaignLogs = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const logs = await GroupCampaignLog.findAll({
    where: { companyId, campaignId: id },
    order: [["createdAt", "DESC"]],
    limit: Math.min(Number(req.query.limit) || 300, 1000)
  });
  return res.json(logs);
};

export const campaignReport = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const campaign = await GroupCampaign.findOne({ where: { id, companyId } });
  if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });

  const [pending, sent, failed, canceled] = await Promise.all([
    GroupCampaignTarget.count({ where: { companyId, campaignId: campaign.id, status: "PENDING" } }),
    GroupCampaignTarget.count({ where: { companyId, campaignId: campaign.id, status: "SENT" } }),
    GroupCampaignTarget.count({ where: { companyId, campaignId: campaign.id, status: "FAILED" } }),
    GroupCampaignTarget.count({ where: { companyId, campaignId: campaign.id, status: "CANCELED" } })
  ]);

  const successRate = campaign.totalGroups > 0 ? Number(((sent / campaign.totalGroups) * 100).toFixed(2)) : 0;
  const failureRate = campaign.totalGroups > 0 ? Number(((failed / campaign.totalGroups) * 100).toFixed(2)) : 0;

  return res.json({
    campaign,
    totals: {
      totalGroups: campaign.totalGroups,
      pending,
      sent,
      failed,
      canceled,
      successRate,
      failureRate
    }
  });
};

export const listSchedules = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const schedules = await GroupCampaign.findAll({
    where: {
      companyId,
      status: { [Op.in]: ["SCHEDULED", "PAUSED", "PROCESSING"] }
    },
    order: [["scheduledAt", "ASC"]]
  });
  return res.json(schedules);
};

export const history = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  const where: any = { companyId };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = from;
    if (to) where.createdAt[Op.lte] = to;
  }
  const logs = await GroupCampaignLog.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: Math.min(Number(req.query.limit) || 500, 2000)
  });
  return res.json(logs);
};

export const reports = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const campaigns = await GroupCampaign.findAll({
    where: { companyId },
    order: [["createdAt", "DESC"]],
    limit: 200
  });

  const summary = {
    totalCampaigns: campaigns.length,
    sent: campaigns.filter((c) => c.status === "SENT").length,
    scheduled: campaigns.filter((c) => c.status === "SCHEDULED").length,
    failed: campaigns.filter((c) => c.status === "FAILED").length,
    processing: campaigns.filter((c) => c.status === "PROCESSING").length
  };

  return res.json({
    summary,
    campaigns
  });
};
