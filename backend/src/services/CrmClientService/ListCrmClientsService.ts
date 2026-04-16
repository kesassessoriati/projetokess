import { Op, WhereOptions } from "sequelize";
import CrmClient from "../../models/CrmClient";
import Tag from "../../models/Tag";

interface Request {
  companyId: number;
  searchParam?: string;
  status?: "active" | "inactive" | "blocked";
  type?: "pf" | "pj";
  clientSinceYear?: number;
  ownerUserId?: number;
  pageNumber?: number;
  limit?: number;
}

const ListCrmClientsService = async ({
  companyId,
  searchParam,
  status,
  type,
  clientSinceYear,
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

  if (ownerUserId) {
    where.ownerUserId = ownerUserId;
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
