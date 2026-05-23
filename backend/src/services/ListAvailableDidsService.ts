import SipDid from "../models/SipDid";
import SipChannelBinding from "../models/SipChannelBinding";
import SipExtension from "../models/SipExtension";

interface AvailableDid {
  id: number;
  name: string;
  number: string;
  normalizedNumber: string;
  areaCode: string;
  state: string;
  city: string;
  type: string;
  isDefault: boolean;
  priority: number;
}

const ListAvailableDidsService = async (
  companyId: number,
  userId?: number,
  queueId?: number,
  channelId?: number
): Promise<AvailableDid[]> => {
  const dids = await SipDid.findAll({
    where: {
      companyId,
      isActive: true,
      allowedForOutbound: true,
      type: ["outbound", "both"]
    },
    order: [["priority", "ASC"]],
    raw: true
  });

  let filteredDids = [...dids];

  if (channelId) {
    const binding = await SipChannelBinding.findOne({
      where: { companyId, whatsappId: channelId, isActive: true },
      raw: true
    });
    if (binding?.didId) {
      filteredDids = filteredDids.filter((d) => d.id === binding.didId);
    }
  }

  if (queueId) {
    const binding = await SipChannelBinding.findOne({
      where: { companyId, queueId, isActive: true },
      raw: true
    });
    if (binding?.didId) {
      filteredDids = filteredDids.filter((d) => d.id === binding.didId);
    }
  }

  if (userId) {
    const binding = await SipChannelBinding.findOne({
      where: { companyId, userId, isActive: true },
      raw: true
    });
    if (binding?.didId) {
      filteredDids = filteredDids.filter((d) => d.id === binding.didId);
    }

    const extension = await SipExtension.findOne({
      where: { companyId, userId, isActive: true },
      raw: true
    });
    if (extension?.id) {
      const extBinding = await SipChannelBinding.findOne({
        where: { companyId, extensionId: extension.id, isActive: true },
        raw: true
      });
      if (extBinding?.didId) {
        filteredDids = filteredDids.filter((d) => d.id === extBinding.didId);
      }
    }
  }

  return filteredDids.map((d) => ({
    id: d.id,
    name: d.name,
    number: d.number,
    normalizedNumber: d.normalizedNumber,
    areaCode: d.areaCode,
    state: d.state,
    city: d.city,
    type: d.type,
    isDefault: d.isDefault,
    priority: d.priority
  }));
};

export default ListAvailableDidsService;