import { Op } from "sequelize";
import Proposal from "../../models/Proposal";
import Contact from "../../models/Contact";

interface ListProposalsData {
  companyId: number;
  searchParam?: string;
  status?: string;
  pageNumber?: string | number;
}

interface ListProposalsResult {
  proposals: Proposal[];
  count: number;
  hasMore: boolean;
}

const ListProposalsService = async ({
  companyId,
  searchParam = "",
  status,
  pageNumber = "1"
}: ListProposalsData): Promise<ListProposalsResult> => {
  const limit = 20;
  const offset = limit * (Number(pageNumber) - 1);

  const whereCondition: any = { companyId };

  if (searchParam) {
    whereCondition[Op.or] = [
      { title: { [Op.iLike]: `%${searchParam}%` } },
      { clientName: { [Op.iLike]: `%${searchParam}%` } }
    ];
  }

  if (status) {
    whereCondition.status = status;
  }

  const { count, rows: proposals } = await Proposal.findAndCountAll({
    where: whereCondition,
    include: [{ model: Contact, attributes: ["id", "name", "number"] }],
    order: [["updatedAt", "DESC"]],
    limit,
    offset
  });

  const hasMore = count > offset + proposals.length;

  return { proposals, count, hasMore };
};

export default ListProposalsService;
