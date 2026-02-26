import AppError from "../../errors/AppError";
import ChatMessage from "../../models/ChatMessage";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";

import { sortBy } from "lodash";

interface Request {
  chatId: string;
  ownerId: number;
  companyId: number;
  pageNumber?: string;
}

interface Response {
  records: ChatMessage[];
  count: number;
  hasMore: boolean;
}

const FindMessages = async ({
  chatId,
  ownerId,
  companyId,
  pageNumber = "1"
}: Request): Promise<Response> => {
  const userInChat = await ChatUser.count({
    where: { chatId, userId: ownerId, companyId }
  });

  if (userInChat === 0) {
    throw new AppError("UNAUTHORIZED", 400);
  }

  const limit = 30;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: records } = await ChatMessage.findAndCountAll({
    where: {
      chatId,
      companyId
    },
    include: [{ model: User, as: "sender", attributes: ["id", "name"] }],
    limit,
    offset,

    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + records.length;

  const sorted = sortBy(records, ["id", "ASC"]);

  return {
    records: sorted,
    count,
    hasMore
  };
};

export default FindMessages;
