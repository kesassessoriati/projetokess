import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  makeStyles,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Avatar,
  Tabs,
  Tab,
  Chip,
  Divider,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  CircularProgress,
  Tooltip,
} from "@material-ui/core";
import {
  Close as CloseIcon,
  Remove as RemoveIcon,
  Call as CallIcon,
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Phone as PhoneIcon,
  History as HistoryIcon,
  Timeline as TimelineIcon,
  Person as PersonIcon,
  Backspace as BackspaceIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  EventAvailable as EventAvailableIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  NoteAdd as NoteAddIcon,
  TrendingFlat as TrendingFlatIcon,
} from "@material-ui/icons";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../../services/api";
import { useWebphone } from "../../context/WebphoneContext";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(180deg, #ffffff 0%, #f7faf8 100%)",
  },
  rootCompact: {
    borderRadius: 18,
    border: "1px solid #d7e5dc",
    boxShadow: "0 18px 32px rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
  },
  header: {
    padding: theme.spacing(1.5, 2),
    background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerCompact: {
    padding: theme.spacing(1.25, 1.5),
  },
  headerAvatar: {
    width: 42,
    height: 42,
    backgroundColor: "#22c55e",
    color: "#fff",
    fontWeight: 700,
  },
  headerName: {
    fontWeight: 800,
    fontSize: "0.98rem",
    lineHeight: 1.1,
  },
  headerNumber: {
    color: "#9ca3af",
    fontSize: "0.78rem",
    marginTop: 2,
  },
  tabs: {
    minHeight: 46,
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    "& .MuiTab-root": {
      minHeight: 46,
      textTransform: "none",
      fontSize: "0.76rem",
      fontWeight: 700,
      minWidth: 0,
    },
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  bodyCompact: {
    padding: theme.spacing(1.5),
    gap: 12,
  },
  statusLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: "0.72rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".04em",
  },
  statusInfo: {
    fontSize: "0.73rem",
    color: "#6b7280",
    fontWeight: 600,
  },
  dialInput: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 14,
      fontSize: "1.6rem",
      fontWeight: 800,
      letterSpacing: 1,
      backgroundColor: "#fff",
    },
    "& .MuiOutlinedInput-input": {
      textAlign: "center",
      paddingTop: 16,
      paddingBottom: 16,
    },
  },
  keypad: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
  keyButton: {
    height: 54,
    borderRadius: 14,
    border: "1px solid #dbe5dd",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: "1.25rem",
    fontWeight: 800,
    "&:hover": {
      backgroundColor: "#f1f5f9",
    },
  },
  primaryButton: {
    height: 44,
    borderRadius: 12,
    textTransform: "none",
    fontWeight: 800,
    fontSize: "0.92rem",
    boxShadow: "none",
  },
  callButton: {
    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    color: "#fff",
    "&:hover": {
      background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
      boxShadow: "none",
    },
  },
  hangupButton: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    "&:hover": {
      background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
      boxShadow: "none",
    },
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: "1px solid #d8e4db",
    backgroundColor: "#fff",
  },
  sectionCard: {
    borderRadius: 16,
    border: "1px solid #e3ebe6",
    backgroundColor: "#fff",
    padding: theme.spacing(1.75),
    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.04)",
  },
  sectionTitle: {
    fontSize: "0.76rem",
    color: "#94a3b8",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".05em",
    marginBottom: 10,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  sequenceMetricRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    marginTop: 10,
  },
  sequenceMetric: {
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "10px 12px",
  },
  sequenceMetricLabel: {
    fontSize: "0.65rem",
    color: "#64748b",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  sequenceMetricValue: {
    fontSize: "1rem",
    color: "#0f172a",
    fontWeight: 900,
    marginTop: 4,
  },
  historyItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid #edf2f7",
    "&:last-child": {
      borderBottom: "none",
      paddingBottom: 0,
    },
  },
  historyDot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    color: "#fff",
  },
  historyName: {
    fontWeight: 800,
    color: "#0f172a",
    fontSize: "0.85rem",
    lineHeight: 1.1,
  },
  historyMeta: {
    fontSize: "0.72rem",
    color: "#64748b",
    marginTop: 2,
  },
  historyStatus: {
    fontSize: "0.74rem",
    fontWeight: 800,
    textAlign: "right",
  },
  leadPill: {
    fontSize: "0.68rem",
    fontWeight: 800,
    borderRadius: 999,
    padding: "4px 8px",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(3, 2),
    color: "#94a3b8",
  },
}));

