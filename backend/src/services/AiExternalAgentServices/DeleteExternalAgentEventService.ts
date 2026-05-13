import AppError from "../../errors/AppError";
import AiExternalAgentEvent from "../../models/AiExternalAgentEvent";

const DeleteExternalAgentEventService = async ({
  id,
  companyId
}: {
  id: number;
  companyId: number;
}) => {
  const deleted = await AiExternalAgentEvent.destroy({
    where: { id, companyId }
  });

  if (!deleted) {
    throw new AppError("Evento do agente externo nao encontrado.", 404);
  }
};

export default DeleteExternalAgentEventService;
