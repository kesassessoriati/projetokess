import AppError from "../../errors/AppError";
import CrmLead from "../../models/CrmLead";

interface Request {
  id: number | string;
  companyId: number;
}

const ShowCrmLeadService = async ({ id, companyId }: Request): Promise<CrmLead> => {
  const lead = await CrmLead.findOne({
    where: { id, companyId }
  });

  if (!lead) {
    throw new AppError("Lead não encontrado.", 404);
  }

  return lead;
};

export default ShowCrmLeadService;
