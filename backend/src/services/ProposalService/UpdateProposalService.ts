import Proposal from "../../models/Proposal";
import AppError from "../../errors/AppError";

interface UpdateProposalData {
  id: string | number;
  companyId: number;
  title?: string;
  clientName?: string;
  contactId?: number | null;
  status?: "rascunho" | "enviada" | "aceita" | "recusada";
  validUntil?: string | null;
  notes?: string | null;
  data?: Record<string, any>;
}

const UpdateProposalService = async ({
  id,
  companyId,
  title,
  clientName,
  contactId,
  status,
  validUntil,
  notes,
  data
}: UpdateProposalData): Promise<Proposal> => {
  const proposal = await Proposal.findOne({ where: { id, companyId } });

  if (!proposal) {
    throw new AppError("Proposta não encontrada", 404);
  }

  const updates: Partial<Proposal> = {};

  if (title !== undefined) updates.title = title.trim();
  if (clientName !== undefined) updates.clientName = clientName.trim();
  if (contactId !== undefined) updates.contactId = contactId;
  if (status !== undefined) updates.status = status;
  if (validUntil !== undefined) updates.validUntil = validUntil;
  if (notes !== undefined) updates.notes = notes;
  if (data !== undefined) updates.data = data;

  await proposal.update(updates);

  return proposal;
};

export default UpdateProposalService;
