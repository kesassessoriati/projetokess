import Chat from "../../models/Chat";
import ChatMessage from "../../models/ChatMessage";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";
import AppError from "../../errors/AppError";
import BuildLastMessagePreview from "./BuildLastMessagePreview";

interface Request {
  chatId: number;
  companyId: number;
}

const chatIncludes = [
  { model: User, as: "owner" },
  { model: ChatUser, as: "users", include: [{ model: User, as: "user" }] }
];

const RefreshChatSummaryService = async ({
  chatId,
  companyId
}: Request): Promise<Chat> => {
  const chat = await Chat.findOne({
    where: { id: chatId, companyId },
    include: chatIncludes
  });

  if (!chat) {
    throw new AppError("ERR_NO_CHAT_FOUND", 404);
  }

  const lastMessage = await ChatMessage.findOne({
    where: { chatId, companyId },
    include: [{ model: User, as: "sender", attributes: ["id", "name"] }],
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"]
    ]
  });

  await chat.update({
    lastMessage: BuildLastMessagePreview(lastMessage)
  });

  await chat.reload({
    include: chatIncludes
  });

  return chat;
};

export default RefreshChatSummaryService;
