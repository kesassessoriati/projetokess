import Opportunity from "../../models/Opportunity";
import PipelineStage from "../../models/PipelineStage";
import Contact from "../../models/Contact";
import User from "../../models/User";
import CrmLead from "../../models/CrmLead";

interface Request {
    companyId: number;
    pipelineId?: number;
    contactId?: number;
    ticketId?: number;
}

const ListOpportunitiesService = async ({
    companyId,
    pipelineId,
    contactId,
    ticketId
}: Request): Promise<Opportunity[]> => {
    const whereCondition: any = { companyId };

    if (pipelineId) {
        whereCondition.pipelineId = pipelineId;
    }
    if (contactId) {
        whereCondition.contactId = contactId;
    }
    if (ticketId) {
        whereCondition.ticketId = ticketId;
    }

    const opportunities = await Opportunity.findAll({
        where: whereCondition,
        include: [
            {
                model: Contact,
                as: "contact",
                attributes: ["id", "name", "number", "profilePicUrl"]
            },
            {
                model: User,
                as: "assignedUser",
                attributes: ["id", "name"]
            },
            {
                model: PipelineStage,
                as: "stage",
                attributes: ["id", "name", "color"]
            },
            {
                model: CrmLead,
                as: "lead",
                attributes: ["id", "name", "email", "phone", "document", "status", "leadStatus", "source"]
            }
        ],
        order: [["createdAt", "DESC"]]
    });

    return opportunities;
};

export default ListOpportunitiesService;
