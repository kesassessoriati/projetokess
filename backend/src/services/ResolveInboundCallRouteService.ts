import SipDid from "../models/SipDid";
import SipDidRoute from "../models/SipDidRoute";

interface ResolveInboundResult {
  routeType: string | null;
  userId: number | null;
  queueId: number | null;
  extensionId: number | null;
  channelId: number | null;
  fallbackUsed: boolean;
  fallbackReason: string | null;
}

const ResolveInboundCallRouteService = async (
  companyId: number,
  didNumber: string
): Promise<ResolveInboundResult> => {
  const normalizedNumber = String(didNumber || "").replace(/\D/g, "");

  const did = await SipDid.findOne({
    where: {
      companyId,
      normalizedNumber,
      isActive: true,
      allowedForInbound: true,
      type: ["inbound", "both"]
    }
  });

  if (!did) {
    return {
      routeType: null,
      userId: null,
      queueId: null,
      extensionId: null,
      channelId: null,
      fallbackUsed: true,
      fallbackReason: "DID não encontrado ou inativo para entrada."
    };
  }

  const routes = await SipDidRoute.findAll({
    where: {
      companyId,
      didId: did.id,
      isActive: true
    },
    order: [["priority", "ASC"]],
    raw: true
  });

  if (!routes.length) {
    return {
      routeType: "fallback",
      userId: null,
      queueId: null,
      extensionId: null,
      channelId: null,
      fallbackUsed: true,
      fallbackReason: "Nenhuma rota ativa encontrada para este DID."
    };
  }

  const route = routes[0];

  return {
    routeType: route.routeType,
    userId: route.userId,
    queueId: route.queueId,
    extensionId: route.extensionId,
    channelId: route.channelId,
    fallbackUsed: false,
    fallbackReason: null
  };
};

export default ResolveInboundCallRouteService;