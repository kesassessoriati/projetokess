import Proposal from "../../models/Proposal";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";

interface ShowProposalData {
  id: string | number;
  companyId: number;
}

const ShowProposalService = async ({ id, companyId }: ShowProposalData): Promise<Proposal> => {
  const proposal = await Proposal.findOne({
    where: { id, companyId },
    include: [{ model: Contact, attributes: ["id", "name", "number"] }]
  });

  if (!proposal) {
    throw new AppError("Proposta não encontrada", 404);
  }

  return proposal;
};

export default ShowProposalService;
