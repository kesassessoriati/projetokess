import AppError from "../../errors/AppError";
import Prompt from "../../models/Prompt";
import PromptChannelBinding, {
  PROMPT_CHANNEL_BINDING_CHANNEL_TYPES,
  normalizePromptChannelBindingEvents
} from "../../models/PromptChannelBinding";

interface SavePromptChannelBindingRequest {
  companyId: number;
  promptId: number;
  channelType?: string | null;
  channelId?: number | string | null;
  whatsappId?: number | string | null;
  isActive?: boolean;
  events?: string[] | null;
}

const SavePromptChannelBindingService = async ({
  companyId,
  promptId,
  channelType = "whatsapp",
  channelId,
  whatsappId,
  isActive = true,
  events
}: SavePromptChannelBindingRequest): Promise<PromptChannelBinding | null> => {
  const normalizedChannelType = String(channelType || "whatsapp").trim();
  if (!PROMPT_CHANNEL_BINDING_CHANNEL_TYPES.includes(normalizedChannelType)) {
    throw new AppError("Tipo de canal inválido para o agente.", 400);
  }

  const normalizedWhatsappId =
    whatsappId === "" || whatsappId === null || typeof whatsappId === "undefined"
      ? null
      : Number(whatsappId);
  const normalizedChannelId =
    channelId === "" || channelId === null || typeof channelId === "undefined"
      ? null
      : Number(channelId);

  if (normalizedWhatsappId !== null && Number.isNaN(normalizedWhatsappId)) {
    throw new AppError("Conexão WhatsApp inválida.", 400);
  }
  if (normalizedChannelId !== null && Number.isNaN(normalizedChannelId)) {
    throw new AppError("Canal inválido para o agente.", 400);
  }

  const prompt = await Prompt.findOne({ where: { id: promptId, companyId } });
  if (!prompt) {
    throw new AppError("ERR_NO_PROMPT_FOUND", 404);
  }

  const binding = await PromptChannelBinding.findOne({
    where: {
      companyId,
      promptId,
      channelType: normalizedChannelType
    },
    order: [["updatedAt", "DESC"]]
  });

  if (!normalizedWhatsappId && !normalizedChannelId && !binding) {
    return null;
  }

  const payload = {
    companyId,
    promptId,
    channelType: normalizedChannelType,
    whatsappId: normalizedWhatsappId,
    channelId: normalizedChannelId,
    isActive: Boolean((normalizedWhatsappId || normalizedChannelId) && isActive),
    events: normalizePromptChannelBindingEvents(events)
  };

  try {
    if (binding) {
      await binding.update(payload);
      return binding.reload();
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
