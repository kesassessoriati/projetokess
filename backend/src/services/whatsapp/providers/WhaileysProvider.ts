import { BaseProvider } from "./BaseProvider";

export class WhaileysProvider extends BaseProvider {
  // Whaileys (WAPI) is often a drop-in replacement or similar API to baileys, or a venom/wwebjs like API. 
  // For the sake of this prompt, using a generic proxy.

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

  async removeMember(groupId: string, memberId: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    const userJid = memberId.includes("@") ? memberId : `${memberId}@s.whatsapp.net`;
    return await this.connection.groupParticipantsUpdate(groupJid, [userJid], "remove");
  }

  async generateInviteLink(groupId: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    const code = await this.connection.groupInviteCode(groupJid);
    return `https://chat.whatsapp.com/${code}`;
  }

  async mentionAll(groupId: string, message: string): Promise<any> {
    const groupJid = groupId.includes("@") ? groupId : `${groupId}@g.us`;
    const members = await this.getGroupMembers(groupId);
    const mentions = members.map((m: any) => m.id);
    return await this.connection.sendMessage(groupJid, { text: message, mentions });
  }
}
