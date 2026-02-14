import { Op } from "sequelize";
import UserSchedule from "../../models/UserSchedule";
import User from "../../models/User";

interface ListUserSchedulesQuery {
  companyId: number;
  userId?: number;
  profile?: string;
  searchParam?: string;
  active?: string;
  pageNumber?: string;
}

interface ListUserSchedulesResponse {
  schedules: UserSchedule[];
  count: number;
  hasMore: boolean;
}

const ListUserSchedulesService = async ({
  companyId,
  userId,
  profile,
  searchParam = "",
  active,
  pageNumber = "1"
}: ListUserSchedulesQuery): Promise<ListUserSchedulesResponse> => {
  const where: any = { companyId };

  // Se não for admin, filtra apenas as agendas do próprio usuário
  if (profile !== "admin" && userId) {
    where.userId = userId;
  }

  if (searchParam) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${searchParam}%` } },
      { description: { [Op.iLike]: `%${searchParam}%` } }
    ];
  }

  if (typeof active !== "undefined" && active !== "") {
    where.active = active === "true";
  }

  const limit = 20;
  const offset = limit * (Number(pageNumber) - 1);

  const { rows, count } = await UserSchedule.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email", "startWork", "endWork"]
      }
    ],
    limit,
    offset,
    order: [["name", "ASC"]]
  });

  return {
    schedules: rows,
    count,
    hasMore: count > offset + rows.length
  };
};

export default ListUserSchedulesService;
