import Prompt from "../../models/Prompt";
import PromptChannelBinding, {
  normalizePromptChannelBindingEvents,
  PromptChannelType
} from "../../models/PromptChannelBinding";
import logger from "../../utils/logger";

interface ResolvePromptChannelBindingRequest {
  companyId: number;
  channelType: PromptChannelType;
  whatsappId?: number | null;
  channelId?: number | null;
  event?: string;
}

const ResolvePromptChannelBindingService = async ({
  companyId,
  channelType,
  whatsappId,
  channelId,
  event = "message_received"
}: ResolvePromptChannelBindingRequest): Promise<Prompt | null> => {
  const where: any = {
    companyId,
    channelType,
    isActive: true
  };

  if (typeof whatsappId !== "undefined" && whatsappId !== null) {
    where.whatsappId = whatsappId;
  } else if (typeof channelId !== "undefined" && channelId !== null) {
    where.channelId = channelId;
  }

  const bindings = await PromptChannelBinding.findAll({
    where,
    include: [
      {
        model: Prompt,
        required: false
      }
    ],
    order: [
      ["updatedAt", "DESC"],
      ["id", "DESC"]
    ]
  });

  const validBindings = bindings.filter(binding => {
    const events = normalizePromptChannelBindingEvents(binding.events);
    const prompt = binding.prompt;

    return (
      events.includes(event) &&
      prompt &&
      Number(prompt.companyId) === Number(companyId)
    );
  });

  if (validBindings.length > 1) {
    logger.warn(
      `[PromptChannelBinding] Mais de um agente ativo encontrado para companyId=${companyId}, channelType=${channelType}, whatsappId=${whatsappId}, channelId=${channelId}, event=${event}. Usando o mais recente.`
    );
  }

  return validBindings[0]?.prompt || null;
};

export default ResolvePromptChannelBindingService;
