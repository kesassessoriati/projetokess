import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import logger from "../../utils/logger";

const ClearExpiredWebhookPausesService = async (): Promise<number> => {
  const [affectedRows] = await Ticket.update(
    { webhookPausedUntil: null },
    {
      where: {
        status: { [Op.in]: ["open", "pending", "group"] },
        webhookPausedUntil: {
          [Op.not]: null,
          [Op.lte]: new Date()
        }
      }
    }
  );

  if (affectedRows > 0) {
    logger.info(
      `[ClearExpiredWebhookPauses] ${affectedRows} ticket(s) reativados automaticamente.`
    );
  }

  return affectedRows;
};

export default ClearExpiredWebhookPausesService;
