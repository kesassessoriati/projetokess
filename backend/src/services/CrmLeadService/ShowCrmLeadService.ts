import AppError from "../../errors/AppError";
import CrmLead from "../../models/CrmLead";
import Contact from "../../models/Contact";
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
      },
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "email"],
        required: false,
        include: [
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "color"],
            through: { attributes: [] },
            required: false
          }
        ]
      }
    ]
  });

  if (!lead) {
    throw new AppError("Lead não encontrado.", 404);
  }

  return serializeCrmLead(lead);
};

export default ShowCrmLeadService;
