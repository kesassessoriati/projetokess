import Proposal from "../../models/Proposal";
import AppError from "../../errors/AppError";

interface DeleteProposalData {
  id: string | number;
  companyId: number;
}

const DeleteProposalService = async ({ id, companyId }: DeleteProposalData): Promise<void> => {
  const proposal = await Proposal.findOne({ where: { id, companyId } });

  if (!proposal) {
    throw new AppError("Proposta não encontrada", 404);
  }

  await proposal.destroy();
};

export default DeleteProposalService;
