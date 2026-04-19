import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import JsSIP from "jssip";
import { toast } from "react-toastify";
import api from "../services/api";
import { AuthContext } from "./Auth/AuthContext";

const WebphoneContext = createContext();

export const WebphoneProvider = ({ children }) => {
  const { user, isAuth } = useContext(AuthContext);
  const [ua, setUa] = useState(null);
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("disconnected");
  const [currentLead, setCurrentLead] = useState(null);
  const [muted, setMuted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const sessionRef = useRef(null);
  const activeCallRecordIdRef = useRef(null);
  const callStartedAtRef = useRef(null);
  const callAnsweredRef = useRef(false);

  const resetCallState = useCallback(() => {
    setSession(null);
    setCurrentLead(null);
    setMuted(false);
    setCallDuration(0);
    sessionRef.current = null;
    activeCallRecordIdRef.current = null;
    callStartedAtRef.current = null;
    callAnsweredRef.current = false;
  }, []);

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

  const stopUA = useCallback(() => {
    if (ua) {
      ua.stop();
    }

    setUa(null);
    setStatus("disconnected");
    resetCallState();
  }, [resetCallState, ua]);

  const startUA = useCallback((sipConfig) => {
    if (ua) {
      stopUA();
    }

    const socket = new JsSIP.WebSocketInterface(sipConfig.uri);
    const configuration = {
      sockets: [socket],
      uri: sipConfig.userUri,
      password: sipConfig.password,
      display_name: user.name
    };

    const newUa = new JsSIP.UA(configuration);

    newUa.on("connecting", () => setStatus("connecting"));
    newUa.on("connected", () => setStatus("connected"));
    newUa.on("disconnected", () => setStatus("disconnected"));
    newUa.on("registered", () => setStatus("connected"));
    newUa.on("registrationFailed", (error) => {
      setStatus("disconnected");
      console.error("SIP Registration Failed", error);
    });

    newUa.on("newRTCSession", (data) => {
      const newSession = data.session;

      sessionRef.current = newSession;
      setSession(newSession);
      setPanelOpen(true);

      if (newSession.direction === "incoming") {
        setStatus("calling");
        setCurrentLead({
          name: newSession.remote_identity?.display_name || newSession.remote_identity?.uri?.user || "Ligacao recebida"
        });
      }

      newSession.on("confirmed", async () => {
        callAnsweredRef.current = true;
        setStatus("in-call");
        setCallDuration(0);
        await persistCallUpdate({ status: "answered", duration: 0 });
      });

      newSession.on("ended", () => {
        const duration = callStartedAtRef.current
          ? Math.max(0, Math.round((Date.now() - callStartedAtRef.current) / 1000))
          : callDuration;
        const finalStatus = callAnsweredRef.current ? "answered" : "missed";

        persistCallUpdate({ status: finalStatus, duration });
        setStatus("connected");
        resetCallState();
      });

      newSession.on("failed", (error) => {
        const duration = callStartedAtRef.current
          ? Math.max(0, Math.round((Date.now() - callStartedAtRef.current) / 1000))
          : 0;
        const failureStatus = error?.cause === "Busy" ? "busy" : "failed";

        persistCallUpdate({ status: failureStatus, duration });
        setStatus("connected");
        resetCallState();
        toast.error(`Chamada falhou: ${error.cause}`);
      });
    });

    newUa.start();
    setUa(newUa);
  }, [callDuration, persistCallUpdate, resetCallState, stopUA, ua, user?.name]);

  const makeCall = useCallback(async (number, leadContext = null, callMetadata = {}) => {
    if (!ua || status === "disconnected") {
      toast.error("Webphone nao registrado.");
      return;
    }

    try {
      const callRecord = await api.post("/call-records", {
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
        type: "outgoing"
      });

      activeCallRecordIdRef.current = callRecord.data?.id || null;
    } catch (error) {
      console.error("[Webphone] Failed to create call record", error);
      toast.error("Nao foi possivel registrar a chamada.");
    }

    setCurrentLead(leadContext);
    setPanelOpen(true);
    setStatus("calling");
    callStartedAtRef.current = Date.now();
    callAnsweredRef.current = false;

    const options = {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: { offerToReceiveAudio: 1, offerToReceiveVideo: 0 }
    };

    try {
      ua.call(`sip:${number}@${ua.configuration.uri.host}`, options);
    } catch (error) {
      console.error("[Webphone] Failed to initiate SIP call", error);
      await persistCallUpdate({ status: "failed", duration: 0 });
      setStatus("connected");
      resetCallState();
      toast.error("Nao foi possivel iniciar a chamada.");
    }
  }, [persistCallUpdate, resetCallState, status, ua]);

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
    if (sessionRef.current && status === "calling") {
      sessionRef.current.answer({
        mediaConstraints: { audio: true, video: false }
      });
    }
  }, [status]);

  useEffect(() => {
    if (!isAuth || !user) {
      stopUA();
      return;
    }

    /*
    const mockConfig = {
      uri: "wss://sip.example.com",
      userUri: "sip:100@sip.example.com",
      password: "password"
    };
    startUA(mockConfig);
    */
  }, [isAuth, startUA, stopUA, user]);

  useEffect(() => {
    if (status !== "in-call") {
      setCallDuration(0);
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

  return (
    <WebphoneContext.Provider
      value={{
        ua,
        session,
        status,
        currentLead,
        muted,
        panelOpen,
        callDuration,
        setPanelOpen,
        makeCall,
        hangup,
        answer,
        toggleMute
      }}
    >
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
