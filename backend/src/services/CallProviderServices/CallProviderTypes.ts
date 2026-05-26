export type CallProviderType = "sip" | "wavoip" | "manual" | "unknown";

export type CallProviderDirection = "inbound" | "outbound";

export type CallProviderStatus =
  | "ringing"
  | "answered"
  | "missed"
  | "busy"
  | "rejected"
  | "failed";

export type StartCallProviderParams = {
  companyId: number;
  userId?: number | null;
  provider: CallProviderType;
  fromNumber?: string | null;
  toNumber: string;
  contactId?: number | null;
  ticketId?: number | null;
  leadId?: number | null;
  opportunityId?: number | null;
  metadata?: Record<string, unknown>;
};

export type NormalizedCallProviderEvent = {
  provider: CallProviderType;
  externalCallId?: string | null;
  direction: CallProviderDirection;
  status: CallProviderStatus;
  fromNumber?: string | null;
  toNumber?: string | null;
  startedAt?: Date | null;
  answeredAt?: Date | null;
  endedAt?: Date | null;
  duration?: number | null;
  metadata?: Record<string, unknown>;
};

export type CallProviderAdapter = {
  provider: CallProviderType;
  startCall?: (params: StartCallProviderParams) => Promise<NormalizedCallProviderEvent>;
  endCall?: (params: { companyId: number; externalCallId?: string | null }) => Promise<void>;
  normalizeEvent?: (payload: unknown) => NormalizedCallProviderEvent;
};

export const CALL_PROVIDER_TYPES: CallProviderType[] = [
  "sip",
  "wavoip",
  "manual",
  "unknown"
];

export const normalizeCallProvider = (provider?: string | null): CallProviderType => {
  const normalized = String(provider || "").trim().toLowerCase();

  if (CALL_PROVIDER_TYPES.includes(normalized as CallProviderType)) {
    return normalized as CallProviderType;
  }

  return "manual";
};
