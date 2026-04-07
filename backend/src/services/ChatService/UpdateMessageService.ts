import AppError from "../../errors/AppError";
import ChatMessage from "../../models/ChatMessage";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";
import RefreshChatSummaryService from "./RefreshChatSummaryService";

interface Request {
  chatId: number;
  messageId: number;
  companyId: number;
  userId: number;
  message: string;
}

interface Response {
  chat: any;
  message: ChatMessage;
}

const UpdateMessageService = async ({
  chatId,
  messageId,
  companyId,
  userId,
  message
}: Request): Promise<Response> => {
  const trimmedMessage = String(message || "").trim();

  if (!trimmedMessage) {
    throw new AppError("ERR_CHAT_MESSAGE_EMPTY", 400);
  }

  const userInChat = await ChatUser.count({
    where: { chatId, userId, companyId }
  });

  if (userInChat === 0) {
    throw new AppError("UNAUTHORIZED", 400);
  }

  const record = await ChatMessage.findOne({
    where: { id: messageId, chatId, companyId },
    include: [{ model: User, as: "sender", attributes: ["id", "name"] }]
  });

  if (!record) {
    throw new AppError("ERR_NO_CHAT_MESSAGE_FOUND", 404);
  }

  if (record.senderId !== userId) {
    throw new AppError("ERR_FORBIDDEN", 403);
  }

  await record.update({ message });
  await record.reload({
    include: [{ model: User, as: "sender", attributes: ["id", "name"] }]
  });

  const chat = await RefreshChatSummaryService({ chatId, companyId });

  return {
    chat,
    message: record
  };
};

export default UpdateMessageService;
