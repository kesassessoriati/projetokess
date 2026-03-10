import AppError from "../../errors/AppError";
import CrmLead from "../../models/CrmLead";
import Tag from "../../models/Tag";
import serializeCrmLead from "./helpers/serializeCrmLead";

interface Request {
  id: number | string;
  companyId: number;
}

const ShowCrmLeadService = async ({ id, companyId }: Request): Promise<any> => {
  const lead = await CrmLead.findOne({
    where: { id, companyId },
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] }
      }
    ]
  });

  if (!lead) {
    throw new AppError("Lead não encontrado.", 404);
  }

  return serializeCrmLead(lead);
};

export default ShowCrmLeadService;
