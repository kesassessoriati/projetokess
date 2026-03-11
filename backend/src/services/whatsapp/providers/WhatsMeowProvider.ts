import { BaseProvider } from "./BaseProvider";
import axios from "axios";

export class WhatsMeowProvider extends BaseProvider {
  private baseUrl: string;
  private sessionId: string;

  constructor(connection: any, tenantId?: number | string) {
    super(connection, tenantId);
    // connection should preferably be the session name in this case
    this.sessionId = connection?.name || "default";
    this.baseUrl = process.env.WHATSMEOW_URL || "http://localhost:3001";
  }

  async sendMessage(to: string, content: any): Promise<any> {
    const text = typeof content === "string" ? content : content.text || content.caption || "";
    // Note: If content contains media or specific formats, it should be mapped
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
      mediaPath, // Go API implementation of media not ready for multipart yet, just a payload
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
    // Future mock of /groups/media
    return await this.sendGroupMessage(id, { text: "Group Media: " + caption });
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

  async generateInviteLink(groupId: string): Promise<any> {
    const id = groupId.replace("@g.us", "");
    const res = await axios.get(`${this.baseUrl}/groups/invite?session=${this.sessionId}&group_id=${id}`);
    return res.data.link;
  }

  async mentionAll(groupId: string, message: string): Promise<any> {
    // If not supported natively by Go API yet, just send regular msg
    return await this.sendGroupMessage(groupId, message);
  }
}
