import TicketNote from "../../models/TicketNote";
import AppError from "../../errors/AppError";

// ─── Delete com validação de companyId ────────────────────────────────────
// O companyId garante que um usuário não pode deletar nota de outra empresa
const DeleteTicketNoteService = async (
  id: string,
  companyId: number
): Promise<void> => {
  const ticketnote = await TicketNote.findOne({
    where: { id, companyId }
  });

  if (!ticketnote) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  await ticketnote.destroy();
};

export default DeleteTicketNoteService;
