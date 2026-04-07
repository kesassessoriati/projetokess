import fs from "fs";
import path from "path";
import AppError from "../../errors/AppError";
import ChatMessage from "../../models/ChatMessage";
import ChatUser from "../../models/ChatUser";
import RefreshChatSummaryService from "./RefreshChatSummaryService";

interface Request {
  chatId: number;
  messageId: number;
  companyId: number;
  userId: number;
}

interface Response {
  chat: any;
  deletedMessageId: number;
}

const DeleteMessageService = async ({
  chatId,
  messageId,
  companyId,
  userId
}: Request): Promise<Response> => {
  const userInChat = await ChatUser.count({
    where: { chatId, userId, companyId }
  });

  if (userInChat === 0) {
    throw new AppError("UNAUTHORIZED", 400);
  }

  const record = await ChatMessage.findOne({
    where: { id: messageId, chatId, companyId }
  });

  if (!record) {
    throw new AppError("ERR_NO_CHAT_MESSAGE_FOUND", 404);
  }

  if (record.senderId !== userId) {
    throw new AppError("ERR_FORBIDDEN", 403);
  }

  await record.destroy();

  if (record.mediaPath) {
    const mediaPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "public",
      record.mediaPath.replace(/^\/+/, "")
    );

    if (fs.existsSync(mediaPath)) {
      fs.unlinkSync(mediaPath);
    }
  }

  const chatUsers = await ChatUser.findAll({
    where: { chatId, companyId }
  });

  for (const chatUser of chatUsers) {
    if (chatUser.userId !== userId && chatUser.unreads > 0) {
      await chatUser.update({ unreads: chatUser.unreads - 1 });
    }
  }

  const chat = await RefreshChatSummaryService({ chatId, companyId });

  return {
    chat,
    deletedMessageId: record.id
  };
};

export default DeleteMessageService;
