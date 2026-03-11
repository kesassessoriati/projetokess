import { BaseProvider } from "./BaseProvider";
import axios from "axios";

export class WhatsMeowProvider extends BaseProvider {
  private baseUrl: string;
  private sessionId: string;

  constructor(connection: any, tenantId?: number | string) {
    super(connection, tenantId);
    this.sessionId = connection?.name || "default";
    this.baseUrl = process.env.WHATSMEOW_URL || "http://localhost:3001";
  }

  async sendMessage(to: string, content: any): Promise<any> {
    const text = typeof content === "string" ? content : content.text || content.caption || "";
    const res = await axios.post(`${this.baseUrl}/messages/send`, {
      session: this.sessionId,
      to,
      text
    });
    return res.data;
  }

  async sendMedia(to: string, mediaPath: string, caption?: string): Promise<any> {
    const res = await axios.post(`${this.baseUrl}/messages/media`, {
      session: this.sessionId,
      to,
      mediaPath,
      caption
    });
    return res.data;
  }

  async getGroups(): Promise<any> {
    const res = await axios.get(`${this.baseUrl}/groups?session=${this.sessionId}`);
    return res.data.groups;
  }

  async getGroupMembers(groupId: string): Promise<any> {
    const id = groupId.replace("@g.us", "");
    const res = await axios.get(`${this.baseUrl}/groups/${id}/members?session=${this.sessionId}`);
    return res.data.members;
  }

  async getGroupMetadata(groupId: string): Promise<any> {
    const id = groupId.replace("@g.us", "");
    const res = await axios.get(`${this.baseUrl}/groups/${id}?session=${this.sessionId}`);
    return res.data;
  }

  async sendGroupMessage(groupId: string, content: any): Promise<any> {
    const id = groupId.replace("@g.us", "");
    const text = typeof content === "string" ? content : content.text || content.caption || "";
    const res = await axios.post(`${this.baseUrl}/groups/send`, {
      session: this.sessionId,
      to: id,
      text
    });
    return res.data;
  }

  async sendGroupMedia(groupId: string, mediaPath: string, caption?: string): Promise<any> {
    const id = groupId.replace("@g.us", "");
    const res = await axios.post(`${this.baseUrl}/groups/media`, {
      session: this.sessionId,
      group_id: id,
      mediaPath,
      caption
    });
    return res.data;
  }

  async promoteMember(groupId: string, memberId: string): Promise<any> {
    const group_id = groupId.replace("@g.us", "");
    const member_id = memberId.replace("@s.whatsapp.net", "");
    const res = await axios.post(`${this.baseUrl}/groups/promote`, {
      session: this.sessionId,
      group_id,
      member_id
    });
    return res.data;
  }

  async demoteMember(groupId: string, memberId: string): Promise<any> {
    const group_id = groupId.replace("@g.us", "");
    const member_id = memberId.replace("@s.whatsapp.net", "");
    const res = await axios.post(`${this.baseUrl}/groups/demote`, {
      session: this.sessionId,
      group_id,
      member_id
    });
    return res.data;
  }

  async removeMember(groupId: string, memberId: string): Promise<any> {
    const group_id = groupId.replace("@g.us", "");
    const member_id = memberId.replace("@s.whatsapp.net", "");
    const res = await axios.post(`${this.baseUrl}/groups/remove`, {
      session: this.sessionId,
      group_id,
      member_id
    });
    return res.data;
  }

  async addMember(groupId: string, memberId: string): Promise<any> {
    const group_id = groupId.replace("@g.us", "");
    const member_id = memberId.replace("@s.whatsapp.net", "");
    const res = await axios.post(`${this.baseUrl}/groups/add`, {
      session: this.sessionId,
      group_id,
      member_id
    });
    return res.data;
  }

  async generateInviteLink(groupId: string): Promise<string> {
    const id = groupId.replace("@g.us", "");
    const res = await axios.get(`${this.baseUrl}/groups/invite?session=${this.sessionId}&group_id=${id}`);
    return res.data.link;
  }

  async revokeInviteLink(groupId: string): Promise<string> {
    const id = groupId.replace("@g.us", "");
    const res = await axios.post(`${this.baseUrl}/groups/revoke-invite`, {
      session: this.sessionId,
      group_id: id
    });
    return res.data.link || `https://chat.whatsapp.com/${res.data.code}`;
  }

  async createGroup(subject: string, participants: string[]): Promise<any> {
    const res = await axios.post(`${this.baseUrl}/groups/create`, {
      session: this.sessionId,
      subject,
      participants
    });
    return res.data;
  }

  async updateGroupSubject(groupId: string, subject: string): Promise<any> {
    const id = groupId.replace("@g.us", "");
    const res = await axios.post(`${this.baseUrl}/groups/subject`, {
      session: this.sessionId,
      group_id: id,
      subject
    });
    return res.data;
  }

  async updateGroupDescription(groupId: string, description: string): Promise<any> {
    const id = groupId.replace("@g.us", "");
    const res = await axios.post(`${this.baseUrl}/groups/description`, {
      session: this.sessionId,
      group_id: id,
      description
    });
    return res.data;
  }

  async mentionAll(groupId: string, message: string): Promise<any> {
    // WhatsMeow Go service doesn't support native mentions yet, falls back to regular group message
    return await this.sendGroupMessage(groupId, message);
  }
}
