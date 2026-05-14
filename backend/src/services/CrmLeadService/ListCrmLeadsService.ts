import { Op, WhereOptions } from "sequelize";
import CrmLead from "../../models/CrmLead";
import Tag from "../../models/Tag";
import serializeCrmLead from "./helpers/serializeCrmLead";

interface Request {
  companyId: number;
  searchParam?: string;
  status?: string;
  product?: string;
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
  product,
  ownerUserId,
  pageNumber = 1,
  limit = 20,
  profile,
  userId
}: Request) => {
  const conditions: any[] = [{ companyId }];

  if (profile !== "admin") {
    // Agentes veem seus próprios leads E leads não atribuídos (ownerUserId = null)
    conditions.push({
      [Op.or]: [{ ownerUserId: userId }, { ownerUserId: null }]
    });
  } else if (ownerUserId) {
    conditions.push({ ownerUserId });
  }

  if (status) {
    conditions.push({ status });
  }

  if (product) {
    conditions.push({
      product: { [Op.iLike]: `%${product.trim()}%` }
    });
  }

  if (searchParam) {
    const like = { [Op.iLike]: `%${searchParam}%` };
    conditions.push({
      [Op.or]: [
        { name: like },
        { email: like },
        { phone: like },
        { companyName: like }
      ]
    });
  }

  const where = { [Op.and]: conditions } as WhereOptions;

  const offset = (pageNumber - 1) * limit;

  const { rows, count } = await CrmLead.findAndCountAll({
    where,
    order: [["updatedAt", "DESC"]],
    limit,
    offset,
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] }
      }
    ]
  });

  return {
    leads: rows.map(serializeCrmLead),
    count,
    hasMore: count > offset + rows.length
  };
};

export default ListCrmLeadsService;
