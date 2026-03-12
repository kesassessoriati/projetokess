import OpportunityEvent from "../../models/OpportunityEvent";
import AppError from "../../errors/AppError";

interface Request {
    eventId: number;
    companyId: number;
    metadata: any;
}

const UpdateOpportunityEventService = async ({
    eventId,
    companyId,
    metadata
}: Request): Promise<OpportunityEvent> => {
    const event = await OpportunityEvent.findOne({
        where: { id: eventId, companyId }
    });

    if (!event) {
        throw new AppError("Evento não encontrado", 404);
    }

    if (event.type === "MOVED") {
        throw new AppError("Eventos do sistema não podem ser editados", 403);
    }

    await event.update({ metadata });

    return event;
};

export default UpdateOpportunityEventService;
