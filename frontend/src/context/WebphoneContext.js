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

const WebphoneContext = createContext();

const normalizePhone = (value = "") => String(value).replace(/[^\d*#()+-]/g, "");

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

  const [ua, setUa] = useState(null);
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("disconnected");
  const [sipSettings, setSipSettings] = useState(null);
  const [sipLoading, setSipLoading] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [currentCallContext, setCurrentCallContext] = useState(null);
  const [muted, setMuted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [dialNumber, setDialNumber] = useState("");
  const [recentCalls, setRecentCalls] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dialer");
  const [activeSequence, setActiveSequence] = useState(null);
  const [sequenceLoading, setSequenceLoading] = useState(false);

  const uaRef = useRef(null);
  const sessionRef = useRef(null);
  const activeCallRecordIdRef = useRef(null);
  const callStartedAtRef = useRef(null);
  const callAnsweredRef = useRef(false);
  const currentSequenceTargetRef = useRef(null);
  const sequenceTimerRef = useRef(null);
  const isPlacingSequenceCallRef = useRef(false);

  const clearSequenceTimer = useCallback(() => {
    if (sequenceTimerRef.current) {
      window.clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  }, []);

  const resetCallState = useCallback(() => {
    setSession(null);
    setMuted(false);
    setCallDuration(0);
    sessionRef.current = null;
    activeCallRecordIdRef.current = null;
    callStartedAtRef.current = null;
    callAnsweredRef.current = false;
  }, []);

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
    resetCallState();
  }, [clearSequenceTimer, resetCallState]);

  const persistCallUpdate = useCallback(async (payload) => {
    if (!activeCallRecordIdRef.current) {
      return;
    }

    try {
      await api.put(`/call-records/${activeCallRecordIdRef.current}`, payload);
    } catch (error) {
      console.error("[Webphone] Failed to update call record", error);
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

      setStatus(uaRef.current ? "connected" : "disconnected");
      resetCallState();
    },
    [
      callDuration,
      currentLead?.id,
      finalizeSequenceAttempt,
      loadHistory,
      persistCallUpdate,
      resetCallState,
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
    setPanelOpen(true);
    setActiveTab(options.tab || "dialer");
  }, []);

  const createCallRecord = useCallback(async (number, callMetadata = {}, options = {}) => {
    const payload = {
      toNumber: number,
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
    return data;
  }, []);

  const makeCall = useCallback(
    async (number = dialNumber, leadContext = currentLead, callMetadata = currentCallContext, options = {}) => {
      const sanitizedNumber = normalizePhone(number);

      if (!sanitizedNumber) {
        toast.info("Informe um número para ligar.");
        return null;
      }

      if (!uaRef.current || status === "disconnected" || status === "disabled") {
        toast.error("Webphone SIP não está conectado.");
        return null;
      }

      try {
        const callRecord = await createCallRecord(sanitizedNumber, callMetadata || {}, options);

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
        setStatus("calling");
        callStartedAtRef.current = Date.now();
        callAnsweredRef.current = false;

        const destinationDomain = sipSettings?.sipDomain || sipSettings?.host;
        const optionsUa = {
          mediaConstraints: { audio: true, video: false },
          rtcOfferConstraints: { offerToReceiveAudio: 1, offerToReceiveVideo: 0 },
        };

        uaRef.current.call(`sip:${sanitizedNumber}@${destinationDomain}`, optionsUa);
        return callRecord;
      } catch (error) {
        console.error("[Webphone] Failed to initiate SIP call", error);
        await persistCallUpdate({ status: "failed", duration: 0 });
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
      resetCallState,
      sipSettings,
      status,
      updateSequenceTarget,
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
  }, []);

  const startUA = useCallback(
    (runtimeConfig) => {
      if (!runtimeConfig?.enabled) {
        setStatus("disabled");
        return;
      }

      if (uaRef.current) {
        stopUA();
      }

      const socket = new JsSIP.WebSocketInterface(runtimeConfig.websocketUrl);
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

      nextUa.on("connecting", () => setStatus("connecting"));
      nextUa.on("connected", () => setStatus("connecting"));
      nextUa.on("registered", () => setStatus("connected"));
      nextUa.on("unregistered", () => setStatus("disconnected"));
      nextUa.on("disconnected", () => setStatus("disconnected"));
      nextUa.on("registrationFailed", (error) => {
        console.error("[Webphone] SIP registration failed", error);
        setStatus("disconnected");
      });

      nextUa.on("newRTCSession", ({ session: nextSession }) => {
        sessionRef.current = nextSession;
        setSession(nextSession);
        setPanelOpen(true);

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
    [currentLead, finalizeCall, persistCallUpdate, stopUA, user?.name]
  );

  const createSequence = useCallback(async (payload) => {
    setSequenceLoading(true);
    try {
      const { data } = await api.post("/call-sequences", payload);
      setActiveSequence(data || null);
      setActiveTab("sequence");
      setPanelOpen(true);
      toast.success("Sequência de ligações iniciada.");
      return data || null;
    } catch (error) {
      console.error("[Webphone] Failed to create sequence", error);
      toast.error("Não foi possível iniciar a sequência.");
      return null;
    } finally {
      setSequenceLoading(false);
    }
  }, []);

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

  const answer = useCallback(() => {
    if (sessionRef.current && status === "incoming") {
      sessionRef.current.answer({
        mediaConstraints: { audio: true, video: false },
      });
    }
  }, [status]);

  const appendDialDigit = useCallback((digit) => {
    setDialNumber((previous) => `${previous}${digit}`);
  }, []);

  const backspaceDialDigit = useCallback(() => {
    setDialNumber((previous) => previous.slice(0, -1));
  }, []);

  const clearLeadContext = useCallback(() => {
    setCurrentLead(null);
    setCurrentCallContext(null);
    setDialNumber("");
  }, []);

  useEffect(() => {
    if (!isAuth || !user) {
      stopUA();
      setActiveSequence(null);
      setRecentCalls([]);
      clearLeadContext();
      return;
    }

    let cancelled = false;

    const boot = async () => {
      const runtimeConfig = await loadSipSettings();
      if (!cancelled && runtimeConfig?.enabled) {
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
  }, [clearLeadContext, isAuth, loadHistory, loadSequences, loadSipSettings, startUA, stopUA, user]);

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
      sipLoading,
      currentLead,
      currentCallContext,
      muted,
      panelOpen,
      callDuration,
      dialNumber,
      recentCalls,
      historyLoading,
      activeTab,
      activeSequence,
      sequenceLoading,
      setPanelOpen,
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
      loadHistory,
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
      answer,
      appendDialDigit,
      backspaceDialDigit,
      callDuration,
      clearLeadContext,
      controlSequence,
      createSequence,
      currentCallContext,
      currentLead,
      dialNumber,
      hangup,
      historyLoading,
      hydrateLeadContext,
      loadHistory,
      loadSequenceById,
      loadSequences,
      loadSipSettings,
      makeCall,
      muted,
      panelOpen,
      recentCalls,
      sequenceLoading,
      session,
      sipLoading,
      sipSettings,
      status,
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
