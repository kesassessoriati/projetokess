import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

interface MessageEntry {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

const InternalAgentMessageHistoryService = async (
  ticketId: number,
  companyId: number,
  limit: number = 20
): Promise<MessageEntry[]> => {
  const messages = await Message.findAll({
    where: { ticketId },
    include: [
      {
        model: Ticket,
        as: "ticket",
        where: { companyId },
        attributes: []
      }
    ],
    order: [["createdAt", "ASC"]],
    limit,
    attributes: ["body", "fromMe", "createdAt", "mediaType"]
  });

  return messages
    .filter(m => m.mediaType === "chat" || m.mediaType === "extendedTextMessage" || !m.mediaType)
    .map(m => ({
      role: (m.fromMe ? "assistant" : "user") as "user" | "assistant",
      content: m.body || "",
      createdAt: m.createdAt
    }))
    .filter(m => m.content.trim().length > 0);
};

export default InternalAgentMessageHistoryService;
