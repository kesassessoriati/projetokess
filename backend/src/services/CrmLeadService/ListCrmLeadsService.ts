import { Op, WhereOptions } from "sequelize";
import CrmLead from "../../models/CrmLead";

interface Request {
  companyId: number;
  searchParam?: string;
  status?: string;
  ownerUserId?: number;
  pageNumber?: number;
  limit?: number;
}

const ListCrmLeadsService = async ({
  companyId,
  searchParam,
  status,
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

  if (ownerUserId) {
    where.ownerUserId = ownerUserId;
  }

  if (searchParam) {
    const like = { [Op.iLike]: `%${searchParam}%` };
    (where as any)[Op.or] = [
      { name: like },
      { email: like },
      { phone: like },
      { companyName: like }
    ];
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
