import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import CompaniesSettings from "../../models/CompaniesSettings";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";

interface Request {
  contact: Contact;
  channel: Whatsapp;
  companyId: number;
  unreadMessages: number;
}

const EnsureEmailTicketService = async ({
  contact,
  channel,
  companyId,
  unreadMessages
}: Request) => {
  const settings = await CompaniesSettings.findOne({ where: { companyId } });

  const ticket = await FindOrCreateTicketService(
    contact,
    channel,
    unreadMessages,
    companyId,
    null,
    null,
    null,
    "email",
    false,
    false,
    settings || ({} as any),
    false,
    false
  );

  return ticket;
};

export default EnsureEmailTicketService;

