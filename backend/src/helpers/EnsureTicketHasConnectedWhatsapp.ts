import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import Ticket from "../models/Ticket";
import logger from "../utils/logger";

/**
 * Garante que o ticket esteja vinculado a uma conexao WhatsApp CONECTADA da
 * MESMA empresa. Resolve o cenario de tickets presos em conexao desconectada
 * ou com whatsappId NULL (ex.: conexao antiga caiu e foi criada outra).
 *
 * Regras:
 *  - Se o whatsappId atual aponta para uma conexao CONNECTED da mesma company,
 *    mantem como esta (sem alteracao).
 *  - Caso contrario (NULL ou DISCONNECTED), procura uma conexao CONNECTED da
 *    mesma company priorizando: isDefault DESC -> updatedAt DESC -> id DESC,
 *    reatribui o ticket e persiste.
 *  - Se nao houver nenhuma conexao CONNECTED, lanca ERR_NO_CONNECTED_WHATSAPP_AVAILABLE (409).
 *
 * Nunca seleciona conexao de outra empresa. Nao toca em Baileys/sessao — apenas
 * resolve qual whatsappId o ticket deve usar. O chamador (envio/aceite) usa o id
 * resolvido.
 *
 * @returns o whatsappId conectado resolvido (igual ao atual ou reatribuido).
 */
const isWhatsappChannelTicket = (ticket: Ticket): boolean =>
  !ticket.channel || ticket.channel === "whatsapp";

const EnsureTicketHasConnectedWhatsapp = async (
  ticket: Ticket
): Promise<number | null> => {
  // Apenas tickets de canal WhatsApp dependem de sessao Baileys.
  // Outros canais (facebook/instagram/email) nao usam whatsappId/sessao.
  if (!isWhatsappChannelTicket(ticket)) {
    return ticket.whatsappId ?? null;
  }

  const currentWhatsappId = ticket.whatsappId ?? null;

  if (currentWhatsappId) {
    const current = await Whatsapp.findOne({
      where: { id: currentWhatsappId, companyId: ticket.companyId },
      attributes: ["id", "status"]
    });

    if (current && current.status === "CONNECTED") {
      return current.id;
    }
  }

  // whatsappId NULL ou DISCONNECTED -> busca conexao CONNECTED da mesma company.
  const connected = await Whatsapp.findOne({
    where: { companyId: ticket.companyId, status: "CONNECTED" },
    order: [
      ["isDefault", "DESC"],
      ["updatedAt", "DESC"],
      ["id", "DESC"]
    ],
    attributes: ["id"]
  });

  if (!connected) {
    throw new AppError("ERR_NO_CONNECTED_WHATSAPP_AVAILABLE", 409);
  }

  if (connected.id !== currentWhatsappId) {
    await ticket.update({ whatsappId: connected.id });
    logger.info(
      `[Ticket WhatsApp Reassign] ticketId=${ticket.id} companyId=${ticket.companyId} ` +
        `oldWhatsappId=${currentWhatsappId ?? "null"} newWhatsappId=${connected.id} ` +
        `reason=missing_or_disconnected`
    );
  }

  return connected.id;
};

export default EnsureTicketHasConnectedWhatsapp;
