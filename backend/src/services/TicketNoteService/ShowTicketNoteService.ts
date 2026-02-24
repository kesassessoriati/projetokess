import TicketNote from "../../models/TicketNote";
import User from "../../models/User";
import AppError from "../../errors/AppError";

// ─── Show com validação de companyId (isolamento multi-tenant) ────────────
const ShowTicketNoteService = async (
  id: string | number,
  companyId: number
): Promise<TicketNote> => {
  const ticketNote = await TicketNote.findOne({
    where: { id, companyId },
    include: [
      { model: User, as: "user", attributes: ["id", "name", "email"] }
    ]
  });

  if (!ticketNote) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  return ticketNote;
};

export default ShowTicketNoteService;
