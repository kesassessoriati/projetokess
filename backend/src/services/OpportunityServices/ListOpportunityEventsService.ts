import OpportunityEvent from "../../models/OpportunityEvent";

interface Request {
    opportunityId: number;
    companyId: number;
}

const ListOpportunityEventsService = async ({
    opportunityId,
    companyId
}: Request): Promise<OpportunityEvent[]> => {
    const events = await OpportunityEvent.findAll({
        where: {
            opportunityId,
            companyId
        },
        order: [["createdAt", "DESC"]]
    });

    return events;
};

export default ListOpportunityEventsService;
