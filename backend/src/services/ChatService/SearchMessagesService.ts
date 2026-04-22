import { col, fn, Op, where } from "sequelize";
import Chat from "../../models/Chat";
import ChatMessage from "../../models/ChatMessage";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";

interface Request {
  ownerId: number;
  companyId: number;
  searchParam: string;
}

interface Response {
  records: ChatMessage[];
  count: number;
}

const SearchMessagesService = async ({
  ownerId,
  companyId,
  searchParam
}: Request): Promise<Response> => {
  const search = String(searchParam || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (!search) {
    return { records: [], count: 0 };
  }

  const chatUsers = await ChatUser.findAll({
    where: { userId: ownerId, companyId },
    attributes: ["chatId"]
  });

  const chatIds = chatUsers.map(chatUser => chatUser.chatId);

  if (chatIds.length === 0) {
    return { records: [], count: 0 };
  }

  const { count, rows: records } = await ChatMessage.findAndCountAll({
    where: {
      chatId: {
        [Op.in]: chatIds
      },
      companyId,
      [Op.and]: [
        where(fn("LOWER", col("ChatMessage.message")), {
          [Op.like]: `%${search}%`
        })
      ]
    },
    include: [
      {
        model: Chat,
        as: "chat",
        include: [
          { model: User, as: "owner" },
          { model: ChatUser, as: "users", include: [{ model: User, as: "user" }] }
        ]
      },
      { model: User, as: "sender", attributes: ["id", "name"] }
    ],
    limit: 20,
    order: [["createdAt", "DESC"]]
  });

  return {
    records,
    count
  };
};

export default SearchMessagesService;