const statusMap = {
  connected: { label: "Conectado", bg: "#dcfce7", color: "#166534" },
  connecting: { label: "Conectando", bg: "#dbeafe", color: "#1d4ed8" },
  disconnected: { label: "Desconectado", bg: "#fee2e2", color: "#b91c1c" },
  disabled: { label: "SIP desativado", bg: "#e5e7eb", color: "#374151" },
  incoming: { label: "Recebendo", bg: "#fef3c7", color: "#b45309" },
  calling: { label: "Discando", bg: "#dbeafe", color: "#1d4ed8" },
  "in-call": { label: "Em chamada", bg: "#dcfce7", color: "#166534" },
};

const callStatusMap = {
  answered: { label: "Atendeu", color: "#16a34a", bg: "#dcfce7" },
  missed: { label: "Não atendeu", color: "#dc2626", bg: "#fee2e2" },
  busy: { label: "Ocupado", color: "#d97706", bg: "#fef3c7" },
  failed: { label: "Falhou", color: "#64748b", bg: "#e2e8f0" },
  rejected: { label: "Rejeitada", color: "#dc2626", bg: "#fee2e2" },
  ringing: { label: "Chamando", color: "#2563eb", bg: "#dbeafe" },
};

const formatDuration = (seconds) => {
  const total = Number(seconds || 0);
  if (!total) {
    return "0s";
  }

  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (!mins) {
    return `${secs}s`;
  }

  return `${mins}m ${secs}s`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  try {
    const date = typeof value === "string" ? parseISO(value) : new Date(value);
    return format(date, "dd/MM HH:mm", { locale: ptBR });
  } catch (_error) {
    return "-";
  }
};

const dtmfFrequencies = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

const tabConfig = [
  { value: "dialer", label: "Discador", icon: <PhoneIcon fontSize="small" /> },
  { value: "sequence", label: "Sequência", icon: <TimelineIcon fontSize="small" /> },
  { value: "history", label: "Histórico", icon: <HistoryIcon fontSize="small" /> },
  { value: "lead", label: "Lead", icon: <PersonIcon fontSize="small" /> },
];

