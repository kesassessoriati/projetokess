import { Op } from "sequelize";
import Whatsapp from "../../models/Whatsapp";
import GroupDirectory from "../../models/GroupDirectory";
import GroupMember from "../../models/GroupMember";
import { getWbot } from "../../libs/wbot";
import logger from "../../utils/logger";

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

export const syncCompanyGroups = async ({ companyId, whatsappIds }: SyncParams): Promise<any> => {
  const where: any = {
    companyId,
    status: "CONNECTED"
  };
  if (Array.isArray(whatsappIds) && whatsappIds.length) {
    where.id = { [Op.in]: whatsappIds.map(Number).filter(Boolean) };
  }

  const connections = await Whatsapp.findAll({
    where,
    attributes: ["id", "name", "number", "status"]
  });

  const summary = {
    connections: connections.length,
    groupsSynced: 0,
    membersSynced: 0,
    failures: [] as any[]
  };

  for (const connection of connections) {
    try {
      const wbot = getWbot(connection.id);
      const participating = await (wbot as any).groupFetchAllParticipating();
      const groupList = Object.values(participating || {}) as any[];

      for (const group of groupList) {
        const normalized = normalizeGroupRecord(group);
        if (!normalized.groupJid) continue;

        let directory = await GroupDirectory.findOne({
          where: {
            companyId,
            groupJid: normalized.groupJid
          }
        });

        if (!directory) {
          directory = await GroupDirectory.create({
            companyId,
            whatsappId: connection.id,
            ...normalized,
            lastSyncAt: new Date(),
            isActive: true
          });
        } else {
          await directory.update({
            whatsappId: connection.id,
            ...normalized,
            lastSyncAt: new Date(),
            isActive: true
          });
        }

        summary.groupsSynced += 1;

        const participants = Array.isArray(group?.participants) ? group.participants : [];
        await GroupMember.destroy({ where: { companyId, groupId: directory.id } });

        if (participants.length) {
          const members = participants.map((participant: any) => ({
            companyId,
            groupId: directory.id,
            memberJid: String(participant?.id || ""),
            isAdmin: participant?.admin === "admin" || participant?.admin === "superadmin",
            isSuperAdmin: participant?.admin === "superadmin"
          })).filter((m: any) => m.memberJid);

          if (members.length) {
            await GroupMember.bulkCreate(members);
            summary.membersSynced += members.length;
          }
        }
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

