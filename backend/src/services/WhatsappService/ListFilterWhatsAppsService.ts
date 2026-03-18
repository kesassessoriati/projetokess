import { FindOptions } from "sequelize/types";
import Whatsapp from "../../models/Whatsapp";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import { isPlanChannelEnabled } from "../../helpers/planChannelRules";

interface Request {
  companyId: number;
  session?: number | string;
  channel?: string;
}

const ListFilterWhatsAppsService = async ({
  session,
  companyId,
  channel = "whatsapp"
}: Request): Promise<Whatsapp[]> => {
  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan" }]
  });

  if (!isPlanChannelEnabled(company?.plan, { channel })) {
    return [];
  }

  const options: FindOptions = {
    where: {
      companyId,
      channel
    }
  };

  if (session !== undefined && session == 0) {
    options.attributes = { exclude: ["session"] };
  }

  const whatsapps = await Whatsapp.findAll(options);

  return whatsapps.filter(whatsapp =>
    isPlanChannelEnabled(company?.plan, {
      channel: whatsapp.channel,
      notificameHub: whatsapp.notificameHub
    })
  );
};



export default ListFilterWhatsAppsService;
