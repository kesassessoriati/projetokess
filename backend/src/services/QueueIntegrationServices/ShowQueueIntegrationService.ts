import QueueIntegrations from "../../models/QueueIntegrations";
import Prompt from "../../models/Prompt";
import AppError from "../../errors/AppError";


const ShowQueueIntegrationService = async (id: string | number, companyId: number): Promise<QueueIntegrations> => {
  const integration = await QueueIntegrations.findByPk(id, {
    include: [{ model: Prompt, as: "prompt" }]
  });

  // if (Number(integration?.companyId) !== Number(companyId)) {
  //   throw new AppError("Não é possível excluir registro de outra empresa");
  // }

  if (!integration) {
    throw new AppError("ERR_NO_DIALOG_FOUND", 404);
  }

  return integration;
};

export default ShowQueueIntegrationService;