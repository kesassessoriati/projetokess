import SipCallLog from "../models/SipCallLog";

interface UpdateStatusParams {
  companyId: number;
  callId?: string;
  providerCallId?: string;
  status: string;
  answeredAt?: Date;
  endedAt?: Date;
  recordingUrl?: string;
  metadata?: Record<string, any>;
}

const UpdateSipCallStatusService = async (params: UpdateStatusParams): Promise<SipCallLog | null> => {
  if (!params.callId && !params.providerCallId) {
    return null;
  }

  const where: any = { companyId: params.companyId };
  if (params.callId) where.callId = params.callId;
  if (params.providerCallId) where.providerCallId = params.providerCallId;

  const log = await SipCallLog.findOne({ where });

  if (!log) {
    return null;
  }

  const updateData: any = { status: params.status };

  if (params.answeredAt) {
    updateData.answeredAt = params.answeredAt;
  }

  if (params.endedAt) {
    updateData.endedAt = params.endedAt;
    if (log.startedAt) {
      updateData.duration = Math.max(0, Math.round((params.endedAt.getTime() - new Date(log.startedAt).getTime()) / 1000));
    }
  }

  if (params.recordingUrl) {
    updateData.recordingUrl = params.recordingUrl;
  }

  if (params.metadata) {
    updateData.metadata = { ...(log.metadata || {}), ...params.metadata };
  }

  await log.update(updateData);
  return log;
};

export default UpdateSipCallStatusService;