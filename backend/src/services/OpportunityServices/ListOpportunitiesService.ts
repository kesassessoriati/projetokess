import Opportunity from "../../models/Opportunity";
import PipelineStage from "../../models/PipelineStage";
import Contact from "../../models/Contact";
import User from "../../models/User";

interface Request {
    companyId: number;
    pipelineId: number;
}

const ListOpportunitiesService = async ({
    companyId,
    pipelineId
}: Request): Promise<Opportunity[]> => {
    const opportunities = await Opportunity.findAll({
        where: { companyId, pipelineId },
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
            }
        ],
        order: [["createdAt", "DESC"]]
    });

    return opportunities;
};

export default ListOpportunitiesService;
