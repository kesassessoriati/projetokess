import OpportunityEvent from "../../models/OpportunityEvent";
import AppError from "../../errors/AppError";

interface Request {
    eventId: number;
    companyId: number;
}

const DeleteOpportunityEventService = async ({
    eventId,
    companyId
}: Request): Promise<void> => {
    const event = await OpportunityEvent.findOne({
        where: { id: eventId, companyId }
    });

    if (!event) {
        throw new AppError("Evento não encontrado", 404);
    }

    if (event.type === "MOVED") {
        throw new AppError("Eventos do sistema não podem ser removidos", 403);
    }

    await event.destroy();
};

export default DeleteOpportunityEventService;
