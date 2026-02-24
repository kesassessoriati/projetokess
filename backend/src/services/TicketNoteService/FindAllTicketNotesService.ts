import TicketNote from "../../models/TicketNote";
import User from "../../models/User";

// ─── FindAll agora filtra SEMPRE por companyId ─────────────────────────────
// Qualquer chamada sem companyId retornará array vazio (segurança por padrão)
const FindAllTicketNotesService = async (companyId?: number): Promise<TicketNote[]> => {
  if (!companyId) {
    return []; // Nunca retornar dados globais sem companyId
  }

  const ticketNotes = await TicketNote.findAll({
    where: { companyId },
    include: [
      { model: User, as: "user", attributes: ["id", "name", "email"] }
    ],
    order: [["createdAt", "DESC"]]
  });

  return ticketNotes;
};

export default FindAllTicketNotesService;
