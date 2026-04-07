import Chat from "../../models/Chat";
import ChatMessage from "../../models/ChatMessage";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";
import fs from "fs";
import path from "path";
import RefreshChatSummaryService from "./RefreshChatSummaryService";

export interface ChatMessageData {
  senderId: number;
  chatId: number;
  companyId: number;
  message: string;
  medias?: Express.Multer.File[];
}

export default async function CreateMessageService({
  senderId,
  chatId,
  companyId,
  message,
  medias
}: ChatMessageData) {
  let mediaPath = "";
  let mediaName = "";

  if (medias && medias.length > 0) {
    const media = medias[0];
    const dir = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "public",
      `company${companyId}`,
      "chat-media"
    );

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    mediaName = `${new Date().getTime()}-${media.originalname.replace(
      /\s/g,
      "_"
    )}`;
    const filePath = path.join(dir, mediaName);

    fs.writeFileSync(filePath, media.buffer as any);
    mediaPath = `/company${companyId}/chat-media/${mediaName}`;
  }

  const newMessage = await ChatMessage.create({
    senderId,
    chatId,
    companyId,
    message,
    mediaPath,
    mediaName
  });

  await RefreshChatSummaryService({ chatId, companyId });

  const chatUsers = await ChatUser.findAll({
    where: { chatId, companyId }
  });

  for (const chatUser of chatUsers) {
    if (chatUser.userId === senderId) {
      await chatUser.update({ unreads: 0 });
    } else {
      await chatUser.update({ unreads: chatUser.unreads + 1 });
    }
  }

  await newMessage.reload({
    include: [
      { model: User, as: "sender", attributes: ["id", "name"] },
      {
        model: Chat,
        as: "chat",
        include: [
          {
            model: ChatUser,
            as: "users",
            include: [{ model: User, as: "user" }]
          }
        ]
      }
    ]
  });

  return newMessage;
}
