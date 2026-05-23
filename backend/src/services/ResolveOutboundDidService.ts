import SipDid from "../models/SipDid";
import SipExtension from "../models/SipExtension";
import SipChannelBinding from "../models/SipChannelBinding";

interface ResolveOutboundResult {
  didId: number | null;
  didNumber: string | null;
  areaCode: string | null;
  selectionReason: string;
  fallbackUsed: boolean;
  source: string;
}

const normalizePhone = (value: string): string => {
  const cleaned = String(value || "").replace(/\D/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith("55") && cleaned.length === 12) {
    const subscriber = cleaned.slice(4);
    if (/^[6-9]/.test(subscriber)) {
      return `${cleaned.slice(0, 4)}9${subscriber}`;
    }
  }
  if (!cleaned.startsWith("55") && (cleaned.length === 10 || cleaned.length === 11)) {
    return `55${cleaned}`;
  }
  return cleaned;
};

const extractAreaCode = (phone: string): string => {
  const normalized = normalizePhone(phone);
  if (normalized.length >= 12) {
    return normalized.slice(4, 6);
  }
  return "";
};

const ResolveOutboundDidService = async (
  companyId: number,
  userId: number,
  leadPhone: string,
  queueId?: number,
  channelId?: number
): Promise<ResolveOutboundResult> => {
  const normalizedPhone = normalizePhone(leadPhone);
  const areaCode = extractAreaCode(normalizedPhone);

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

  if (!dids.length) {
    return {
      didId: null,
      didNumber: null,
      areaCode: null,
      selectionReason: "Nenhum DID disponível para saída.",
      fallbackUsed: true,
      source: "none"
    };
  }

  // 1. DID local por DDD
  if (areaCode) {
    const localDid = dids.find((d) => d.areaCode === areaCode);
    if (localDid) {
      return {
        didId: localDid.id,
        didNumber: localDid.number,
        areaCode: localDid.areaCode,
        selectionReason: `DID local selecionado pelo DDD ${areaCode} do lead.`,
        fallbackUsed: false,
        source: "local_ddd"
      };
    }
  }

  // 2. DID vinculado ao usuário
  const userBinding = await SipChannelBinding.findOne({
    where: { companyId, userId, isActive: true },
    raw: true
  });
  if (userBinding?.didId) {
    const boundDid = dids.find((d) => d.id === userBinding.didId);
    if (boundDid) {
      return {
        didId: boundDid.id,
        didNumber: boundDid.number,
        areaCode: boundDid.areaCode,
        selectionReason: `DID vinculado ao usuário.`,
        fallbackUsed: false,
        source: "user_default"
      };
    }
  }

  // 3. DID vinculado ao ramal do usuário
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
      const boundDid = dids.find((d) => d.id === extBinding.didId);
      if (boundDid) {
        return {
          didId: boundDid.id,
          didNumber: boundDid.number,
          areaCode: boundDid.areaCode,
          selectionReason: `DID vinculado ao ramal ${extension.extension}.`,
          fallbackUsed: false,
          source: "extension_default"
        };
      }
    }
  }

  // 4. DID vinculado à fila
  if (queueId) {
    const queueBinding = await SipChannelBinding.findOne({
      where: { companyId, queueId, isActive: true },
      raw: true
    });
    if (queueBinding?.didId) {
      const boundDid = dids.find((d) => d.id === queueBinding.didId);
      if (boundDid) {
        return {
          didId: boundDid.id,
          didNumber: boundDid.number,
          areaCode: boundDid.areaCode,
          selectionReason: `DID vinculado à fila.`,
          fallbackUsed: false,
          source: "queue_default"
        };
      }
    }
  }

  // 5. DID vinculado ao canal
  if (channelId) {
    const channelBinding = await SipChannelBinding.findOne({
      where: { companyId, whatsappId: channelId, isActive: true },
      raw: true
    });
    if (channelBinding?.didId) {
      const boundDid = dids.find((d) => d.id === channelBinding.didId);
      if (boundDid) {
        return {
          didId: boundDid.id,
          didNumber: boundDid.number,
          areaCode: boundDid.areaCode,
          selectionReason: `DID vinculado ao canal.`,
          fallbackUsed: false,
          source: "channel_default"
        };
      }
    }
  }

  // 6. DID padrão da empresa
  const defaultDid = dids.find((d) => d.isDefault);
  if (defaultDid) {
    return {
      didId: defaultDid.id,
      didNumber: defaultDid.number,
      areaCode: defaultDid.areaCode,
      selectionReason: "Nenhum DID local encontrado; utilizado DID padrão da empresa.",
      fallbackUsed: true,
      source: "company_default"
    };
  }

  // 7. Qualquer DID ativo disponível
  const anyDid = dids[0];
  return {
    didId: anyDid.id,
    didNumber: anyDid.number,
    areaCode: anyDid.areaCode,
    selectionReason: "Nenhum DID específico encontrado; utilizado primeiro DID disponível.",
    fallbackUsed: true,
    source: "any_available"
  };
};

export default ResolveOutboundDidService;