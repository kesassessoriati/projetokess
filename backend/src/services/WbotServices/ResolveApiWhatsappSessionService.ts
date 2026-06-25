import AppError from "../../errors/AppError";
import { getWbot } from "../../libs/wbot";
import type Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";

export type ApiWhatsappSessionDetails = {
  companyId: number;
  whatsappId: number;
  whatsappStatus: string;
  sessionLoaded: boolean;
};

export class ApiWhatsappSessionError extends AppError {
  public readonly details: ApiWhatsappSessionDetails;

  public readonly publicMessage: string;

  constructor(
    message: string,
    details: ApiWhatsappSessionDetails,
    publicMessage: string
  ) {
    super(message, 409);
    this.details = details;
    this.publicMessage = publicMessage;
  }
}

export const buildApiWhatsappSessionDetails = (
  whatsapp: Whatsapp,
  sessionLoaded: boolean
): ApiWhatsappSessionDetails => ({
  companyId: whatsapp.companyId,
  whatsappId: whatsapp.id,
  whatsappStatus: String(whatsapp.status || ""),
  sessionLoaded
});

const unavailableMessage =
  "Conexão WhatsApp não inicializada no backend. Verifique se a conexão está conectada e se a sessão está carregada antes de enviar mensagens.";

const disconnectedMessage =
  "Conexão WhatsApp não está conectada. Reconecte a conexão ou use uma conexão ativa antes de enviar mensagens.";

const resolveApiWhatsappSession = (whatsapp: Whatsapp): any => {
  const whatsappStatus = String(whatsapp.status || "");

  if (whatsappStatus !== "CONNECTED") {
    throw new ApiWhatsappSessionError(
      "ERR_WAPP_NOT_CONNECTED",
      buildApiWhatsappSessionDetails(whatsapp, false),
      disconnectedMessage
    );
  }

  try {
    return getWbot(whatsapp.id);
  } catch (err: any) {
    if (err?.message === "ERR_WAPP_NOT_INITIALIZED") {
      const details = buildApiWhatsappSessionDetails(whatsapp, false);

      logger.warn(
        `[API Messages] WhatsApp session not loaded: companyId=${details.companyId} whatsappId=${details.whatsappId} status=${details.whatsappStatus}`
      );

      throw new ApiWhatsappSessionError(
        "ERR_WAPP_NOT_INITIALIZED",
        details,
        unavailableMessage
      );
    }

    throw err;
  }
};

export default resolveApiWhatsappSession;
