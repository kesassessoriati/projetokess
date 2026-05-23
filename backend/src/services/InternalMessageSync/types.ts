export interface InternalMessageSyncPayload {
  event: "message.sent.fallback";
  version: 1;
  source: {
    serverId: string;
    companyId: number;
    whatsappId: number;
    number: string;
    remoteJid: string;
  };
  target: {
    serverId: string;
    companyId: number;
    whatsappId: number;
    number: string;
    remoteJid: string;
  };
  message: {
    wid: string;
    type: string;
    body: string;
    timestamp: string;
    fromMe?: boolean;
    ack?: number;
  };
  dedupe?: {
    payloadHash?: string;
    originalTicketId?: number;
  };
}