const WebphoneWorkspace = ({ compact = false, closable = false, allowMinimize = false, onMinimize, onClose }) => {
  const classes = useStyles();
  const {
    session,
    status,
    muted,
    sipLoading,
    sipSettings,
    currentLead,
    currentCallContext,
    callDuration,
    dialNumber,
    setDialNumber,
    appendDialDigit,
    backspaceDialDigit,
    makeCall,
    hangup,
    answer,
    toggleMute,
    recentCalls,
    historyLoading,
    loadHistory,
    activeTab,
    setActiveTab,
    activeSequence,
    sequenceLoading,
    recordingState,
    recordingDuration,
    createSequence,
    controlSequence,
    hydrateLeadContext,
    loadSequenceById,
    startRecording,
    stopRecording,
  } = useWebphone();

  const [pipelines, setPipelines] = useState([]);
  const [pipelinesLoading, setPipelinesLoading] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [sequenceQuantity, setSequenceQuantity] = useState(10);
  const [sequenceAttempts, setSequenceAttempts] = useState(3);
  const [sequenceInterval, setSequenceInterval] = useState(30);
  const [onMaxAttempts, setOnMaxAttempts] = useState("move_stage");
  const [moveStageId, setMoveStageId] = useState("");
  const [previewTargets, setPreviewTargets] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [leadNote, setLeadNote] = useState("");
  const [leadScheduleAt, setLeadScheduleAt] = useState("");
  const keypadAudioContextRef = useRef(null);

  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => Number(pipeline.id) === Number(selectedPipelineId)) || null,
    [pipelines, selectedPipelineId]
  );

  const pipelineStages = useMemo(() => {
    if (!selectedPipeline?.stages) {
      return [];
    }

    return [...selectedPipeline.stages].sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
  }, [selectedPipeline]);

  const currentLeadPipeline = useMemo(() => {
    const pipelineId = currentLead?.pipelineId || currentCallContext?.pipelineId;
    if (!pipelineId) {
      return null;
    }

    return pipelines.find((pipeline) => Number(pipeline.id) === Number(pipelineId)) || null;
  }, [currentCallContext?.pipelineId, currentLead?.pipelineId, pipelines]);

  const currentLeadStages = useMemo(() => {
    if (!currentLeadPipeline?.stages) {
      return [];
    }

    return [...currentLeadPipeline.stages].sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
  }, [currentLeadPipeline]);

  const currentLeadStageId = currentLead?.stageId || currentCallContext?.stageId || null;
  const currentLeadOpportunityId = currentLead?.opportunityId || currentCallContext?.opportunityId || null;
  const currentLeadId = currentLead?.id || currentCallContext?.leadId || null;

  const sequenceProgress = useMemo(() => {
    if (!activeSequence?.totalTargets) {
      return 0;
    }

    return Math.round((Number(activeSequence.completedTargets || 0) / Number(activeSequence.totalTargets || 1)) * 100);
  }, [activeSequence]);

  const nextSequenceTarget = useMemo(() => {
    if (!activeSequence?.targets) {
      return null;
    }

    return [...activeSequence.targets]
      .filter((target) => target.status === "PENDING")
      .sort((left, right) => {
        const leftAttempts = Number(left.attempts || 0);
        const rightAttempts = Number(right.attempts || 0);
        if (leftAttempts !== rightAttempts) {
          return leftAttempts - rightAttempts;
        }

        return Number(left.orderIndex || 0) - Number(right.orderIndex || 0);
      })[0] || null;
  }, [activeSequence]);

  useEffect(() => {
    let cancelled = false;

    const loadPipelines = async () => {
      setPipelinesLoading(true);
      try {
        const { data } = await api.get("/pipelines");
        if (!cancelled) {
          setPipelines(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("[WebphoneWorkspace] Failed to load pipelines", error);
      } finally {
        if (!cancelled) {
          setPipelinesLoading(false);
        }
      }
    };

    loadPipelines();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPipelineId && pipelines.length > 0) {
      const fallbackPipelineId = currentLead?.pipelineId || pipelines[0].id;
      setSelectedPipelineId(String(fallbackPipelineId));
    }
  }, [currentLead?.pipelineId, pipelines, selectedPipelineId]);

  useEffect(() => {
    if (!selectedStageId && pipelineStages.length > 0) {
      const fallbackStageId = currentLead?.stageId || pipelineStages[0].id;
      setSelectedStageId(String(fallbackStageId));
    }
  }, [currentLead?.stageId, pipelineStages, selectedStageId]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory(currentLeadId ? { leadId: currentLeadId } : {});
    }
  }, [activeTab, currentLeadId, loadHistory]);

  useEffect(() => () => {
    if (keypadAudioContextRef.current?.close) {
      keypadAudioContextRef.current.close().catch(() => {});
      keypadAudioContextRef.current = null;
    }
  }, []);

  const playDialTone = useCallback((digit) => {
    const frequencies = dtmfFrequencies[digit];
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

    if (!frequencies || !AudioContextCtor) {
      return;
    }

    const audioContext =
      keypadAudioContextRef.current || new AudioContextCtor();
    keypadAudioContextRef.current = audioContext;

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.14);
    gainNode.connect(audioContext.destination);

    frequencies.forEach((frequency) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.connect(gainNode);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.14);
      oscillator.onended = () => {
        oscillator.disconnect();
      };
    });

    window.setTimeout(() => {
      try {
        gainNode.disconnect();
      } catch (_error) {}
    }, 180);
  }, []);

  const handleDialDigit = useCallback((digit) => {
    appendDialDigit(digit);
    playDialTone(digit);

    if (status === "in-call" && session?.sendDTMF) {
      try {
        session.sendDTMF(digit);
      } catch (error) {
        console.error("[WebphoneWorkspace] Failed to send DTMF digit", error);
      }
    }
  }, [appendDialDigit, playDialTone, session, status]);

  const previewSequenceTargets = async () => {
    if (!selectedPipelineId || !selectedStageId) {
      toast.info("Selecione o funil e o estágio para carregar os leads.");
      return;
    }

    setPreviewLoading(true);
    try {
      const { data } = await api.get(`/pipelines/${selectedPipelineId}/board`, {
        params: {
          stageId: selectedStageId,
          limit: Math.max(Number(sequenceQuantity || 0), 50),
        },
      });

      const stage = (data?.stages || []).find((item) => Number(item.id) === Number(selectedStageId));
      const availableTargets = (stage?.opportunities || [])
        .map((opportunity) => {
          const phone = opportunity?.lead?.phone || opportunity?.contact?.number || "";
          return {
            leadId: opportunity?.lead?.id || opportunity?.leadId || null,
            opportunityId: opportunity?.id || null,
            contactId: opportunity?.contact?.id || opportunity?.lead?.contactId || null,
            phone,
            name: opportunity?.lead?.name || opportunity?.contact?.name || opportunity?.title || phone,
            pipelineId: opportunity?.pipelineId || Number(selectedPipelineId),
            stageId: opportunity?.stageId || Number(selectedStageId),
          };
        })
        .filter((target) => target.phone)
        .slice(0, Number(sequenceQuantity || 0));

      setPreviewTargets(availableTargets);
    } catch (error) {
      console.error("[WebphoneWorkspace] Failed to preview sequence targets", error);
      toast.error("Não foi possível carregar os leads da sequência.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleStartSequence = async () => {
    if (!previewTargets.length) {
      await previewSequenceTargets();
      return;
    }

    const sequence = await createSequence({
      pipelineId: Number(selectedPipelineId),
      stageId: Number(selectedStageId),
      nextStageId: moveStageId ? Number(moveStageId) : null,
      maxAttempts: Number(sequenceAttempts),
      intervalSeconds: Number(sequenceInterval),
      onMaxAttempts,
      targets: previewTargets,
    });

    if (sequence?.id) {
      await loadSequenceById(sequence.id);
    }
  };

  const handleLeadNoteSave = async () => {
    if (!leadNote.trim() || !currentLeadOpportunityId) {
      toast.info("Selecione um lead com oportunidade e digite uma anotação.");
      return;
    }

    try {
      await api.post(`/opportunities/${currentLeadOpportunityId}/events`, {
        type: "ANOTACAO",
        metadata: { text: leadNote.trim() },
      });
      setLeadNote("");
      toast.success("Anotação registrada no lead.");
    } catch (error) {
      console.error("[WebphoneWorkspace] Failed to save lead note", error);
      toast.error("Não foi possível salvar a anotação.");
    }
  };

  const handleLeadSchedule = async () => {
    if (!leadScheduleAt || !currentLeadId) {
      toast.info("Escolha uma data para agendar o lead.");
      return;
    }

    try {
      await api.put(`/crm/leads/${currentLeadId}`, {
        meetingScheduledAt: leadScheduleAt,
      });
      hydrateLeadContext(
        {
          ...currentLead,
          meetingScheduledAt: leadScheduleAt,
        },
        currentCallContext
      );
      toast.success("Agendamento atualizado.");
    } catch (error) {
      console.error("[WebphoneWorkspace] Failed to schedule lead", error);
      toast.error("Não foi possível agendar o lead.");
    }
  };

  const handleMoveOpportunity = async (targetStageId) => {
    if (!currentLeadOpportunityId || !targetStageId) {
      toast.info("Selecione um estágio válido.");
      return;
    }

    try {
      await api.post(`/opportunities/${currentLeadOpportunityId}/move`, {
        toStageId: Number(targetStageId),
        movedBy: "USER",
      });

      hydrateLeadContext(
        {
          ...currentLead,
          stageId: Number(targetStageId),
        },
        {
          ...currentCallContext,
          stageId: Number(targetStageId),
        }
      );
      toast.success("Lead movido para o novo estágio.");
    } catch (error) {
      console.error("[WebphoneWorkspace] Failed to move opportunity", error);
      toast.error("Não foi possível mover o lead.");
    }
  };

  const handleLeadConvert = async () => {
    if (!currentLeadOpportunityId) {
      toast.info("Esse lead ainda não possui oportunidade vinculada.");
      return;
    }

    try {
      await api.put(`/opportunities/${currentLeadOpportunityId}`, { status: "WON" });
      toast.success("Lead convertido com sucesso.");
    } catch (error) {
      console.error("[WebphoneWorkspace] Failed to convert lead", error);
      toast.error("Não foi possível converter o lead.");
    }
  };

  const handleNextStage = async () => {
    if (!currentLeadStageId || !currentLeadStages.length) {
      toast.info("Não encontrei os estágios desse funil.");
      return;
    }

    const currentIndex = currentLeadStages.findIndex((stage) => Number(stage.id) === Number(currentLeadStageId));
    const nextStage = currentIndex >= 0 ? currentLeadStages[currentIndex + 1] : null;

    if (!nextStage) {
      toast.info("Esse lead já está no último estágio disponível.");
      return;
    }

    await handleMoveOpportunity(nextStage.id);
  };

  const currentStatus = statusMap[status] || statusMap.disconnected;
  const isActiveCall = status === "calling" || status === "in-call" || status === "incoming";
  const canStartCall = !isActiveCall && (status === "connected" || status === "incoming");
  const isRecording = recordingState === "recording" || recordingState === "uploading";

  return (
    <Box className={`${classes.root} ${compact ? classes.rootCompact : ""}`}>
      <Box className={`${classes.header} ${compact ? classes.headerCompact : ""}`}>
        <Avatar className={classes.headerAvatar}>
          {(currentLead?.name || "W").slice(0, 1).toUpperCase()}
        </Avatar>

        <Box flex={1} minWidth={0}>
          <Typography className={classes.headerName} noWrap>
            {currentLead?.name || "Webphone"}
          </Typography>
          <Typography className={classes.headerNumber} noWrap>
            {dialNumber || currentLead?.phone || (sipSettings?.enabled ? "Pronto para ligar" : "SIP não configurado")}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gridGap={6}>
          {allowMinimize && !compact && (
            <IconButton size="small" onClick={onMinimize} style={{ color: "#9ca3af" }}>
              <RemoveIcon fontSize="small" />
            </IconButton>
          )}
          {closable && (
            <IconButton size="small" onClick={onClose} style={{ color: "#9ca3af" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_event, value) => setActiveTab(value)}
        variant="fullWidth"
        className={classes.tabs}
      >
        {tabConfig.map((tab) => (
          <Tab key={tab.value} value={tab.value} icon={tab.icon} label={compact ? tab.label.slice(0, 4) : tab.label} />
        ))}
      </Tabs>

      <Box className={`${classes.body} ${compact ? classes.bodyCompact : ""}`}>
        {activeTab === "dialer" && (
          <>
            <Box className={classes.statusLine}>
              <span
                className={classes.statusBadge}
                style={{ backgroundColor: currentStatus.bg, color: currentStatus.color }}
              >
                <PhoneIcon style={{ fontSize: 14 }} />
                {currentStatus.label}
              </span>

              <Typography className={classes.statusInfo}>
                {status === "in-call"
                  ? `Duração: ${formatDuration(callDuration)}${isRecording ? ` • Gravando ${formatDuration(recordingDuration)}` : ""}`
                  : sipLoading
                    ? "Carregando SIP..."
                    : sipSettings?.enabled
                      ? "Discador ativo"
                      : "Aguardando configuração"}
              </Typography>
            </Box>

            <TextField
              className={classes.dialInput}
              fullWidth
              variant="outlined"
              value={dialNumber}
              onChange={(event) => setDialNumber(event.target.value)}
              placeholder="(11) 98765-4321"
            />

            <Box className={classes.keypad}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                <Button
                  key={digit}
                  className={classes.keyButton}
                  onClick={() => handleDialDigit(digit)}
                >
                  {digit}
                </Button>
              ))}
            </Box>

            <Box display="flex" alignItems="center" gridGap={10}>
              <Button
                fullWidth
                className={`${classes.primaryButton} ${isActiveCall ? classes.hangupButton : classes.callButton}`}
                onClick={isActiveCall ? hangup : () => makeCall(dialNumber, currentLead, currentCallContext)}
                disabled={!dialNumber || (!isActiveCall && status !== "connected")}
                startIcon={isActiveCall ? <CallEndIcon /> : <CallIcon />}
              >
                {isActiveCall ? "Encerrar" : "Ligar"}
              </Button>

              <Tooltip title={muted ? "Ativar microfone" : "Silenciar"}>
                <span>
                  <IconButton
                    className={classes.iconButton}
                    disabled={status !== "in-call"}
                    onClick={toggleMute}
                  >
                    {muted ? <MicOffIcon /> : <MicIcon />}
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Apagar último dígito">
                <span>
                  <IconButton className={classes.iconButton} onClick={backspaceDialDigit} disabled={!dialNumber}>
                    <BackspaceIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            <Button
              variant="outlined"
              className={classes.primaryButton}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={(status !== "in-call" && !isRecording) || recordingState === "uploading"}
              startIcon={isRecording ? <StopIcon /> : <MicIcon />}
            >
              {recordingState === "uploading"
                ? "Salvando gravação..."
                : isRecording
                  ? `Parar gravação (${formatDuration(recordingDuration)})`
                  : "Gravar ligação"}
            </Button>

            {status === "incoming" && (
              <Button
                fullWidth
                className={`${classes.primaryButton} ${classes.callButton}`}
                onClick={answer}
                startIcon={<CallIcon />}
              >
                Atender chamada
              </Button>
            )}
          </>
        )}

        {activeTab === "sequence" && (
          <>
            <Box className={classes.sectionCard}>
              <Typography className={classes.sectionTitle}>Contexto de discagem</Typography>

              <FormControl variant="outlined" size="small" fullWidth style={{ marginBottom: 12 }}>
                <InputLabel>Pipeline</InputLabel>
                <Select
                  label="Pipeline"
                  value={selectedPipelineId}
                  onChange={(event) => {
                    setSelectedPipelineId(event.target.value);
                    setSelectedStageId("");
                    setMoveStageId("");
                    setPreviewTargets([]);
                  }}
                >
                  {pipelines.map((pipeline) => (
                    <MenuItem key={pipeline.id} value={String(pipeline.id)}>
                      {pipeline.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl variant="outlined" size="small" fullWidth style={{ marginBottom: 12 }}>
                <InputLabel>Estágio do funil</InputLabel>
                <Select
                  label="Estágio do funil"
                  value={selectedStageId}
                  onChange={(event) => {
                    setSelectedStageId(event.target.value);
                    setPreviewTargets([]);
                  }}
                >
                  {pipelineStages.map((stage) => (
                    <MenuItem key={stage.id} value={String(stage.id)}>
                      {stage.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Quantidade de leads"
                type="number"
                variant="outlined"
                size="small"
                fullWidth
                value={sequenceQuantity}
                onChange={(event) => setSequenceQuantity(event.target.value)}
              />
            </Box>

            <Box className={classes.sectionCard}>
              <Typography className={classes.sectionTitle}>Automação de chamadas</Typography>

              <Box className={classes.row} style={{ marginBottom: 12 }}>
                <TextField
                  label="Tentativas por lead"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={sequenceAttempts}
                  onChange={(event) => setSequenceAttempts(event.target.value)}
                />
                <TextField
                  label="Intervalo (seg)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={sequenceInterval}
                  onChange={(event) => setSequenceInterval(event.target.value)}
                />
              </Box>

              <FormControl variant="outlined" size="small" fullWidth style={{ marginBottom: 12 }}>
                <InputLabel>Se não atender</InputLabel>
                <Select
                  label="Se não atender"
                  value={onMaxAttempts}
                  onChange={(event) => setOnMaxAttempts(event.target.value)}
                >
                  <MenuItem value="move_stage">Mover para outro estágio</MenuItem>
                  <MenuItem value="keep_stage">Manter no estágio atual</MenuItem>
                </Select>
              </FormControl>

              <FormControl variant="outlined" size="small" fullWidth disabled={onMaxAttempts !== "move_stage"}>
                <InputLabel>Mover para estágio</InputLabel>
                <Select
                  label="Mover para estágio"
                  value={moveStageId}
                  onChange={(event) => setMoveStageId(event.target.value)}
                >
                  {pipelineStages
                    .filter((stage) => Number(stage.id) !== Number(selectedStageId))
                    .map((stage) => (
                      <MenuItem key={stage.id} value={String(stage.id)}>
                        {stage.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>

            <Box display="flex" gridGap={10}>
              <Button
                variant="outlined"
                className={classes.primaryButton}
                onClick={previewSequenceTargets}
                disabled={previewLoading || pipelinesLoading}
                fullWidth
              >
                {previewLoading ? <CircularProgress size={18} /> : "Carregar leads"}
              </Button>
              <Button
                className={`${classes.primaryButton} ${classes.callButton}`}
                onClick={handleStartSequence}
                disabled={sequenceLoading || !previewTargets.length}
                fullWidth
                startIcon={<PlayArrowIcon />}
              >
                Iniciar sequência
              </Button>
            </Box>

            {!!previewTargets.length && (
              <Box className={classes.sectionCard}>
                <Typography className={classes.sectionTitle}>
                  Prévia da sequência ({previewTargets.length})
                </Typography>
                {previewTargets.slice(0, compact ? 4 : 6).map((target) => (
                  <Box key={`${target.opportunityId}-${target.leadId}`} className={classes.historyItem}>
                    <div className={classes.historyDot} style={{ backgroundColor: "#22c55e" }}>
                      {String(target.name || "L").slice(0, 1).toUpperCase()}
                    </div>
                    <Box flex={1} minWidth={0}>
                      <Typography className={classes.historyName} noWrap>{target.name}</Typography>
                      <Typography className={classes.historyMeta} noWrap>{target.phone}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {activeSequence && (
              <Box className={classes.sectionCard}>
                <Box display="flex" alignItems="center" justifyContent="space-between" gridGap={10}>
                  <Box>
                    <Typography style={{ fontWeight: 800, color: "#0f172a" }}>
                      Sequência ativa
                    </Typography>
                    <Typography className={classes.historyMeta}>
                      Progresso: {sequenceProgress}% concluído
                    </Typography>
                  </Box>

                  <Chip
                    label={activeSequence.status}
                    style={{ fontWeight: 800, backgroundColor: "#ecfdf5", color: "#166534" }}
                  />
                </Box>

                <Box className={classes.sequenceMetricRow}>
                  <Box className={classes.sequenceMetric}>
                    <Typography className={classes.sequenceMetricLabel}>Leads</Typography>
                    <Typography className={classes.sequenceMetricValue}>{activeSequence.totalTargets || 0}</Typography>
                  </Box>
                  <Box className={classes.sequenceMetric}>
                    <Typography className={classes.sequenceMetricLabel}>Atendidos</Typography>
                    <Typography className={classes.sequenceMetricValue}>{activeSequence.answeredTargets || 0}</Typography>
                  </Box>
                  <Box className={classes.sequenceMetric}>
                    <Typography className={classes.sequenceMetricLabel}>Concluídos</Typography>
                    <Typography className={classes.sequenceMetricValue}>{activeSequence.completedTargets || 0}</Typography>
                  </Box>
                </Box>

                {nextSequenceTarget && (
                  <Box mt={2}>
                    <Typography className={classes.sectionTitle}>Próximo lead</Typography>
                    <Typography className={classes.historyName}>
                      {nextSequenceTarget.contactName || nextSequenceTarget.lead?.name || nextSequenceTarget.phone}
                    </Typography>
                    <Typography className={classes.historyMeta}>
                      {nextSequenceTarget.phone} • tentativas {nextSequenceTarget.attempts || 0}/{activeSequence.maxAttempts || 0}
                    </Typography>
                  </Box>
                )}

                <Box display="flex" gridGap={10} mt={2}>
                  {activeSequence.status === "ACTIVE" ? (
                    <Button
                      variant="outlined"
                      className={classes.primaryButton}
                      onClick={() => controlSequence(activeSequence.id, "pause")}
                      startIcon={<PauseIcon />}
                      fullWidth
                    >
                      Pausar
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      className={classes.primaryButton}
                      onClick={() => controlSequence(activeSequence.id, "resume")}
                      startIcon={<PlayArrowIcon />}
                      fullWidth
                    >
                      Retomar
                    </Button>
                  )}

                  <Button
                    className={`${classes.primaryButton} ${classes.hangupButton}`}
                    onClick={() => controlSequence(activeSequence.id, "cancel")}
                    startIcon={<StopIcon />}
                    fullWidth
                  >
                    Cancelar
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}

        {activeTab === "history" && (
          <Box className={classes.sectionCard}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography className={classes.sectionTitle}>
                {currentLead ? "Histórico do lead" : "Chamadas recentes"}
              </Typography>
              <Button
                size="small"
                style={{ textTransform: "none", fontWeight: 700 }}
                onClick={() => loadHistory(currentLeadId ? { leadId: currentLeadId } : {})}
              >
                Atualizar
              </Button>
            </Box>

            {historyLoading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress size={24} />
              </Box>
            ) : recentCalls.length === 0 ? (
              <Box className={classes.emptyState}>
                <HistoryIcon style={{ fontSize: 36, opacity: 0.25 }} />
                <Typography variant="body2">Nenhuma chamada encontrada.</Typography>
              </Box>
            ) : (
              recentCalls.slice(0, compact ? 6 : 10).map((record) => {
                const callStatus = callStatusMap[record.status] || callStatusMap.failed;
                return (
                  <Box key={record.id} className={classes.historyItem}>
                    <div className={classes.historyDot} style={{ backgroundColor: callStatus.color }}>
                      {String(record.contact?.name || record.lead?.name || record.toNumber || "C").slice(0, 1).toUpperCase()}
                    </div>
                    <Box flex={1} minWidth={0}>
                      <Typography className={classes.historyName} noWrap>
                        {record.contact?.name || record.lead?.name || record.toNumber || record.fromNumber}
                      </Typography>
                      <Typography className={classes.historyMeta} noWrap>
                        {record.toNumber || record.fromNumber} • {formatDateTime(record.callStartedAt || record.createdAt)} • {formatDuration(record.duration)}
                      </Typography>
                    </Box>
                    <Typography className={classes.historyStatus} style={{ color: callStatus.color }}>
                      {callStatus.label}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>
        )}

        {activeTab === "lead" && (
          <>
            {!currentLead ? (
              <Box className={classes.emptyState}>
                <PersonIcon style={{ fontSize: 36, opacity: 0.25 }} />
                <Typography variant="body2">Selecione um lead no Kanban para usar as ações rápidas.</Typography>
              </Box>
            ) : (
              <>
                <Box className={classes.sectionCard}>
                  <Typography className={classes.sectionTitle}>Resumo do lead</Typography>
                  <Typography className={classes.historyName}>{currentLead.name}</Typography>
                  <Typography className={classes.historyMeta}>{currentLead.phone || "-"}</Typography>

                  <Box display="flex" flexWrap="wrap" gridGap={8} mt={1.5}>
                    {currentLead.companyName ? (
                      <span className={classes.leadPill} style={{ backgroundColor: "#e0f2fe", color: "#075985" }}>
                        {currentLead.companyName}
                      </span>
                    ) : null}
                    {currentLead.leadStatus ? (
                      <span className={classes.leadPill} style={{ backgroundColor: "#ecfccb", color: "#3f6212" }}>
                        {currentLead.leadStatus}
                      </span>
                    ) : null}
                    {currentLead.meetingScheduledAt ? (
                      <span className={classes.leadPill} style={{ backgroundColor: "#ede9fe", color: "#6d28d9" }}>
                        <EventAvailableIcon style={{ fontSize: 12 }} />
                        {formatDateTime(currentLead.meetingScheduledAt)}
                      </span>
                    ) : null}
                  </Box>
                </Box>

                <Box className={classes.sectionCard}>
                  <Typography className={classes.sectionTitle}>Ações rápidas</Typography>

                  <Box className={classes.row} style={{ marginBottom: 10 }}>
                    <Button
                      variant="outlined"
                      className={classes.primaryButton}
                      onClick={handleLeadConvert}
                      startIcon={<AssignmentTurnedInIcon />}
                    >
                      Converter
                    </Button>
                    <Button
                      variant="outlined"
                      className={classes.primaryButton}
                      onClick={handleNextStage}
                      startIcon={<TrendingFlatIcon />}
                    >
                      Próximo estágio
                    </Button>
                  </Box>

                  <TextField
                    label="Nova anotação"
                    variant="outlined"
                    size="small"
                    value={leadNote}
                    onChange={(event) => setLeadNote(event.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    style={{ marginBottom: 10 }}
                  />

                  <Button
                    fullWidth
                    variant="outlined"
                    className={classes.primaryButton}
                    onClick={handleLeadNoteSave}
                    startIcon={<NoteAddIcon />}
                    style={{ marginBottom: 12 }}
                  >
                    Salvar anotação
                  </Button>

                  <Box className={classes.row}>
                    <TextField
                      label="Agendar"
                      type="datetime-local"
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={leadScheduleAt}
                      onChange={(event) => setLeadScheduleAt(event.target.value)}
                    />
                    <Button
                      className={`${classes.primaryButton} ${classes.callButton}`}
                      onClick={handleLeadSchedule}
                      startIcon={<EventAvailableIcon />}
                    >
                      Agendar
                    </Button>
                  </Box>
                </Box>

                <Box className={classes.sectionCard}>
                  <Typography className={classes.sectionTitle}>Mover para estágio</Typography>
                  <FormControl variant="outlined" size="small" fullWidth>
                    <InputLabel>Estágio</InputLabel>
                    <Select
                      label="Estágio"
                      value={String(currentLeadStageId || "")}
                      onChange={(event) => handleMoveOpportunity(event.target.value)}
                    >
                      {currentLeadStages.map((stage) => (
                        <MenuItem key={stage.id} value={String(stage.id)}>
                          {stage.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Divider />

                <Button
                  className={`${classes.primaryButton} ${classes.callButton}`}
                  startIcon={<CallIcon />}
                  onClick={() => makeCall(currentLead.phone, currentLead, currentCallContext)}
                  disabled={!currentLead.phone || !canStartCall}
                >
                  Ligar para {currentLead.name}
                </Button>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default WebphoneWorkspace;
