export const isGroupConversation = (ticket) => {
  if (!ticket) return false;

  if (ticket.isGroup === true) return true;
  if (ticket.status === "group") return true;

  const remoteJid = ticket?.contact?.remoteJid;
  if (typeof remoteJid === "string" && remoteJid.endsWith("@g.us")) return true;

  return false;
};

export const isPrivateConversation = (ticket) => !isGroupConversation(ticket);

export const getConversationType = (ticket) =>
  isGroupConversation(ticket) ? "group" : "private";

