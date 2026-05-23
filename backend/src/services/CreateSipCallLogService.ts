import SipCallLog from "../models/SipCallLog";
import { v4 as uuidv4 } from "uuid";

interface CreateCallLogParams {
  companyId: number;
  direction: string;
  status: string;
  fromNumber: string;
  toNumber: string;
  didId?: number;
  extensionId?: number;
  userId?: number;
  queueId?: number;
  channelId?: number;
  ticketId?: number;
  contactId?: number;
  callId?: string;
  providerCallId?: string;
  metadata?: Record<string, any>;
}

const CreateSipCallLogService = async (params: CreateCallLogParams): Promise<SipCallLog> => {
  const log = await SipCallLog.create({
    companyId: params.companyId,
    callId: params.callId || `call-${uuidv4()}`,
    providerCallId: params.providerCallId,
    direction: params.direction,
    status: params.status,
    fromNumber: params.fromNumber,
    toNumber: params.toNumber,
    didId: params.didId || null,
    extensionId: params.extensionId || null,
    userId: params.userId || null,
    queueId: params.queueId || null,
    channelId: params.channelId || null,
    ticketId: params.ticketId || null,
    contactId: params.contactId || null,
    startedAt: new Date(),
    metadata: params.metadata || {}
  });

  return log;
};

export default CreateSipCallLogService;