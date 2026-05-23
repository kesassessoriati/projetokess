import SendInternalMessageSyncService from "../services/InternalMessageSync/SendInternalMessageSyncService";

export default {
  key: "internalMessageSyncQueue",

  async handle({ data }) {
    const { eventId, peerId, payload } = data;
    await SendInternalMessageSyncService({ eventId, peerId, payload });
  }
};
