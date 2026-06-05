import { Op } from "sequelize";
import { subMinutes } from "date-fns";
import Company from "../../models/Company";
import CompaniesSettings from "../../models/CompaniesSettings";
import Ticket from "../../models/Ticket";
import UpdateTicketService from "./UpdateTicketService";
import logger from "../../utils/logger";

let running = false;

const AutoAcceptPendingTicketsService = async (): Promise<void> => {
  if (running) return;
  running = true;

  try {
    const companies = await Company.findAll({
      where: { status: true },
      attributes: ["id"],
    });

    for (const company of companies) {
      const companyId = company.id;

      try {
        const settings = await CompaniesSettings.findOne({
          where: { companyId },
        });

        if (!settings) continue;
        if (settings.autoAcceptTicketsEnabled !== "true") continue;

        const minutes = parseInt(settings.autoAcceptTicketsMinutes || "0", 10);
        if (!minutes || minutes <= 0) continue;

        const limitDate = subMinutes(new Date(), minutes);

        const tickets = await Ticket.findAll({
          where: {
            companyId,
            status: "pending",
            isGroup: false,
            updatedAt: { [Op.lte]: limitDate },
          },
          attributes: ["id", "status", "userId", "companyId", "updatedAt"],
        });

        if (tickets.length === 0) continue;

        logger.info(
          `[AutoAcceptTickets] company=${companyId} found=${tickets.length} tickets older than ${minutes}min`
        );

        for (const ticket of tickets) {
          try {
            const waitingMinutes = Math.round(
              (Date.now() - new Date(ticket.updatedAt).getTime()) / 60000
            );

            await UpdateTicketService({
              ticketData: {
                status: "open",
                userId: ticket.userId || undefined,
              },
              ticketId: ticket.id,
              companyId,
            });

            logger.info(
              `[AutoAcceptTickets] ticketId=${ticket.id} companyId=${companyId} ` +
              `oldStatus=pending newStatus=open waitingMinutes=${waitingMinutes} ` +
              `assignMode=${settings.autoAcceptTicketsAssignMode}`
            );
          } catch (ticketErr: any) {
            logger.warn(
              `[AutoAcceptTickets] Failed ticketId=${ticket.id} companyId=${companyId}: ${ticketErr?.message}`
            );
          }
        }
      } catch (companyErr: any) {
        logger.warn(
          `[AutoAcceptTickets] Failed company=${companyId}: ${companyErr?.message}`
        );
      }
    }
  } catch (err: any) {
    logger.warn(`[AutoAcceptTickets] Fatal error: ${err?.message}`);
  } finally {
    running = false;
  }
};

export default AutoAcceptPendingTicketsService;
