import Campaign from "../../models/Campaign";
import AppError from "../../errors/AppError";
import CampaignShipping from "../../models/CampaignShipping";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";
import Whatsapp from "../../models/Whatsapp";
import User from "../../models/User";
import Queue from "../../models/Queue";

type Params = {
  id: string | number;
  companyId: number | string;
};

const ShowService = async ({ id, companyId }: Params): Promise<Campaign> => {
  const record = await Campaign.findOne({
    where: { id, companyId },
    include: [
      { model: CampaignShipping },
      {
        model: ContactList,
        where: { companyId },
        required: false,
        include: [{ model: ContactListItem, where: { companyId }, required: false }]
      },
      { model: Whatsapp, where: { companyId }, required: false, attributes: ["id", "name"] },
      { model: User, where: { companyId }, required: false, attributes: ["id", "name"] },
      { model: Queue, where: { companyId }, required: false, attributes: ["id", "name"] },
    ]
  });

  if (!record) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  return record;
};

export default ShowService;
