import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import JsSIP from "jssip";
import { toast } from "react-toastify";
import api from "../services/api";
import { AuthContext } from "./Auth/AuthContext";
import { usePlanPermissions } from "./PlanPermissionsContext";

const WebphoneContext = createContext();

const normalizeBrazilianNumber = (value = "") => {
  let number = String(value || "").replace(/\D/g, "");

  if (number.startsWith("00")) {
    number = number.slice(2);
  }

  if (number.startsWith("0") && number.length >= 11) {
    number = number.slice(1);
  }

  if (!number.startsWith("55") && (number.length === 10 || number.length === 11)) {
    number = `55${number}`;
  }

  if (number.startsWith("55") && number.length === 12) {
    const subscriber = number.slice(4);
    if (/^[6-9]/.test(subscriber)) {
      number = `${number.slice(0, 4)}9${subscriber}`;
    }
  }

  return number;
};

const normalizePhone = (value = "") => {
  const cleaned = String(value || "").replace(/[^\d*#]/g, "");

  if (!cleaned || /[*#]/.test(cleaned)) {
    return cleaned;
  }

  return normalizeBrazilianNumber(cleaned);
};

const sortSequenceTargets = (targets = []) =>
  [...targets].sort((left, right) => {
    const leftAttempts = Number(left.attempts || 0);
    const rightAttempts = Number(right.attempts || 0);

    if (leftAttempts !== rightAttempts) {
      return leftAttempts - rightAttempts;
    }

    return Number(left.orderIndex || 0) - Number(right.orderIndex || 0);
  });

export const WebphoneProvider = ({ children }) => {
  const { user, isAuth } = useContext(AuthContext);
  const { loading: planLoading, webphone: canUseWebphone } = usePlanPermissions();

  const [ua, setUa] = useState(null);
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("disconnected");
  const [sipSettings, setSipSettings] = useState(null);
  const [sipLoading, setSipLoading] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [currentCallContext, setCurrentCallContext] = useState(null);
  const [muted, setMuted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [dialNumber, setDialNumber] = useState("");
  const [recentCalls, setRecentCalls] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dialer");
  const [activeSequence, setActiveSequence] = useState(null);
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [activeCallRecord, setActiveCallRecord] = useState(null);
  const [recordingState, setRecordingState] = useState("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedDid, setSelectedDid] = useState("");

  const uaRef = useRef(null);
  const sessionRef = useRef(null);
  const activeCallRecordIdRef = useRef(null);
  const callStartedAtRef = useRef(null);
  const callAnsweredRef = useRef(false);
  const currentSequenceTargetRef = useRef(null);
  const sequenceTimerRef = useRef(null);
  const isPlacingSequenceCallRef = useRef(false);
  const autoRestorePanelOnLeadCloseRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingCleanupRef = useRef(null);
  const recordingStopResolverRef = useRef(null);
  const recordingStartedAtRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const callMediaStreamRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const shouldAutoReconnectRef = useRef(false);

  const clearSequenceTimer = useCallback(() => {
    if (sequenceTimerRef.current) {
      window.clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const getRegisteredStatus = useCallback(() => {
    const currentUa = uaRef.current;

    if (!currentUa) {
      return "disconnected";
    }

    return currentUa.isRegistered?.() ? "connected" : "connecting";
  }, []);

  const scheduleSipReconnect = useCallback(() => {
    if (!shouldAutoReconnectRef.current) {
      return;
    }

    clearReconnectTimer();
    setStatus("connecting");

    reconnectTimerRef.current = window.setTimeout(() => {
      const currentUa = uaRef.current;

      if (!currentUa || !shouldAutoReconnectRef.current) {
        return;
      }

      try {
        if (currentUa.isConnected?.() === false) {
          currentUa.start();
          return;
        }

        if (!currentUa.isRegistered?.()) {
          currentUa.register();
        }
      } catch (error) {
        console.error("[Webphone] SIP reconnect failed", error);
        setStatus("disconnected");
      }
    }, 1500);
  }, [clearReconnectTimer]);

  const releaseCallMediaStream = useCallback(() => {
    if (!callMediaStreamRef.current) {
      return;
    }

    try {
      callMediaStreamRef.current.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("[Webphone] Failed to release call media stream", error);
    }

    callMediaStreamRef.current = null;
  }, []);

  const resetCallState = useCallback(() => {
    releaseCallMediaStream();
    setSession(null);
    setMuted(false);
    setCallDuration(0);
    setActiveCallRecord(null);
    sessionRef.current = null;
    activeCallRecordIdRef.current = null;
    callStartedAtRef.current = null;
    callAnsweredRef.current = false;
  }, [releaseCallMediaStream]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setPanelMinimized(false);
    autoRestorePanelOnLeadCloseRef.current = false;
  }, []);

  const minimizePanel = useCallback((reason = "manual") => {
    setPanelOpen(true);
    setPanelMinimized(true);
    autoRestorePanelOnLeadCloseRef.current = reason === "lead-modal";
  }, []);

  const restorePanel = useCallback(() => {
    if (!panelOpen) {
      setPanelOpen(true);
      if (leadModalOpen) {
        setPanelMinimized(true);
      }
    }
    if (!leadModalOpen) {
      setPanelMinimized(false);
    }
    autoRestorePanelOnLeadCloseRef.current = false;
  }, [leadModalOpen, panelOpen]);

  const syncLeadModalState = useCallback((isOpen) => {
    setLeadModalOpen(isOpen);

    if (isOpen) {
      if (panelOpen && !panelMinimized) {
        setPanelMinimized(true);
        autoRestorePanelOnLeadCloseRef.current = true;
      } else {
        autoRestorePanelOnLeadCloseRef.current = false;
      }
      return;
    }

    if (autoRestorePanelOnLeadCloseRef.current && panelOpen) {
      setPanelMinimized(false);
    }
    autoRestorePanelOnLeadCloseRef.current = false;
  }, [panelMinimized, panelOpen]);

  const loadRecordings = useCallback(async (filters = {}) => {
    try {
      const { data } = await api.get("/call-recordings", { params: filters });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("[Webphone] Failed to load recordings", error);
      return [];
    }
  }, []);

  const clearRecordingInterval = useCallback(() => {
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const cleanupRecordingResources = useCallback(() => {
    clearRecordingInterval();
    if (typeof recordingCleanupRef.current === "function") {
      try {
        recordingCleanupRef.current();
      } catch (error) {
        console.error("[Webphone] Failed to cleanup recording resources", error);
      }
    }
    recordingCleanupRef.current = null;
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    recordingStartedAtRef.current = null;
    setRecordingState("idle");
    setRecordingDuration(0);
  }, [clearRecordingInterval]);

  const buildRecordingStream = useCallback(async () => {
    const currentSession = sessionRef.current;
    const peerConnection =
      currentSession?.connection ||
      currentSession?._connection ||
      currentSession?.rtcSession?.connection ||
      null;

    if (!peerConnection) {
      throw new Error("Conexão de mídia da chamada não encontrada.");
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("Seu navegador não suporta captura de áudio.");
    }

    const audioContext = new AudioContextCtor();
    await audioContext.resume();
    const destination = audioContext.createMediaStreamDestination();
    const sources = [];

    const connectTrack = (track) => {
      if (!track || track.kind !== "audio") {
        return;
      }

      const sourceStream = new MediaStream([track]);
      const sourceNode = audioContext.createMediaStreamSource(sourceStream);
      sourceNode.connect(destination);
      sources.push(sourceNode);
    };

    (peerConnection.getSenders?.() || []).forEach((sender) => connectTrack(sender.track));
    (peerConnection.getReceivers?.() || []).forEach((receiver) => connectTrack(receiver.track));

    if (!destination.stream.getAudioTracks().length) {
      throw new Error("Nenhuma trilha de áudio disponível para gravação.");
    }

    return {
      stream: destination.stream,
      cleanup: () => {
        sources.forEach((source) => {
          try {
            source.disconnect();
          } catch (_error) {}
        });
        destination.stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_error) {}
        });
        audioContext.close().catch(() => {});
      },
    };
  }, []);

  const uploadRecording = useCallback(async (blob, durationSeconds) => {
    if (!activeCallRecordIdRef.current) {
      return null;
    }

    const formData = new FormData();
    formData.append("file", blob, `call-${activeCallRecordIdRef.current}.webm`);
    formData.append("callRecordId", String(activeCallRecordIdRef.current));
    formData.append("leadId", String(currentLead?.id || currentCallContext?.leadId || ""));
    formData.append("opportunityId", String(currentLead?.opportunityId || currentCallContext?.opportunityId || ""));
    formData.append("pipelineId", String(currentLead?.pipelineId || currentCallContext?.pipelineId || ""));
    formData.append("stageId", String(currentLead?.stageId || currentCallContext?.stageId || ""));
    formData.append("duration", String(durationSeconds || 0));
    formData.append("source", "browser");
    formData.append("metadata", JSON.stringify({
      fileType: blob.type || "audio/webm",
    }));

    const { data } = await api.post("/call-recordings/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data;
  }, [currentCallContext, currentLead]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanupRecordingResources();
      return null;
    }

    return new Promise((resolve) => {
      recordingStopResolverRef.current = resolve;
      setRecordingState("uploading");
      recorder.stop();
    });
  }, [cleanupRecordingResources]);

  const startRecording = useCallback(async () => {
    if (status !== "in-call") {
      toast.info("A gravação só pode começar com a chamada em andamento.");
      return false;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      return true;
    }

    try {
      const { stream, cleanup } = await buildRecordingStream();
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recordingChunksRef.current = [];
      recordingCleanupRef.current = cleanup;
      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setRecordingState("recording");
      setRecordingDuration(0);

      clearRecordingInterval();
      recordingIntervalRef.current = window.setInterval(() => {
        if (!recordingStartedAtRef.current) {
          return;
        }
        setRecordingDuration(Math.max(0, Math.round((Date.now() - recordingStartedAtRef.current) / 1000)));
      }, 1000);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("[Webphone] Recording error", event);
        toast.error("Não foi possível gravar a ligação.");
        const resolver = recordingStopResolverRef.current;
        cleanupRecordingResources();
        recordingStopResolverRef.current = null;
        if (typeof resolver === "function") {
          resolver(null);
        }
      };

      recorder.onstop = async () => {
        const resolver = recordingStopResolverRef.current;
        try {
          const durationSeconds = recordingStartedAtRef.current
            ? Math.max(0, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
            : recordingDuration;
          const recordingBlob = new Blob(recordingChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });

          let createdRecording = null;
          if (recordingBlob.size > 0) {
            createdRecording = await uploadRecording(recordingBlob, durationSeconds);
            if (currentLead?.id) {
              await loadRecordings({ leadId: currentLead.id });
            }
          }

          cleanupRecordingResources();
          recordingStopResolverRef.current = null;
          if (createdRecording) {
            toast.success("Gravação salva com sucesso.");
          }
          if (typeof resolver === "function") {
            resolver(createdRecording);
          }
        } catch (error) {
          console.error("[Webphone] Failed to upload recording", error);
          cleanupRecordingResources();
          recordingStopResolverRef.current = null;
          toast.error("Não foi possível salvar a gravação.");
          if (typeof resolver === "function") {
            resolver(null);
          }
        }
      };

      recorder.start(1000);
      return true;
    } catch (error) {
      console.error("[Webphone] Failed to start recording", error);
      toast.error(error?.message || "Não foi possível iniciar a gravação.");
      cleanupRecordingResources();
      return false;
    }
  }, [
    buildRecordingStream,
    cleanupRecordingResources,
    clearRecordingInterval,
    currentLead?.id,
    loadRecordings,
    recordingDuration,
    status,
    uploadRecording,
  ]);

  const loadHistory = useCallback(async (filters = {}) => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/call-records", {
        params: {
          pageNumber: 1,
          ...filters,
        },
      });
      setRecentCalls(data.records || []);
      return data.records || [];
    } catch (error) {
      console.error("[Webphone] Failed to load call history", error);
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadSequenceById = useCallback(async (sequenceId) => {
    if (!sequenceId) {
      setActiveSequence(null);
      return null;
    }

    try {
      const { data } = await api.get(`/call-sequences/${sequenceId}`);
      setActiveSequence(data || null);
      return data || null;
    } catch (error) {
      console.error("[Webphone] Failed to load sequence", error);
      return null;
    }
  }, []);

  const loadSequences = useCallback(async () => {
    setSequenceLoading(true);
    try {
      const { data } = await api.get("/call-sequences", {
        params: { status: "ACTIVE" },
      });
      const nextSequence = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (nextSequence?.id) {
        await loadSequenceById(nextSequence.id);
      } else {
        setActiveSequence(null);
      }
      return nextSequence;
    } catch (error) {
      console.error("[Webphone] Failed to load active sequences", error);
      return null;
    } finally {
      setSequenceLoading(false);
    }
  }, [loadSequenceById]);

  const stopUA = useCallback(() => {
    clearSequenceTimer();
    clearReconnectTimer();
    cleanupRecordingResources();
    shouldAutoReconnectRef.current = false;
    if (uaRef.current) {
      try {
        uaRef.current.stop();
      } catch (error) {
        console.error("[Webphone] Failed to stop UA", error);
      }
    }

    uaRef.current = null;
    setUa(null);
    setSipSettings(null);
    setStatus("disconnected");
    closePanel();
    resetCallState();
  }, [cleanupRecordingResources, clearReconnectTimer, clearSequenceTimer, closePanel, resetCallState]);

  const persistCallUpdate = useCallback(async (payload) => {
    if (!activeCallRecordIdRef.current) {
      return;
    }

    try {
      const { data } = await api.put(`/call-records/${activeCallRecordIdRef.current}`, payload);
      setActiveCallRecord(data || null);
      return data || null;
    } catch (error) {
      console.error("[Webphone] Failed to update call record", error);
      return null;
    }
  }, []);

  const updateSequenceTarget = useCallback(
    async (sequenceId, targetId, payload) => {
      if (!sequenceId || !targetId) {
        return null;
      }

      try {
        const { data } = await api.post(`/call-sequences/${sequenceId}/targets/${targetId}`, payload);
        setActiveSequence(data || null);
        return data || null;
      } catch (error) {
        console.error("[Webphone] Failed to update sequence target", error);
        return null;
      }
    },
    []
  );

  const finalizeSequenceAttempt = useCallback(
    async ({ callStatus, duration, answered }) => {
      const runtime = currentSequenceTargetRef.current;
      if (!runtime) {
        return;
      }

      currentSequenceTargetRef.current = null;

      const nextStatus = answered
        ? "answered"
        : callStatus === "busy"
          ? "busy"
          : callStatus === "failed"
            ? "failed"
            : "no_answer";

      await updateSequenceTarget(runtime.sequenceId, runtime.targetId, {
        status: nextStatus,
        callStatus,
        callRecordId: activeCallRecordIdRef.current,
        incrementAttempt: false,
        metadata: {
          duration,
        },
      });
    },
    [updateSequenceTarget]
  );

  const finalizeCall = useCallback(
    async ({ finalStatus, failureCause }) => {
      if (recordingState === "recording" || recordingState === "uploading") {
        await stopRecording();
      }

      const duration = callStartedAtRef.current
        ? Math.max(0, Math.round((Date.now() - callStartedAtRef.current) / 1000))
        : callDuration;

      const normalizedStatus = callAnsweredRef.current
        ? "answered"
        : finalStatus || (failureCause === "Busy" ? "busy" : "missed");

      await persistCallUpdate({
        status: normalizedStatus,
        duration,
        callEndedAt: new Date().toISOString(),
        answeredAt: callAnsweredRef.current ? new Date().toISOString() : undefined,
        metadata: failureCause ? { failureCause } : undefined,
      });

      await finalizeSequenceAttempt({
        callStatus: normalizedStatus,
        duration,
        answered: callAnsweredRef.current,
      });

      if (currentLead?.id) {
        await loadHistory({ leadId: currentLead.id });
      } else {
        await loadHistory();
      }

      resetCallState();
      setStatus(getRegisteredStatus());
    },
    [
      callDuration,
      currentLead?.id,
      finalizeSequenceAttempt,
      loadHistory,
      persistCallUpdate,
      resetCallState,
      recordingState,
      stopRecording,
      getRegisteredStatus,
    ]
  );

  const hydrateLeadContext = useCallback((lead, callContext = {}, options = {}) => {
    const nextLead = lead
      ? {
          id: lead.id || callContext.leadId || null,
          name: lead.name || lead.contactName || lead.title || "Lead",
          phone: normalizePhone(lead.phone || lead.number || callContext.toNumber || ""),
          companyName: lead.companyName || lead.company || "",
          stageId: lead.stageId || callContext.stageId || null,
          pipelineId: lead.pipelineId || callContext.pipelineId || null,
          opportunityId: lead.opportunityId || callContext.opportunityId || null,
          contactId: lead.contactId || callContext.contactId || null,
          leadStatus: lead.status || lead.leadStatus || null,
          meetingScheduledAt: lead.meetingScheduledAt || null,
        }
      : null;

    setCurrentLead(nextLead);
    setCurrentCallContext(callContext || null);
    setDialNumber(nextLead?.phone || normalizePhone(callContext?.toNumber || ""));
    if (options.openPanel) {
      setPanelOpen(true);
      if (leadModalOpen) {
        setPanelMinimized(true);
      } else if (!options.minimized) {
        setPanelMinimized(false);
      }
    }
    setActiveTab(options.tab || "dialer");
  }, [leadModalOpen]);

  const createCallRecord = useCallback(async (number, callMetadata = {}, options = {}) => {
    const payload = {
      toNumber: number,
      fromNumber: options.fromNumber || callMetadata.fromNumber || "",
      contactId: callMetadata.contactId || null,
      ticketId: callMetadata.ticketId || null,
      whatsappId: callMetadata.whatsappId || null,
      leadId: callMetadata.leadId || null,
      opportunityId: callMetadata.opportunityId || null,
      pipelineId: callMetadata.pipelineId || null,
      stageId: callMetadata.stageId || null,
      sequenceId: callMetadata.sequenceId || null,
      status: "ringing",
      type: "outgoing",
      source: options.source || callMetadata.source || "manual",
      metadata: options.metadata || {},
    };

    const { data } = await api.post("/call-records", payload);
    activeCallRecordIdRef.current = data?.id || null;
    setActiveCallRecord(data || null);
    return data;
  }, []);

  const requestCallMediaStream = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Este navegador nao permite acesso ao microfone.");
      return null;
    }

    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (error) {
      console.error("[Webphone] Microphone access failed", error);

      if (["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(error?.name)) {
        toast.error("Permita o acesso ao microfone no navegador para usar o Webphone.");
      } else if (["NotFoundError", "DevicesNotFoundError"].includes(error?.name)) {
        toast.error("Nenhum microfone foi encontrado neste dispositivo.");
      } else {
        toast.error("Nao foi possivel acessar o microfone.");
      }

      return null;
    }
  }, []);

  const makeCall = useCallback(
    async (number = dialNumber, leadContext = currentLead, callMetadata = currentCallContext, options = {}) => {
      const sanitizedNumber = normalizePhone(number);
      const didOptions = Array.isArray(sipSettings?.dids) ? sipSettings.dids : [];
      const selectedDidConfig =
        didOptions.find((did) => did.number === (options.fromNumber || selectedDid)) ||
        didOptions.find((did) => did.default) ||
        didOptions[0] ||
        null;
      const selectedFromNumber = options.fromNumber || selectedDidConfig?.number || "";

      if (!sanitizedNumber) {
        toast.info("Informe um número para ligar.");
        return null;
      }

      if (!canUseWebphone) {
        toast.error("Webphone SIP nao esta disponivel no plano desta empresa.");
        return null;
      }

      if (!uaRef.current || status === "disconnected" || status === "disabled") {
        toast.error("Webphone SIP não está conectado.");
        return null;
      }

      const mediaStream = await requestCallMediaStream();
      if (!mediaStream) {
        return null;
      }
      callMediaStreamRef.current = mediaStream;

      try {
        const callRecord = await createCallRecord(sanitizedNumber, callMetadata || {}, {
          ...options,
          fromNumber: selectedFromNumber,
          metadata: {
            ...(options.metadata || {}),
            selectedDid: selectedDidConfig || null,
          },
        });

        if (options.sequenceId && options.sequenceTargetId) {
          currentSequenceTargetRef.current = {
            sequenceId: options.sequenceId,
            targetId: options.sequenceTargetId,
          };

          await updateSequenceTarget(options.sequenceId, options.sequenceTargetId, {
            status: "calling",
            callStatus: "ringing",
            callRecordId: callRecord?.id,
            incrementAttempt: true,
          });
        }

        setCurrentLead(leadContext || currentLead || null);
        setCurrentCallContext(callMetadata || currentCallContext || null);
        setDialNumber(sanitizedNumber);
        setPanelOpen(true);
        setPanelMinimized(leadModalOpen);
        setStatus("calling");
        callStartedAtRef.current = Date.now();
        callAnsweredRef.current = false;

        const destinationDomain = sipSettings?.sipDomain || sipSettings?.host;
        const optionsUa = {
          mediaConstraints: { audio: true, video: false },
          mediaStream,
          rtcOfferConstraints: { offerToReceiveAudio: 1, offerToReceiveVideo: 0 },
          extraHeaders: selectedFromNumber ? [
            `X-AtendZappy-DID: ${selectedFromNumber}`,
          ] : [],
        };

        uaRef.current.call(`sip:${sanitizedNumber}@${destinationDomain}`, optionsUa);
        return callRecord;
      } catch (error) {
        console.error("[Webphone] Failed to initiate SIP call", error);
        await persistCallUpdate({
          status: "failed",
          duration: 0,
          metadata: {
            failureCause: error?.message || error?.name || "call-init-error",
          },
        });
        currentSequenceTargetRef.current = null;
        setStatus("connected");
        resetCallState();
        toast.error("Não foi possível iniciar a chamada.");
        return null;
      }
    },
    [
      createCallRecord,
      currentCallContext,
      currentLead,
      dialNumber,
      persistCallUpdate,
      requestCallMediaStream,
      resetCallState,
      selectedDid,
      sipSettings,
      status,
      updateSequenceTarget,
      leadModalOpen,
      canUseWebphone,
    ]
  );

  const getNextSequenceTarget = useCallback((sequence) => {
    if (!sequence || sequence.status !== "ACTIVE") {
      return null;
    }

    const candidates = sortSequenceTargets(sequence.targets || []).filter(
      (target) => target.status === "PENDING"
    );

    return candidates[0] || null;
  }, []);

  const scheduleNextSequenceDial = useCallback(
    (sequence, delayMs = 500) => {
      clearSequenceTimer();

      if (!sequence || sequence.status !== "ACTIVE") {
        return;
      }

      const nextTarget = getNextSequenceTarget(sequence);
      if (!nextTarget) {
        return;
      }

      sequenceTimerRef.current = window.setTimeout(async () => {
        if (
          !uaRef.current ||
          isPlacingSequenceCallRef.current ||
          sessionRef.current ||
          status !== "connected"
        ) {
          return;
        }

        isPlacingSequenceCallRef.current = true;

        try {
          const leadContext = nextTarget.lead
            ? {
                ...nextTarget.lead,
                opportunityId: nextTarget.opportunityId,
                contactId: nextTarget.contactId,
                pipelineId: sequence.pipelineId,
              }
            : {
                id: nextTarget.leadId,
                name: nextTarget.contactName || nextTarget.contact?.name || nextTarget.phone,
                phone: nextTarget.phone,
                opportunityId: nextTarget.opportunityId,
                contactId: nextTarget.contactId,
                pipelineId: sequence.pipelineId,
                stageId: sequence.stageId,
              };

          hydrateLeadContext(leadContext, {
            contactId: nextTarget.contactId,
            leadId: nextTarget.leadId,
            opportunityId: nextTarget.opportunityId,
            pipelineId: sequence.pipelineId,
            stageId: sequence.stageId,
            sequenceId: sequence.id,
          });

          await makeCall(
            nextTarget.phone,
            leadContext,
            {
              contactId: nextTarget.contactId,
              leadId: nextTarget.leadId,
              opportunityId: nextTarget.opportunityId,
              pipelineId: sequence.pipelineId,
              stageId: sequence.stageId,
              sequenceId: sequence.id,
            },
            {
              source: "sequence",
              sequenceId: sequence.id,
              sequenceTargetId: nextTarget.id,
            }
          );
        } finally {
          isPlacingSequenceCallRef.current = false;
        }
      }, Math.max(500, delayMs));
    },
    [clearSequenceTimer, getNextSequenceTarget, hydrateLeadContext, makeCall, status]
  );

  const loadSipSettings = useCallback(async () => {
    if (!canUseWebphone) {
      setSipSettings(null);
      setStatus("disabled");
      return null;
    }

    setSipLoading(true);
    try {
      const { data } = await api.get("/sip-settings/runtime");
      setSipSettings(data || null);
      if (!data) {
        setStatus("disabled");
      }
      return data || null;
    } catch (error) {
      console.error("[Webphone] Failed to load SIP settings", error);
      setSipSettings(null);
      setStatus("disabled");
      return null;
    } finally {
      setSipLoading(false);
    }
  }, [canUseWebphone]);

  const startUA = useCallback(
    (runtimeConfig) => {
      if (!runtimeConfig?.enabled) {
        setStatus("disabled");
        return;
      }

      if (uaRef.current) {
        stopUA();
      }

      shouldAutoReconnectRef.current = true;

      // Usa proxy interno (wss://) quando o servidor SIP só oferece ws:// (porta 80)
      // para evitar bloqueio de mixed content no navegador.
      const wsUrl = runtimeConfig.proxyWebsocketUrl || runtimeConfig.websocketUrl;
      const socket = new JsSIP.WebSocketInterface(wsUrl);
      const configuration = {
        sockets: [socket],
        uri: runtimeConfig.userUri || `sip:${runtimeConfig.username}@${runtimeConfig.sipDomain || runtimeConfig.host}`,
        password: runtimeConfig.password,
        authorization_user: runtimeConfig.authUser || runtimeConfig.username,
        display_name: runtimeConfig.displayName || user?.name,
        session_timers: false,
        register: runtimeConfig.registerOnStartup !== false,
      };

      const nextUa = new JsSIP.UA(configuration);

      nextUa.on("connecting", () => {
        if (uaRef.current === nextUa) {
          setStatus("connecting");
        }
      });
      nextUa.on("connected", () => {
        if (uaRef.current === nextUa) {
          setStatus(nextUa.isRegistered?.() ? "connected" : "connecting");
        }
      });
      nextUa.on("registered", () => {
        if (uaRef.current !== nextUa) {
          return;
        }

        clearReconnectTimer();
        setStatus("connected");
      });
      nextUa.on("unregistered", () => {
        if (uaRef.current === nextUa) {
          scheduleSipReconnect();
        }
      });
      nextUa.on("disconnected", () => {
        if (uaRef.current === nextUa) {
          scheduleSipReconnect();
        }
      });
      nextUa.on("registrationFailed", (error) => {
        console.error("[Webphone] SIP registration failed", error);
        if (uaRef.current === nextUa) {
          scheduleSipReconnect();
        }
      });

      nextUa.on("newRTCSession", ({ session: nextSession }) => {
        sessionRef.current = nextSession;
        setSession(nextSession);
        setPanelOpen(true);
        setPanelMinimized(leadModalOpen);

        if (nextSession.direction === "incoming") {
          setStatus("incoming");
          const remoteNumber = normalizePhone(nextSession.remote_identity?.uri?.user || "");
          setDialNumber(remoteNumber);
          if (!currentLead) {
            setCurrentLead({
              id: null,
              name:
                nextSession.remote_identity?.display_name ||
                nextSession.remote_identity?.uri?.user ||
                "Ligação recebida",
              phone: remoteNumber,
            });
          }
        } else {
          setStatus("calling");
        }

        nextSession.on("progress", () => {
          if (nextSession.direction !== "incoming") {
            setStatus("calling");
          }
        });

        const markAnswered = async () => {
          callAnsweredRef.current = true;
          setStatus("in-call");
          setCallDuration(0);
          await persistCallUpdate({
            status: "answered",
            duration: 0,
            answeredAt: new Date().toISOString(),
          });
        };

        nextSession.on("accepted", markAnswered);
        nextSession.on("confirmed", markAnswered);

        nextSession.on("ended", async () => {
          await finalizeCall({
            finalStatus: callAnsweredRef.current ? "answered" : "missed",
          });
        });

        nextSession.on("failed", async (error) => {
          const failureStatus = error?.cause === "Busy" ? "busy" : "failed";
          toast.error(`Chamada falhou${error?.cause ? `: ${error.cause}` : "."}`);
          await finalizeCall({
            finalStatus: failureStatus,
            failureCause: error?.cause,
          });
        });
      });

      nextUa.start();
      uaRef.current = nextUa;
      setUa(nextUa);
    },
    [clearReconnectTimer, currentLead, finalizeCall, leadModalOpen, persistCallUpdate, scheduleSipReconnect, stopUA, user?.name]
  );

  const createSequence = useCallback(async (payload) => {
    setSequenceLoading(true);
    try {
      const { data } = await api.post("/call-sequences", payload);
      setActiveSequence(data || null);
      setActiveTab("sequence");
      setPanelOpen(true);
      if (leadModalOpen) {
        setPanelMinimized(true);
      }
      toast.success("Sequência de ligações iniciada.");
      return data || null;
    } catch (error) {
      console.error("[Webphone] Failed to create sequence", error);
      toast.error("Não foi possível iniciar a sequência.");
      return null;
    } finally {
      setSequenceLoading(false);
    }
  }, [leadModalOpen]);

  const controlSequence = useCallback(async (sequenceId, action) => {
    if (!sequenceId) {
      return null;
    }

    setSequenceLoading(true);
    try {
      const { data } = await api.post(`/call-sequences/${sequenceId}/control`, { action });
      setActiveSequence(data || null);
      return data || null;
    } catch (error) {
      console.error("[Webphone] Failed to control sequence", error);
      toast.error("Não foi possível atualizar a sequência.");
      return null;
    } finally {
      setSequenceLoading(false);
    }
  }, []);

  const hangup = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.terminate();
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!sessionRef.current) {
      return;
    }

    if (muted) {
      sessionRef.current.unmute({ audio: true });
      setMuted(false);
      return;
    }

    sessionRef.current.mute({ audio: true });
    setMuted(true);
  }, [muted]);

  const answer = useCallback(async () => {
    if (sessionRef.current && status === "incoming") {
      const mediaStream = await requestCallMediaStream();
      if (!mediaStream) {
        return;
      }
      callMediaStreamRef.current = mediaStream;

      sessionRef.current.answer({
        mediaConstraints: { audio: true, video: false },
        mediaStream,
      });
    }
  }, [requestCallMediaStream, status]);

  const appendDialDigit = useCallback((digit) => {
    setDialNumber((previous) => `${previous}${digit}`);
  }, []);

  useEffect(() => {
    const dids = Array.isArray(sipSettings?.dids) ? sipSettings.dids : [];
    if (!dids.length) {
      setSelectedDid("");
      return;
    }

    if (!selectedDid || !dids.some((did) => did.number === selectedDid)) {
      setSelectedDid((dids.find((did) => did.default) || dids[0]).number);
    }
  }, [selectedDid, sipSettings?.dids]);

  const backspaceDialDigit = useCallback(() => {
    setDialNumber((previous) => previous.slice(0, -1));
  }, []);

  const clearLeadContext = useCallback(() => {
    setCurrentLead(null);
    setCurrentCallContext(null);
    setDialNumber("");
  }, []);

  const setPanelVisibility = useCallback((nextOpen) => {
    const shouldOpen = Boolean(nextOpen);
    setPanelOpen(shouldOpen);

    if (!shouldOpen) {
      setPanelMinimized(false);
      autoRestorePanelOnLeadCloseRef.current = false;
      return;
    }

    setPanelMinimized(leadModalOpen);
  }, [leadModalOpen]);

  useEffect(() => {
    if (!isAuth || !user || planLoading || !canUseWebphone) {
      stopUA();
      setActiveSequence(null);
      setRecentCalls([]);
      setSipSettings(null);
      setStatus("disabled");
      setPanelOpen(false);
      clearLeadContext();
      return;
    }

    let cancelled = false;

    const boot = async () => {
      const runtimeConfig = await loadSipSettings();
      if (!cancelled && runtimeConfig?.enabled && !uaRef.current) {
        startUA(runtimeConfig);
      }
      if (!cancelled) {
        await loadHistory();
        await loadSequences();
      }
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, [canUseWebphone, clearLeadContext, isAuth, loadHistory, loadSequences, loadSipSettings, planLoading, startUA, stopUA, user]);

  useEffect(() => {
    if (status !== "in-call" && status !== "calling") {
      if (status !== "incoming") {
        setCallDuration(0);
      }
      return undefined;
    }

    const interval = window.setInterval(() => {
      if (!callStartedAtRef.current) {
        return;
      }

      setCallDuration(Math.max(0, Math.round((Date.now() - callStartedAtRef.current) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (!activeSequence || activeSequence.status !== "ACTIVE") {
      clearSequenceTimer();
      return;
    }

    if (status !== "connected" || sessionRef.current || isPlacingSequenceCallRef.current) {
      return;
    }

    const nextTarget = getNextSequenceTarget(activeSequence);
    if (!nextTarget) {
      return;
    }

    scheduleNextSequenceDial(
      activeSequence,
      currentSequenceTargetRef.current ? Number(activeSequence.intervalSeconds || 30) * 1000 : 500
    );
  }, [
    activeSequence,
    clearSequenceTimer,
    getNextSequenceTarget,
    scheduleNextSequenceDial,
    status,
  ]);

  const contextValue = useMemo(
    () => ({
      ua,
      session,
      status,
      sipSettings,
      canUseWebphone,
      sipLoading,
      currentLead,
      currentCallContext,
      muted,
      panelOpen,
      panelMinimized,
      leadModalOpen,
      callDuration,
      activeCallRecord,
      recordingState,
      recordingDuration,
      dialNumber,
      selectedDid,
      setSelectedDid,
      recentCalls,
      historyLoading,
      activeTab,
      activeSequence,
      sequenceLoading,
      setPanelOpen: setPanelVisibility,
      closePanel,
      minimizePanel,
      restorePanel,
      syncLeadModalState,
      setActiveTab,
      setDialNumber,
      appendDialDigit,
      backspaceDialDigit,
      hydrateLeadContext,
      clearLeadContext,
      makeCall,
      hangup,
      answer,
      toggleMute,
      startRecording,
      stopRecording,
      loadHistory,
      loadRecordings,
      loadSipSettings,
      loadSequences,
      loadSequenceById,
      createSequence,
      controlSequence,
      updateSequenceTarget,
    }),
    [
      activeSequence,
      activeTab,
      activeCallRecord,
      answer,
      appendDialDigit,
      backspaceDialDigit,
      callDuration,
      clearLeadContext,
      closePanel,
      controlSequence,
      createSequence,
      currentCallContext,
      currentLead,
      dialNumber,
      selectedDid,
      hangup,
      historyLoading,
      hydrateLeadContext,
      leadModalOpen,
      loadHistory,
      loadRecordings,
      loadSequenceById,
      loadSequences,
      loadSipSettings,
      makeCall,
      minimizePanel,
      muted,
      panelOpen,
      panelMinimized,
      recentCalls,
      recordingDuration,
      recordingState,
      restorePanel,
      sequenceLoading,
      session,
      setPanelVisibility,
      sipLoading,
      sipSettings,
      canUseWebphone,
      startRecording,
      status,
      stopRecording,
      syncLeadModalState,
      toggleMute,
      ua,
      updateSequenceTarget,
    ]
  );

  return (
    <WebphoneContext.Provider value={contextValue}>
      {children}
    </WebphoneContext.Provider>
  );
};

export const useWebphone = () => {
  const context = useContext(WebphoneContext);
  if (!context) {
    throw new Error("useWebphone deve ser usado dentro de um WebphoneProvider");
  }
  return context;
};
