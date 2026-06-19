import AppError from "../../errors/AppError";
import CrmLead from "../../models/CrmLead";
import Contact from "../../models/Contact";
import Opportunity from "../../models/Opportunity";
import Tag from "../../models/Tag";
import { Op } from "sequelize";
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

  const serializedLead = serializeCrmLead(lead);

  if (!serializedLead.pipelineId || !serializedLead.stageId) {
    const opportunityWhere: any = {
      companyId,
      status: "OPEN"
    };
    const scope: any[] = [{ leadId: serializedLead.id }];

    if (serializedLead.contactId) {
      scope.push({ contactId: serializedLead.contactId });
    }

    opportunityWhere[Op.or] = scope;

    const activeOpportunity = await Opportunity.findOne({
      where: opportunityWhere,
      order: [["updatedAt", "DESC"], ["id", "DESC"]],
      attributes: ["id", "pipelineId", "stageId"]
    });

    if (activeOpportunity) {
      return {
        ...serializedLead,
        pipelineId: serializedLead.pipelineId || activeOpportunity.pipelineId,
        stageId: serializedLead.stageId || activeOpportunity.stageId
      };
    }
  }

  return serializedLead;
};

export default ShowCrmLeadService;
