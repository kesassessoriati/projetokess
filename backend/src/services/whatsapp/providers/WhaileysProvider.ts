import { BaseProvider } from "./BaseProvider";

import Jimp from "jimp";

export class WhaileysProvider extends BaseProvider {
  // Whaileys (WAPI) is often a drop-in replacement or similar API to baileys

  async sendMessage(to: string, content: any): Promise<any> {
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    return await this.connection.sendMessage(jid, content);
  }

  async sendMedia(to: string, mediaPath: string, caption?: string): Promise<any> {
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    return await this.connection.sendMessage(jid, { text: "Whaileys Media: " + caption });
  }

  async getGroups(): Promise<any> {
    if (this.connection.groupFetchAllParticipating) {
      return await this.connection.groupFetchAllParticipating();
    }
    return {};
  }

  async getGroupMembers(groupId: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    const metadata = await this.connection.groupMetadata(groupJid);
    return metadata?.participants || [];
  }

  async getGroupMetadata(groupId: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    return await this.connection.groupMetadata(groupJid);
  }

  async sendGroupMessage(groupId: string, content: any): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    return await this.connection.sendMessage(groupJid, content);
  }

  async sendGroupMedia(groupId: string, mediaPath: string, caption?: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    return await this.connection.sendMessage(groupJid, { text: "Whaileys Group Media: " + caption });
  }

  async promoteMember(groupId: string, memberId: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    const userJid = memberId.includes("@") ? memberId : `${memberId}@s.whatsapp.net`;
    return await this.connection.groupParticipantsUpdate(groupJid, [userJid], "promote");
  }

  async demoteMember(groupId: string, memberId: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    const userJid = memberId.includes("@") ? memberId : `${memberId}@s.whatsapp.net`;
    return await this.connection.groupParticipantsUpdate(groupJid, [userJid], "demote");
  }

  async removeMember(groupId: string, memberId: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    const userJid = memberId.includes("@") ? memberId : `${memberId}@s.whatsapp.net`;
    return await this.connection.groupParticipantsUpdate(groupJid, [userJid], "remove");
  }

  async addMember(groupId: string, memberId: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    const userJid = memberId.includes("@") ? memberId : `${memberId}@s.whatsapp.net`;
    return await this.connection.groupParticipantsUpdate(groupJid, [userJid], "add");
  }

  async generateInviteLink(groupId: string): Promise<string> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    const code = await this.connection.groupInviteCode(groupJid);
    return `https://chat.whatsapp.com/${code}`;
  }

  async revokeInviteLink(groupId: string): Promise<string> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    await this.connection.groupRevokeInvite(groupJid);
    const newCode = await this.connection.groupInviteCode(groupJid);
    return `https://chat.whatsapp.com/${newCode}`;
  }

  async createGroup(subject: string, participants: string[]): Promise<any> {
    return await this.connection.groupCreate(subject, participants);
  }

  async updateGroupSubject(groupId: string, subject: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    return await this.connection.groupUpdateSubject(groupJid, subject);
  }

  async updateGroupDescription(groupId: string, description: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    return await this.connection.groupUpdateDescription(groupJid, description);
  }

  async updateGroupPicture(groupId: string, filePath: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    if (typeof this.connection.updateProfilePicture !== "function") {
      throw new Error("Atualizacao de foto nao suportada nesta conexao.");
    }
    const image = await Jimp.read(filePath);
    image.cover(640, 640);
    const buffer = await image.quality(90).getBufferAsync(Jimp.MIME_JPEG);
    return await this.connection.updateProfilePicture(groupJid, buffer);
  }

  async mentionAll(groupId: string, message: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    const members = await this.getGroupMembers(groupId);
    const mentions = members.map((m: any) => m.id);
    return await this.connection.sendMessage(groupJid, { text: message, mentions });
  }
}
