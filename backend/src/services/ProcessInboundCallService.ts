import SipDid from "../models/SipDid";
import SipCallLog from "../models/SipCallLog";
import ResolveInboundCallRouteService from "./ResolveInboundCallRouteService";
import Contact from "../models/Contact";
import { getIO } from "../libs/socket";

interface WebhookPayload {
  event: string;
  provider: string;
  callId: string;
  providerCallId: string;
  fromNumber: string;
  toNumber: string;
  didNumber: string;
  extension: string;
  status: string;
  timestamp: string;
  metadata: Record<string, any>;
}

interface ProcessResult {
  success: boolean;
  message: string;
  sipCallLogId?: number;
}

const normalizeNumber = (value: string): string => {
  return String(value || "").replace(/\D/g, "");
};

const eventStatusMap: Record<string, string> = {
  incoming_call: "ringing",
  ringing: "ringing",
  answered: "answered",
  completed: "completed",
  missed: "missed",
  busy: "busy",
  failed: "failed",
  canceled: "canceled",
};

const ProcessInboundCallService = async (payload: WebhookPayload): Promise<ProcessResult> => {
  const { event, callId, providerCallId, fromNumber, didNumber, extension, timestamp, metadata } = payload;
  const normalizedDid = normalizeNumber(didNumber || payload.toNumber);
  const normalizedFrom = normalizeNumber(fromNumber);

  if (!normalizedDid || !normalizedFrom) {
    return { success: false, message: "didNumber e fromNumber são obrigatórios." };
  }

  const did = await SipDid.findOne({
    where: { normalizedNumber: normalizedDid, isActive: true, allowedForInbound: true }
  });

  if (!did) {
    return { success: false, message: "DID não encontrado ou inativo para entrada." };
  }

  const { companyId } = did;

  const internalStatus = eventStatusMap[event] || eventStatusMap.incoming_call;

  // Idempotência: busca por providerCallId ou callId
  let log = await SipCallLog.findOne({
    where: { companyId, providerCallId }
  });

  if (!log && callId) {
    log = await SipCallLog.findOne({
      where: { companyId, callId }
    });
  }

  if (log) {
    // Atualizar log existente
    const updateData: any = { status: internalStatus };

    if (event === "answered" && !log.answeredAt) {
      updateData.answeredAt = timestamp ? new Date(timestamp) : new Date();
    }

    if (["completed", "missed", "busy", "failed", "canceled"].includes(event)) {
      updateData.endedAt = timestamp ? new Date(timestamp) : new Date();
    }

    await log.update(updateData);

  } else {
    // Criar novo log
    const routeResult = await ResolveInboundCallRouteService(companyId, normalizedDid);

    // Localizar contato existente
    let contactId = null;
    try {
      const contact = await Contact.findOne({
        where: { companyId, number: { [require("sequelize").Op.like]: `%${normalizedFrom.slice(-8)}%` } }
      });
      if (contact) contactId = contact.id;
    } catch (_err) {
      // lookup opcional
    }

    const routeUserId =
      routeResult.routeType === "user" ? routeResult.userId :
      routeResult.routeType === "extension" ? (await require("../models/SipExtension").default.findOne({
        where: { companyId, id: routeResult.extensionId, isActive: true }
      }))?.userId || null : null;

    log = await SipCallLog.create({
      companyId,
      callId: callId || `inbound-${Date.now()}`,
      providerCallId,
      direction: "inbound",
      status: internalStatus,
      fromNumber: normalizedFrom,
      toNumber: normalizedDid,
      didId: did.id,
      extensionId: routeResult.extensionId || null,
      userId: routeUserId,
      queueId: routeResult.queueId || null,
      channelId: routeResult.channelId || null,
      contactId,
      startedAt: timestamp ? new Date(timestamp) : new Date(),
      metadata: {
        provider: payload.provider,
        extension,
        routeType: routeResult.routeType,
        fallbackUsed: routeResult.fallbackUsed,
        fallbackReason: routeResult.fallbackReason,
        selectionReason: routeResult.routeType
          ? `Chamada roteada pelo DID ${normalizedDid}`
          : "Chamada recebida sem rota definida",
        ...(metadata || {}),
      }
    });

    // Emitir evento socket
    try {
      const io = getIO();
      const eventPayload = {
        type: "incoming_call",
        callId: log.callId,
        providerCallId: log.providerCallId,
        fromNumber: log.fromNumber,
        toNumber: log.toNumber,
        didNumber: normalizedDid,
        didId: did.id,
        sipCallLogId: log.id,
        routeType: routeResult.routeType,
        userId: routeUserId,
        queueId: routeResult.queueId,
        extensionId: routeResult.extensionId,
        channelId: routeResult.channelId,
        contactId,
        status: internalStatus,
        selectionReason: routeResult.routeType
          ? `Chamada roteada pelo DID ${normalizedDid}`
          : "Chamada recebida sem rota",
      };

      const namespace = io.of(String(companyId));
      if (namespace) {
        namespace.emit("sip-call", eventPayload);
      }
    } catch (_err) {
      // socket opcional
    }
  }

  return { success: true, message: "Evento processado com sucesso.", sipCallLogId: log?.id };
};

export default ProcessInboundCallService;