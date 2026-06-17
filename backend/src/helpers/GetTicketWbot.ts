import { WASocket } from "@whiskeysockets/baileys";
import { getWbot } from "../libs/wbot";
import Ticket from "../models/Ticket";
import AppError from "../errors/AppError";
import EnsureTicketHasConnectedWhatsapp from "./EnsureTicketHasConnectedWhatsapp";

type Session = WASocket & {
  id?: number;
};

const GetTicketWbot = async (ticket: Ticket): Promise<Session> => {
  // Garante que o ticket esteja vinculado a uma conexao CONECTADA da mesma
  // empresa antes de resolver a sessao. Evita getWbot(null) e
  // getWbot(<id desconectado>), reatribuindo automaticamente quando necessario.
  const connectedWhatsappId = await EnsureTicketHasConnectedWhatsapp(ticket);

  if (!connectedWhatsappId) {
    throw new AppError("ERR_NO_CONNECTED_WHATSAPP_AVAILABLE", 409);
  }

  const wbot = getWbot(connectedWhatsappId);

  return wbot;
};

export default GetTicketWbot;
