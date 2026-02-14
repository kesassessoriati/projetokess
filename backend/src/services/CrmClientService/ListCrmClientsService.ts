import { Op, WhereOptions } from "sequelize";
import CrmClient from "../../models/CrmClient";

interface Request {
  companyId: number;
  searchParam?: string;
  status?: "active" | "inactive" | "blocked";
  type?: "pf" | "pj";
  ownerUserId?: number;
  pageNumber?: number;
  limit?: number;
}

const ListCrmClientsService = async ({
  companyId,
  searchParam,
  status,
  type,
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

  const { rows, count } = await CrmClient.findAndCountAll({
    where,
    order: [["updatedAt", "DESC"]],
    limit,
    offset
  });

  return {
    clients: rows,
    count,
    hasMore: count > offset + rows.length
  };
};

export default ListCrmClientsService;
