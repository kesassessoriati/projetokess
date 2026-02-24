import AppError from "../../errors/AppError";
import TicketNote from "../../models/TicketNote";

interface TicketNoteData {
  note?: string;
  isPrivate?: boolean;
  id?: number | string;
}

const UpdateTicketNoteService = async (
  ticketNoteData: TicketNoteData,
  companyId: number
): Promise<TicketNote> => {
  const { id, note, isPrivate } = ticketNoteData;

  // ─── Busca com companyId: garante que não é possível editar nota de outra empresa ──
  const ticketNote = await TicketNote.findOne({
    where: { id, companyId }
  });

  if (!ticketNote) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  const updateFields: any = {};
  if (note !== undefined) updateFields.note = note;
  if (isPrivate !== undefined) updateFields.isPrivate = isPrivate;

  await ticketNote.update(updateFields);

  return ticketNote;
};

export default UpdateTicketNoteService;
