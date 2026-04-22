import crypto from "crypto";
import Proposal from "../../models/Proposal";
import AppError from "../../errors/AppError";

interface DuplicateProposalData {
  id: string | number;
  companyId: number;
}

const DuplicateProposalService = async ({ id, companyId }: DuplicateProposalData): Promise<Proposal> => {
  const original = await Proposal.findOne({ where: { id, companyId } });

  if (!original) {
    throw new AppError("Proposta não encontrada", 404);
  }

  const copy = await Proposal.create({
    companyId,
    title: `${original.title} (Cópia)`,
    clientName: original.clientName,
    contactId: original.contactId,
    status: "rascunho",
    slug: crypto.randomBytes(7).toString("hex"),
    validUntil: null,
    notes: original.notes,
    data: original.data
  });

  return copy;
};

export default DuplicateProposalService;
