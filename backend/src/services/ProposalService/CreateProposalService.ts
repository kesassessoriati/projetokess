import crypto from "crypto";
import Proposal from "../../models/Proposal";
import AppError from "../../errors/AppError";

interface CreateProposalData {
  companyId: number;
  title: string;
  clientName: string;
  contactId?: number | null;
  status?: "rascunho" | "enviada" | "aceita" | "recusada";
  validUntil?: string | null;
  notes?: string | null;
  data?: Record<string, any>;
}

const CreateProposalService = async ({
  companyId,
  title,
  clientName,
  contactId = null,
  status = "rascunho",
  validUntil = null,
  notes = null,
  data = {}
}: CreateProposalData): Promise<Proposal> => {
  if (!title?.trim()) {
    throw new AppError("Título da proposta é obrigatório");
  }

  if (!clientName?.trim()) {
    throw new AppError("Nome do cliente é obrigatório");
  }

  const slug = crypto.randomBytes(7).toString("hex");

  const proposal = await Proposal.create({
    companyId,
    title: title.trim(),
    clientName: clientName.trim(),
    contactId,
    status,
    slug,
    validUntil,
    notes,
    data
  });

  return proposal;
};

export default CreateProposalService;
