import { Sequelize, Op } from "sequelize";
import TicketNote from "../../models/TicketNote";
import User from "../../models/User";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  companyId: number;
  onlyPrivate?: boolean;
}

interface Response {
  ticketNotes: TicketNote[];
  count: number;
  hasMore: boolean;
}

const ListTicketNotesService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId,
  onlyPrivate = false
}: Request): Promise<Response> => {
  const whereCondition: any = {
    companyId, // ─── Isolamento multi-tenant obrigatório ───────────────────
    [Op.or]: [
      {
        note: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("note")),
          "LIKE",
          `%${searchParam.toLowerCase().trim()}%`
        )
      }
    ]
  };

  // Filtro opcional: retornar apenas notas privadas
  if (onlyPrivate) {
    whereCondition.isPrivate = true;
  }

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: ticketNotes } = await TicketNote.findAndCountAll({
    where: whereCondition,
    include: [
      { model: User, as: "user", attributes: ["id", "name", "email"] }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + ticketNotes.length;

  return {
    ticketNotes,
    count,
    hasMore
  };
};

export default ListTicketNotesService;
