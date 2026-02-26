import { Op, WhereOptions } from "sequelize";
import CrmLead from "../../models/CrmLead";

interface Request {
  companyId: number;
  searchParam?: string;
  status?: string;
  ownerUserId?: number;
  pageNumber?: number;
  limit?: number;
  profile: string;
  userId: number;
}

const ListCrmLeadsService = async ({
  companyId,
  searchParam,
  status,
  ownerUserId,
  pageNumber = 1,
  limit = 20,
  profile,
  userId
}: Request) => {
  const where: WhereOptions = {
    companyId
  };

  if (profile !== "admin") {
    // Agentes só veem seus próprios leads ou leads sem dono (dependendo da regra de negócio, vou restringir aos deles)
    where.ownerUserId = userId;
  } else if (ownerUserId) {
    where.ownerUserId = ownerUserId;
  }

  if (status) {
    where.status = status;
  }

  if (searchParam) {
    const like = { [Op.iLike]: `%${searchParam}%` };
    const searchCondition = {
      [Op.or]: [
        { name: like },
        { email: like },
        { phone: like },
        { companyName: like }
      ]
    };
    Object.assign(where, searchCondition);
  }

  const offset = (pageNumber - 1) * limit;

  const { rows, count } = await CrmLead.findAndCountAll({
    where,
    order: [["updatedAt", "DESC"]],
    limit,
    offset
  });

  return {
    leads: rows,
    count,
    hasMore: count > offset + rows.length
  };
};

export default ListCrmLeadsService;
