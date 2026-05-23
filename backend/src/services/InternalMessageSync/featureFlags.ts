const isEnabled = (value?: string): boolean =>
  ["true", "1", "yes", "on", "enabled"].includes(
    String(value || "").toLowerCase()
  );

export const isInternalMessageSyncEnabled = (): boolean =>
  isEnabled(process.env.INTERNAL_MESSAGE_SYNC_ENABLED);

export const isInternalMessageSyncInboundEnabled = (): boolean =>
  isInternalMessageSyncEnabled() &&
  isEnabled(process.env.INTERNAL_MESSAGE_SYNC_INBOUND_ENABLED);

export const isInternalMessageSyncOutboundEnabled = (): boolean =>
  isInternalMessageSyncEnabled() &&
  isEnabled(process.env.INTERNAL_MESSAGE_SYNC_OUTBOUND_ENABLED);

export const getInternalMessageSyncServerId = (): string =>
  String(process.env.INTERNAL_MESSAGE_SYNC_SERVER_ID || "").trim();
