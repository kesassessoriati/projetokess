import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";

const WEBHOOK_PAUSE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface Request {
  contactId: string;
}

const ToggleDisableBotContactService = async ({
  contactId
}: Request): Promise<Contact> => {
  const contact = await Contact.findOne({
    where: { id: contactId },
    attributes: ["id", "disableBot"]
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  const disableBot = contact?.disableBot ? false : true;

  await contact.update({
    disableBot
  });

  // Sync webhookPausedUntil on all open/pending tickets for this contact.
  // When disabling the bot (true): pause webhook dispatch for 1 hour.
  // When re-enabling the bot (false): clear the pause immediately.
  const webhookPausedUntil = disableBot
    ? new Date(Date.now() + WEBHOOK_PAUSE_DURATION_MS)
    : null;

  await Ticket.update(
    { webhookPausedUntil },
    {
      where: {
        contactId: contact.id,
        status: { [Op.ne]: "closed" }
      }
    }
  );

  await contact.reload({
    attributes: [
      "id",
      "name",
      "number",
      "email",
      "profilePicUrl",
      "companyId",
      "acceptAudioMessage",
      "disableBot",
      "urlPicture",
    ],
    include: ["extraInfo"]
  });

  return contact;
};

export default ToggleDisableBotContactService;
