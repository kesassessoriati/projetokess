import OpportunityEvent from "../../models/OpportunityEvent";
import AppError from "../../errors/AppError";

interface Request {
    opportunityId: number;
    companyId: number;
    type: string;
    metadata: any;
}

const CreateOpportunityEventService = async ({
    opportunityId,
    companyId,
    type,
    metadata
}: Request): Promise<OpportunityEvent> => {
    const event = await OpportunityEvent.create({
        opportunityId,
        companyId,
        type,
        metadata
    });

    return event;
};

export default CreateOpportunityEventService;
