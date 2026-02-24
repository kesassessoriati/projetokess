import * as Yup from "yup";
import AppError from "../../errors/AppError";
import TicketNote from "../../models/TicketNote";
import Ticket from "../../models/Ticket";

interface TicketNoteData {
  note: string;
  userId: number | string;
  contactId?: number | string;
  ticketId: number | string;
  companyId: number;
  isPrivate?: boolean;
}

const CreateTicketNoteService = async (
  ticketNoteData: TicketNoteData
): Promise<TicketNote> => {
  const { note, ticketId, companyId } = ticketNoteData;

  // Validação do conteúdo da nota
  const ticketnoteSchema = Yup.object().shape({
    note: Yup.string()
      .min(2, "ERR_TICKETNOTE_INVALID_NAME")
      .required("ERR_TICKETNOTE_INVALID_NAME")
  });

  try {
    await ticketnoteSchema.validate({ note });
  } catch (err) {
    throw new AppError(err.message);
  }

  // ─── Validação de isolamento: ticket deve pertencer à empresa ───────────
  if (ticketId) {
    const ticket = await Ticket.findOne({
      where: { id: ticketId, companyId }
    });

    if (!ticket) {
      throw new AppError("ERR_TICKET_NOT_FOUND_OR_FORBIDDEN", 403);
    }
  }

  // ─── Cria a nota sempre com companyId e isPrivate = true por padrão ────
  const ticketNote = await TicketNote.create({
    ...ticketNoteData,
    companyId,
    isPrivate: ticketNoteData.isPrivate !== undefined ? ticketNoteData.isPrivate : true
  });

  return ticketNote;
};

export default CreateTicketNoteService;
