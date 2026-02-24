import TicketNote from "../../models/TicketNote";
import User from "../../models/User";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";

interface Params {
  contactId: number | string;
  ticketId: number | string;
  companyId: number;
  includePublic?: boolean; // se false, retorna apenas isPrivate=true
}

const FindNotesByContactIdAndTicketId = async ({
  contactId,
  ticketId,
  companyId,
  includePublic = true
}: Params): Promise<TicketNote[]> => {
  const whereClause: any = {
    contactId,
    ticketId,
    companyId // ─── Isolamento multi-tenant obrigatório ──────────────────
  };

  // Se não incluir públicas, filtra apenas notas privadas
  if (!includePublic) {
    whereClause.isPrivate = true;
  }

  const notes: TicketNote[] = await TicketNote.findAll({
    where: whereClause,
    include: [
      { model: User, as: "user", attributes: ["id", "name", "email"] },
      { model: Contact, as: "contact", attributes: ["id", "name"] },
      { model: Ticket, as: "ticket", attributes: ["id", "status", "createdAt"] }
    ],
    order: [["createdAt", "DESC"]]
  });

  return notes;
};

export default FindNotesByContactIdAndTicketId;
