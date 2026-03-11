import { Op } from "sequelize";
import Whatsapp from "../../models/Whatsapp";
import GroupDirectory from "../../models/GroupDirectory";
import GroupMember from "../../models/GroupMember";
import { getWbot } from "../../libs/wbot";
import logger from "../../utils/logger";
import { ProviderFactory } from "../whatsapp/providers/ProviderFactory";

type SyncParams = {
  companyId: number;
  whatsappIds?: number[];
};

const normalizeGroupRecord = (group: any) => {
  const participants = Array.isArray(group?.participants) ? group.participants : [];
  const adminCount = participants.filter((p: any) => p?.admin === "admin" || p?.admin === "superadmin").length;
  return {
    groupJid: String(group?.id || ""),
    subject: String(group?.subject || ""),
    description: String(group?.desc || ""),
    owner: String(group?.owner || ""),
    memberCount: participants.length,
    adminCount
  };
};

const normalizeWhatsMeowGroup = (group: any) => ({
  groupJid: String(group?.id || group?.jid || ""),
  subject: String(group?.name || group?.subject || group?.title || ""),
  description: String(group?.description || group?.desc || ""),
  owner: String(group?.owner || ""),
  memberCount: Number(group?.memberCount || group?.participant_count || 0),
  adminCount: 0
});

const normalizeWhatsMeowMember = (member: any) => ({
  memberJid: String(member?.id || member?.jid || ""),
  isAdmin: !!(member?.is_admin || member?.admin === "admin" || member?.admin === "superadmin"),
  isSuperAdmin: !!(member?.is_super_admin || member?.admin === "superadmin")
});

const syncBaileysConnection = async (connection: Whatsapp, companyId: number, summary: any) => {
  const wbot = getWbot(connection.id);
  const participating = await (wbot as any).groupFetchAllParticipating();
  const groupList = Object.values(participating || {}) as any[];

  for (const group of groupList) {
    const normalized = normalizeGroupRecord(group);
    if (!normalized.groupJid) continue;

    let directory = await GroupDirectory.findOne({ where: { companyId, groupJid: normalized.groupJid } });

    if (!directory) {
      directory = await GroupDirectory.create({
        companyId,
        whatsappId: connection.id,
        ...normalized,
        lastSyncAt: new Date(),
        isActive: true
      });
    } else {
      await directory.update({ whatsappId: connection.id, ...normalized, lastSyncAt: new Date(), isActive: true });
    }

    summary.groupsSynced += 1;

    const participants = Array.isArray(group?.participants) ? group.participants : [];
    await GroupMember.destroy({ where: { companyId, groupId: directory.id } });

    if (participants.length) {
      const members = participants
        .map((p: any) => ({
          companyId,
          groupId: directory.id,
          memberJid: String(p?.id || ""),
          isAdmin: p?.admin === "admin" || p?.admin === "superadmin",
          isSuperAdmin: p?.admin === "superadmin"
        }))
        .filter((m: any) => m.memberJid);

      if (members.length) {
        await GroupMember.bulkCreate(members);
        summary.membersSynced += members.length;
      }
    }
  }
};

const syncWhatsMeowConnection = async (connection: Whatsapp, companyId: number, summary: any) => {
  const provider = ProviderFactory.createProvider(connection, null, companyId);
  const groupList = (await provider.getGroups()) as any[];
  if (!Array.isArray(groupList)) return;

  for (const group of groupList) {
    const normalized = normalizeWhatsMeowGroup(group);
    if (!normalized.groupJid) continue;

    let members: any[] = [];
    try {
      const rawMembers = await provider.getGroupMembers(normalized.groupJid);
      members = Array.isArray(rawMembers) ? rawMembers : [];
    } catch (err) {
      logger.warn(`[GroupSync] WhatsMeow getGroupMembers failed for ${normalized.groupJid}: ${err?.message}`);
    }

    const adminCount = members.filter((m: any) => normalizeWhatsMeowMember(m).isAdmin).length;

    let directory = await GroupDirectory.findOne({ where: { companyId, groupJid: normalized.groupJid } });

    if (!directory) {
      directory = await GroupDirectory.create({
        companyId,
        whatsappId: connection.id,
        ...normalized,
        memberCount: members.length || normalized.memberCount,
        adminCount,
        lastSyncAt: new Date(),
        isActive: true
      });
    } else {
      await directory.update({
        whatsappId: connection.id,
        ...normalized,
        memberCount: members.length || normalized.memberCount,
        adminCount,
        lastSyncAt: new Date(),
        isActive: true
      });
    }

    summary.groupsSynced += 1;

    if (members.length) {
      await GroupMember.destroy({ where: { companyId, groupId: directory.id } });
      const memberRows = members
        .map((m: any) => {
          const norm = normalizeWhatsMeowMember(m);
          return { companyId, groupId: directory.id, ...norm };
        })
        .filter((m: any) => m.memberJid);

      if (memberRows.length) {
        await GroupMember.bulkCreate(memberRows);
        summary.membersSynced += memberRows.length;
      }
    }
  }
};

export const syncCompanyGroups = async ({ companyId, whatsappIds }: SyncParams): Promise<any> => {
  const where: any = { companyId, status: "CONNECTED" };
  if (Array.isArray(whatsappIds) && whatsappIds.length) {
    where.id = { [Op.in]: whatsappIds.map(Number).filter(Boolean) };
  }

  const connections = await Whatsapp.findAll({
    where,
    attributes: ["id", "name", "number", "status", "provider"]
  });

  const summary = {
    connections: connections.length,
    groupsSynced: 0,
    membersSynced: 0,
    failures: [] as any[]
  };

  for (const connection of connections) {
    try {
      if (connection.provider === "whatsmeow") {
        await syncWhatsMeowConnection(connection, companyId, summary);
      } else {
        await syncBaileysConnection(connection, companyId, summary);
      }
    } catch (error) {
      logger.warn(`[GroupSync] Failed for connection ${connection.id}: ${error?.message}`);
      summary.failures.push({
        whatsappId: connection.id,
        whatsappName: connection.name,
        error: error?.message || "Unknown error"
      });
    }
  }

  return summary;
};
