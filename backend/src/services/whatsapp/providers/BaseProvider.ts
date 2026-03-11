export abstract class BaseProvider {
  protected connection: any;
  protected tenantId: number | string;

  constructor(connection: any, tenantId?: number | string) {
    this.connection = connection;
    this.tenantId = tenantId;
  }

  abstract sendMessage(to: string, content: any): Promise<any>;
  abstract sendMedia(to: string, mediaPath: string, caption?: string): Promise<any>;
  abstract getGroups(): Promise<any>;
  abstract getGroupMembers(groupId: string): Promise<any>;
  abstract getGroupMetadata(groupId: string): Promise<any>;
  abstract sendGroupMessage(groupId: string, content: any): Promise<any>;
  abstract sendGroupMedia(groupId: string, mediaPath: string, caption?: string): Promise<any>;
  abstract promoteMember(groupId: string, memberId: string): Promise<any>;
  abstract demoteMember(groupId: string, memberId: string): Promise<any>;
  abstract removeMember(groupId: string, memberId: string): Promise<any>;
  abstract addMember(groupId: string, memberId: string): Promise<any>;
  abstract generateInviteLink(groupId: string): Promise<string>;
  abstract revokeInviteLink(groupId: string): Promise<string>;
  abstract createGroup(subject: string, participants: string[]): Promise<any>;
  abstract updateGroupSubject(groupId: string, subject: string): Promise<any>;
  abstract updateGroupDescription(groupId: string, description: string): Promise<any>;
  abstract mentionAll(groupId: string, message: string): Promise<any>;
}
