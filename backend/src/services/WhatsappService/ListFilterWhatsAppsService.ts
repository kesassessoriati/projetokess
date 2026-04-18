import { FindOptions } from "sequelize/types";
import Whatsapp from "../../models/Whatsapp";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import { isPlanChannelEnabled } from "../../helpers/planChannelRules";

interface Request {
  companyId: number;
  session?: number | string;
  channel?: string;
  userId?: number;
}

const ListFilterWhatsAppsService = async ({
  session,
  companyId,
  channel = "whatsapp",
  userId
}: Request): Promise<Whatsapp[]> => {
  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan" }]
  });

  if (!isPlanChannelEnabled(company?.plan, { channel })) {
    return [];
  }

  const QueueObj = (await import("../../models/Queue")).default;

  const options: FindOptions = {
    where: {
      companyId,
      channel
    },
    include: [
      {
        model: QueueObj,
        as: "queues",
        attributes: ["id", "name"]
      }
    ]
  };

  if (session !== undefined && session == 0) {
    options.attributes = { exclude: ["session"] };
  }

  let whatsapps = await Whatsapp.findAll(options);

  if (userId) {
    const UserObj = (await import("../../models/User")).default;
    const user = await UserObj.findByPk(userId, { include: ["queues"] });
    if (user && user.profile !== "admin") {
      const userQueueIds = user.queues.map(q => q.id);
      if (userQueueIds.length === 0) {
        whatsapps = [];
      } else {
        whatsapps = whatsapps.filter(whatsapp => {
          if (!whatsapp.queues || whatsapp.queues.length === 0) return false;
          return whatsapp.queues.some(q => userQueueIds.includes(q.id));
        });
      }
    }
  }

  return whatsapps.filter(whatsapp =>
    isPlanChannelEnabled(company?.plan, {
      channel: whatsapp.channel,
      notificameHub: whatsapp.notificameHub
    })
  );
};



export default ListFilterWhatsAppsService;
