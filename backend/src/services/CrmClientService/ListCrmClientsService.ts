import { Op, WhereOptions } from "sequelize";
import CrmClient from "../../models/CrmClient";
import Tag from "../../models/Tag";

interface Request {
  companyId: number;
  searchParam?: string;
  status?: "active" | "inactive" | "blocked";
  type?: "pf" | "pj";
  product?: string;
  clientSinceYear?: number;
  expirationFilter?: string;
  ownerUserId?: number;
  pageNumber?: number;
  limit?: number;
}

const ListCrmClientsService = async ({
  companyId,
  searchParam,
  status,
  type,
  product,
  clientSinceYear,
  expirationFilter,
  ownerUserId,
  pageNumber = 1,
  limit = 20
}: Request) => {
  const where: WhereOptions = {
    companyId
  };

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  if (clientSinceYear) {
    (where as any).clientSince = {
      [Op.gte]: `${clientSinceYear}-01-01`,
      [Op.lt]: `${clientSinceYear + 1}-01-01`
    };
  }

  if (expirationFilter) {
    const formatDateOnly = (date: Date) => date.toISOString().split("T")[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDate = formatDateOnly(today);
    const addDays = (days: number) => {
      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + days);
      return formatDateOnly(nextDate);
    };

    if (expirationFilter === "expired") {
      (where as any).expirationDate = { [Op.lt]: todayDate };
    } else if (expirationFilter === "today") {
      (where as any).expirationDate = todayDate;
    } else if (expirationFilter === "no_expiration") {
      (where as any).expirationDate = { [Op.is]: null };
    } else if (expirationFilter.startsWith("next_")) {
      const days = Number(expirationFilter.replace("next_", ""));
      if (Number.isFinite(days) && days > 0) {
        (where as any).expirationDate = {
          [Op.gte]: todayDate,
          [Op.lte]: addDays(days)
        };
      }
    }
  }

  if (ownerUserId) {
    where.ownerUserId = ownerUserId;
  }

  if (product) {
    (where as any).acquiredProduct = {
      [Op.iLike]: `%${product.trim()}%`
    };
  }

  if (searchParam) {
    const like = { [Op.iLike]: `%${searchParam}%` };
    (where as any)[Op.or] = [
      { name: like },
      { companyName: like },
      { email: like },
      { phone: like },
      { document: like },
      { city: like }
    ];
  }

  const offset = (pageNumber - 1) * limit;

  const queryOptions: any = {
    where,
    order: [["updatedAt", "DESC"]],
    include: [
      {
        model: Tag,
        as: "assignedTags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] },
        required: false,
      },
    ],
  };

  // Skip pagination if limit is -1
  if (limit !== -1) {
    queryOptions.limit = limit;
    queryOptions.offset = offset;
  }

  const { rows, count } = await CrmClient.findAndCountAll({ ...queryOptions, distinct: true });

  return {
    clients: rows,
    count,
    hasMore: limit !== -1 ? count > offset + rows.length : false
  };
};

export default ListCrmClientsService;
