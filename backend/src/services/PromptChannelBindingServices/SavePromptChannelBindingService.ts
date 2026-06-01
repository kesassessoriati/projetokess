import AppError from "../../errors/AppError";
import Prompt from "../../models/Prompt";
import PromptChannelBinding, {
  normalizePromptChannelBindingEvents
} from "../../models/PromptChannelBinding";

interface SavePromptChannelBindingRequest {
  companyId: number;
  promptId: number;
  channelType?: "whatsapp";
  whatsappId?: number | string | null;
  isActive?: boolean;
  events?: string[] | null;
}

const SavePromptChannelBindingService = async ({
  companyId,
  promptId,
  channelType = "whatsapp",
  whatsappId,
  isActive = true,
  events
}: SavePromptChannelBindingRequest): Promise<PromptChannelBinding | null> => {
  const prompt = await Prompt.findOne({ where: { id: promptId, companyId } });
  if (!prompt) {
    throw new AppError("ERR_NO_PROMPT_FOUND", 404);
  }

  const normalizedWhatsappId =
    whatsappId === "" || whatsappId === null || typeof whatsappId === "undefined"
      ? null
      : Number(whatsappId);

  const binding = await PromptChannelBinding.findOne({
    where: {
      companyId,
      promptId,
      channelType
    },
    order: [["updatedAt", "DESC"]]
  });

  const payload = {
    companyId,
    promptId,
    channelType,
    whatsappId: normalizedWhatsappId,
    channelId: null,
    isActive: Boolean(normalizedWhatsappId && isActive),
    events: normalizePromptChannelBindingEvents(events)
  };

  try {
    if (binding) {
      await binding.update(payload);
      return binding.reload();
    }

    if (!normalizedWhatsappId) {
      return null;
    }

    return PromptChannelBinding.create(payload);
  } catch (error: any) {
    if (String(error?.message || "").startsWith("ERR_PROMPT_CHANNEL_BINDING_DUPLICATE_ACTIVE_AGENT")) {
      throw new AppError("Já existe um agente ativo nesta conexão.", 400);
    }
    throw error;
  }
};

export default SavePromptChannelBindingService;
