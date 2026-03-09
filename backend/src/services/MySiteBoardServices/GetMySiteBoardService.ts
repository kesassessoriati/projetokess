import { Op } from "sequelize";
import MySiteBoardColumn from "../../models/MySiteBoardColumn";
import MySiteBoardCard from "../../models/MySiteBoardCard";
import MySiteBoardChecklistItem from "../../models/MySiteBoardChecklistItem";
import MySiteBoardComment from "../../models/MySiteBoardComment";
import MySiteBoardAttachment from "../../models/MySiteBoardAttachment";
import User from "../../models/User";
import EnsureDefaultMySiteColumnsService from "./EnsureDefaultMySiteColumnsService";

interface Request {
  companyId: number;
  search?: string;
  responsible?: string;
  priority?: string;
  tag?: string;
  withDueDate?: boolean;
}

const GetMySiteBoardService = async ({
  companyId,
  search,
  responsible,
  priority,
  tag,
  withDueDate
}: Request): Promise<MySiteBoardColumn[]> => {
  await EnsureDefaultMySiteColumnsService({ companyId });

  const cardWhere: any = { companyId };

  if (search) {
    cardWhere[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { url: { [Op.iLike]: `%${search}%` } }
    ];
  }
  if (responsible) cardWhere.responsible = { [Op.iLike]: `%${responsible}%` };
  if (priority) cardWhere.priority = priority;
  if (withDueDate) cardWhere.dueDate = { [Op.not]: null };
  if (tag) cardWhere.tags = { [Op.contains]: [tag] };

  const columns = await MySiteBoardColumn.findAll({
    where: { companyId },
    include: [
      {
        model: MySiteBoardCard,
        as: "cards",
        where: cardWhere,
        required: false,
        include: [
          { model: MySiteBoardChecklistItem, as: "checklistItems" },
          { model: MySiteBoardComment, as: "comments", include: [{ model: User, as: "user", attributes: ["id", "name"] }] },
          { model: MySiteBoardAttachment, as: "attachments" }
        ]
      }
    ],
    order: [
      ["order", "ASC"],
      [{ model: MySiteBoardCard, as: "cards" }, "order", "ASC"],
      [{ model: MySiteBoardCard, as: "cards" }, { model: MySiteBoardChecklistItem, as: "checklistItems" }, "order", "ASC"],
      [{ model: MySiteBoardCard, as: "cards" }, { model: MySiteBoardComment, as: "comments" }, "createdAt", "DESC"],
      [{ model: MySiteBoardCard, as: "cards" }, { model: MySiteBoardAttachment, as: "attachments" }, "createdAt", "DESC"]
    ]
  });

  return columns;
};

export default GetMySiteBoardService;

