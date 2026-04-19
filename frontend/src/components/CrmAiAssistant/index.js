import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  makeStyles,
  Box,
  Typography,
  IconButton,
  TextField,
  CircularProgress,
  Chip,
  Tooltip,
  Fade,
  Button,
} from "@material-ui/core";
import SendIcon from "@material-ui/icons/Send";
import CloseIcon from "@material-ui/icons/Close";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import AddCommentIcon from "@mui/icons-material/AddComment";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PhoneIcon from "@material-ui/icons/Phone";
import { useWebphone } from "../../context/WebphoneContext";
import api from "../../services/api";
import { toast } from "react-toastify";
import { usePlanPermissions } from "../../context/PlanPermissionsContext";

const useStyles = makeStyles(() => ({
  fab: {
    position: "fixed",
    right: 24,
    bottom: 90,
    zIndex: 1300,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
  },
  fabBtn: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #22a45d 0%, #15773f 100%)",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(21,119,63,0.45)",
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "scale(1.08)",
      boxShadow: "0 6px 24px rgba(21,119,63,0.58)",
    },
    position: "relative",
  },
  fabBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    color: "#fff",
    borderRadius: "50%",
    width: 20,
    height: 20,
    fontSize: "0.7rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #fff",
  },
  fabMenu: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "flex-end",
  },
  fabMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: "10px 16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
    cursor: "pointer",
    border: "1px solid #e2e8f0",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    "&:hover": {
      backgroundColor: "#f8fafc",
      boxShadow: "0 6px 24px rgba(0,0,0,0.16)",
      transform: "translateX(-2px)",
    },
  },
  fabMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 1400,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: "0 24px 24px 0",
  },
  modal: {
    width: 440,
    maxHeight: "85vh",
    backgroundColor: "#0f172a",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
    border: "1px solid rgba(99,102,241,0.2)",
  },
  modalHeader: {
    padding: "16px 20px",
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid rgba(99,102,241,0.2)",
    flexShrink: 0,
  },
  modalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    color: "#f1f5f9",
    fontWeight: 700,
    fontSize: "1rem",
    flex: 1,
  },
  modalSubtitle: {
    color: "#94a3b8",
    fontSize: "0.75rem",
  },
  creditsBadge: {
    backgroundColor: "rgba(99,102,241,0.2)",
    border: "1px solid rgba(99,102,241,0.4)",
    color: "#a5b4fc",
    borderRadius: 8,
    padding: "3px 10px",
    fontSize: "0.75rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  pipelineBadge: {
    backgroundColor: "rgba(34,164,93,0.15)",
    border: "1px solid rgba(34,164,93,0.3)",
    color: "#4ade80",
    borderRadius: 8,
    padding: "2px 8px",
    fontSize: "0.7rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    maxWidth: 120,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 16px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    "&::-webkit-scrollbar": { width: 4 },
    "&::-webkit-scrollbar-thumb": { backgroundColor: "#334155", borderRadius: 2 },
  },
  welcomeBox: {
    textAlign: "center",
    padding: "24px 16px 8px",
  },
  welcomeIcon: {
    fontSize: "2.5rem",
    marginBottom: 8,
  },
  welcomeTitle: {
    color: "#f1f5f9",
    fontWeight: 700,
    fontSize: "1.1rem",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    color: "#64748b",
    fontSize: "0.8rem",
    lineHeight: 1.5,
  },
  quickPrompts: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    padding: "8px 16px 4px",
    flexShrink: 0,
  },
  quickChip: {
    backgroundColor: "rgba(99,102,241,0.12)",
    border: "1px solid rgba(99,102,241,0.25)",
    color: "#a5b4fc",
    fontSize: "0.72rem",
    height: 28,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "rgba(99,102,241,0.22)",
    },
  },
  msgBubble: {
    maxWidth: "88%",
    padding: "10px 14px",
    borderRadius: 14,
    fontSize: "0.85rem",
    lineHeight: 1.6,
    wordBreak: "break-word",
  },
  msgUser: {
    alignSelf: "flex-end",
    backgroundColor: "#4f46e5",
    color: "#e0e7ff",
    borderBottomRightRadius: 4,
  },
  msgAi: {
    alignSelf: "flex-start",
    backgroundColor: "#1e293b",
    color: "#cbd5e1",
    borderBottomLeftRadius: 4,
    border: "1px solid #334155",
  },
  msgError: {
    alignSelf: "flex-start",
    backgroundColor: "#1c1017",
    color: "#fca5a5",
    borderBottomLeftRadius: 4,
    border: "1px solid #7f1d1d",
  },
  msgTime: {
    fontSize: "0.65rem",
    color: "#475569",
    marginTop: 2,
  },
  typingDots: {
    display: "flex",
    gap: 4,
    padding: "12px 14px",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    border: "1px solid #334155",
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    backgroundColor: "#4f46e5",
    borderRadius: "50%",
    animation: "$bounce 1.2s infinite",
    "&:nth-child(2)": { animationDelay: "0.2s" },
    "&:nth-child(3)": { animationDelay: "0.4s" },
  },
  "@keyframes bounce": {
    "0%, 80%, 100%": { transform: "translateY(0)", opacity: 0.5 },
    "40%": { transform: "translateY(-6px)", opacity: 1 },
  },
  actionBlock: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(99,102,241,0.08)",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: 12,
    padding: "10px 14px",
    maxWidth: "88%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  actionTitle: {
    color: "#a5b4fc",
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  actionDesc: {
    color: "#cbd5e1",
    fontSize: "0.82rem",
    lineHeight: 1.4,
  },
  actionBtns: {
    display: "flex",
    gap: 8,
  },
  noCreditsBar: {
    backgroundColor: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: 10,
    padding: "10px 14px",
    margin: "0 12px 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexShrink: 0,
  },
  noCreditsText: {
    color: "#fca5a5",
    fontSize: "0.78rem",
    flex: 1,
  },
  inputArea: {
    padding: "10px 12px 12px",
    borderTop: "1px solid #1e293b",
    display: "flex",
    gap: 8,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    "& .MuiInputBase-root": {
      backgroundColor: "#1e293b",
      borderRadius: 12,
      color: "#e2e8f0",
      fontSize: "0.85rem",
      border: "1px solid #334155",
      "&:hover": { border: "1px solid #4f46e5" },
      "&.Mui-focused": { border: "1px solid #6366f1" },
    },
    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
    "& .MuiInputBase-input::placeholder": { color: "#475569" },
  },
  sendBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#4f46e5",
    color: "#fff",
    borderRadius: 12,
    "&:hover": { backgroundColor: "#4338ca" },
    "&:disabled": { backgroundColor: "#1e293b", color: "#334155" },
  },
}));

const QUICK_PROMPTS = [
  "Como está meu pipeline?",
  "Quais leads devo priorizar?",
  "Leads com SLA atrasado",
  "Leads para fechar hoje",
  "Resumo do dia",
];

// Regex para extrair blocos de ação da resposta da IA
const ACTION_REGEX = /\[AÇÃO\]([\s\S]*?)\[\/AÇÃO\]/g;

const parseActions = (text) => {
  const actions = [];
  let match;
  ACTION_REGEX.lastIndex = 0;
  while ((match = ACTION_REGEX.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      actions.push(parsed);
    } catch (_) {}
  }
  return actions;
};

const stripActionBlocks = (text) => text.replace(/\[AÇÃO\][\s\S]*?\[\/AÇÃO\]/g, "").trim();

const actionLabel = (action) => {
  switch (action.type) {
    case "move_lead":
      return `Mover "${action.leadName || `Lead #${action.leadId}`}" para "${action.stageName}"`;
    case "add_note":
      return `Adicionar nota em "${action.leadName || `Lead #${action.leadId}`}"`;
    case "mark_won":
      return `Marcar "${action.leadName || `Lead #${action.leadId}`}" como GANHO`;
    case "mark_lost":
      return `Marcar "${action.leadName || `Lead #${action.leadId}`}" como PERDIDO`;
    default:
      return "Executar ação";
  }
};

const ActionBlock = ({ action, onConfirm, onDismiss, loading }) => {
  const classes = useStyles();
  return (
    <div className={classes.actionBlock}>
      <Typography className={classes.actionTitle}>Ação Sugerida pela IA</Typography>
      <Typography className={classes.actionDesc}>{actionLabel(action)}</Typography>
      {action.note && (
        <Typography style={{ color: "#94a3b8", fontSize: "0.78rem", fontStyle: "italic" }}>
          "{action.note}"
        </Typography>
      )}
      {action.reason && (
        <Typography style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
          Motivo: {action.reason}
        </Typography>
      )}
      <div className={classes.actionBtns}>
        <Button
          size="small"
          variant="contained"
          disabled={loading}
          style={{ backgroundColor: "#4f46e5", color: "#fff", textTransform: "none", borderRadius: 8, fontSize: "0.78rem" }}
          onClick={() => onConfirm(action)}
          startIcon={loading ? <CircularProgress size={14} style={{ color: "#fff" }} /> : <CheckCircleOutlineIcon fontSize="small" />}
        >
          Confirmar
        </Button>
        <Button
          size="small"
          disabled={loading}
          style={{ color: "#64748b", textTransform: "none", borderRadius: 8, fontSize: "0.78rem" }}
          onClick={() => onDismiss(action)}
        >
          Ignorar
        </Button>
      </div>
    </div>
  );
};

const CrmAiAssistant = ({ open, onClose, onNewLead, pipelineId }) => {
  const classes = useStyles();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [creditInfo, setCreditInfo] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // actionId sendo executado
  const [dismissedActions, setDismissedActions] = useState(new Set());

  const loadCredits = useCallback(async () => {
    try {
      const { data } = await api.get("/crm-ai/credits");
      setCreditInfo(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadCredits();
    }
  }, [open, loadCredits]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const trimmed = (text || inputText).trim();
    if (!trimmed || loading) return;

    setInputText("");
    const userMsg = { role: "user", text: trimmed, time: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Monta histórico para memória multi-turn (últimas 10 mensagens)
      const history = messages.slice(-10).map((m) => ({ role: m.role, text: m.text }));

      const { data } = await api.post("/crm-ai/chat", {
        message: trimmed,
        pipelineId: pipelineId || undefined,
        history,
      });

      const reply = data.reply || "";
      const actions = parseActions(reply);
      const cleanText = actions.length > 0 ? stripActionBlocks(reply) : reply;

      setMessages((prev) => [
        ...prev,
        { role: "ai", text: cleanText, time: new Date(), actions },
      ]);
      if (data.creditInfo) setCreditInfo(data.creditInfo);
    } catch (err) {
      const errData = err?.response?.data;
      const errCode = errData?.error;
      const httpStatus = err?.response?.status;

      let aiErrorText = "";

      if (errCode === "NO_CREDITS") {
        aiErrorText = errData?.message || "Créditos de IA insuficientes. Contate o administrador para ampliar seu plano.";
        await loadCredits();
      } else if (errCode === "QUOTA_EXCEEDED" || httpStatus === 429) {
        aiErrorText = errData?.message || "Cota da API de IA esgotada. O administrador precisa verificar o plano/cobrança da chave OpenAI ou Gemini.";
      } else if (errCode === "INVALID_KEY" || httpStatus === 401) {
        aiErrorText = errData?.message || "Chave de API inválida. O administrador precisa verificar as configurações em Whitelabel.";
      } else if (errCode === "NO_API_KEY" || httpStatus === 503) {
        aiErrorText = errData?.message || "Nenhuma chave de IA configurada. Acesse Configurações → Whitelabel para configurar a chave OpenAI ou Gemini.";
      } else {
        aiErrorText = errData?.message ? `${errData?.message}` : "Erro ao consultar a IA. Tente novamente em alguns instantes.";
        toast.error(errData?.message || errData?.error || "Erro ao consultar IA");
      }

      if (aiErrorText) {
        setMessages((prev) => [...prev, { role: "ai", text: aiErrorText, time: new Date(), isError: true }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (action, msgIndex) => {
    const actionKey = `${msgIndex}-${action.type}-${action.leadId}`;
    setActionLoading(actionKey);

    try {
      await api.post("/crm-ai/action", {
        type: action.type,
        leadId: action.leadId,
        stageId: action.stageId,
        note: action.note,
        reason: action.reason,
      });
      toast.success("Ação executada com sucesso!");
      // Marca como executada removendo das mensagens
      setDismissedActions((prev) => new Set([...prev, actionKey]));
    } catch (err) {
      const msg = err?.response?.data?.error || "Erro ao executar ação";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismissAction = (action, msgIndex) => {
    const actionKey = `${msgIndex}-${action.type}-${action.leadId}`;
    setDismissedActions((prev) => new Set([...prev, actionKey]));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setDismissedActions(new Set());
  };

  const hasNoCredits = creditInfo && creditInfo.allowed > 0 && !creditInfo.hasCredits;
  const creditsLabel = creditInfo
    ? creditInfo.allowed === 0
      ? "Ilimitado"
      : `${creditInfo.remaining} créditos`
    : "...";

  if (!open) return null;

  return (
    <div className={classes.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Fade in={open}>
        <div className={classes.modal}>
          {/* Header */}
          <div className={classes.modalHeader}>
            <div className={classes.modalHeaderIcon}>
              <SmartToyIcon style={{ color: "#e0e7ff", fontSize: 22 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography className={classes.modalTitle}>Assistente CRM IA</Typography>
              <Typography className={classes.modalSubtitle}>
                {pipelineId ? `Pipeline #${pipelineId} selecionado` : "Análises e sugestões em tempo real"}
              </Typography>
            </div>
            {pipelineId && (
              <span className={classes.pipelineBadge}>Pipeline ativo</span>
            )}
            <span className={classes.creditsBadge}>{creditsLabel}</span>
            <Tooltip title="Novo chat">
              <IconButton
                size="small"
                onClick={handleClearChat}
                style={{ color: "#94a3b8", marginLeft: 4 }}
                disabled={messages.length === 0}
              >
                <AddCommentIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Limpar conversa">
              <IconButton
                size="small"
                onClick={handleClearChat}
                style={{ color: "#94a3b8" }}
                disabled={messages.length === 0}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} style={{ color: "#64748b", marginLeft: 4 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>

          {/* Messages */}
          <div className={classes.messages}>
            {messages.length === 0 && (
              <div className={classes.welcomeBox}>
                <div className={classes.welcomeIcon}>✨</div>
                <Typography className={classes.welcomeTitle}>Olá! Sou seu assistente de CRM</Typography>
                <Typography className={classes.welcomeSubtitle}>
                  Posso analisar seu pipeline, identificar oportunidades, sugerir próximas ações e até mover leads entre estágios.
                </Typography>
              </div>
            )}

            {messages.map((msg, i) => (
              <Box key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Bolha da mensagem */}
                {msg.text && (
                  <div
                    className={`${classes.msgBubble} ${
                      msg.role === "user" ? classes.msgUser : msg.isError ? classes.msgError : classes.msgAi
                    }`}
                  >
                    {msg.text.split("\n").map((line, j) => (
                      <span key={j}>
                        {line}
                        {j < msg.text.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                )}

                {/* Blocos de ação sugeridos pela IA */}
                {msg.actions && msg.actions.length > 0 &&
                  msg.actions.map((action, ai) => {
                    const actionKey = `${i}-${action.type}-${action.leadId}`;
                    if (dismissedActions.has(actionKey)) return null;
                    return (
                      <ActionBlock
                        key={ai}
                        action={action}
                        loading={actionLoading === actionKey}
                        onConfirm={(a) => handleConfirmAction(a, i)}
                        onDismiss={(a) => handleDismissAction(a, i)}
                      />
                    );
                  })}

                <Typography
                  className={classes.msgTime}
                  style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start" }}
                >
                  {msg.time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </Typography>
              </Box>
            ))}

            {loading && (
              <div className={classes.typingDots}>
                <div className={classes.dot} />
                <div className={classes.dot} />
                <div className={classes.dot} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (only when no messages) */}
          {messages.length === 0 && (
            <div className={classes.quickPrompts}>
              {QUICK_PROMPTS.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  size="small"
                  className={classes.quickChip}
                  onClick={() => sendMessage(p)}
                  clickable
                />
              ))}
            </div>
          )}

          {/* No Credits Bar */}
          {hasNoCredits && (
            <div className={classes.noCreditsBar}>
              <Typography className={classes.noCreditsText}>
                Créditos insuficientes. Saldo atual: {creditInfo.remaining} créditos
              </Typography>
            </div>
          )}

          {/* Input */}
          <div className={classes.inputArea}>
            <TextField
              className={classes.input}
              placeholder="Pergunte sobre seu CRM..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              multiline
              maxRows={3}
              variant="outlined"
              size="small"
              disabled={loading || hasNoCredits}
            />
            <IconButton
              className={classes.sendBtn}
              onClick={() => sendMessage()}
              disabled={loading || !inputText.trim() || hasNoCredits}
              size="small"
            >
              {loading ? (
                <CircularProgress size={18} style={{ color: "#a5b4fc" }} />
              ) : (
                <SendIcon fontSize="small" />
              )}
            </IconButton>
          </div>
        </div>
      </Fade>
    </div>
  );
};

export const CrmAiFab = ({ onNewLead, pipelineId }) => {
  const classes = useStyles();
  const permissions = usePlanPermissions();
  const { setPanelOpen, setActiveTab } = useWebphone();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [pendingCount] = useState(0);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const openChat = () => {
    setMenuOpen(false);
    setChatOpen(true);
  };

  if (permissions.loading || !permissions.aiEnabled) {
    return null;
  }

  return (
    <>
      <div className={classes.fab} ref={menuRef}>
        {menuOpen && (
          <Fade in={menuOpen}>
            <div className={classes.fabMenu}>
              <div className={classes.fabMenuItem} onClick={openChat}>
                <div className={classes.fabMenuIcon} style={{ background: "linear-gradient(135deg, #22a45d, #15773f)" }}>
                  <SmartToyIcon style={{ color: "#fff", fontSize: 20 }} />
                </div>
                <div>
                  <Typography style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                    Assistente IA
                  </Typography>
                  <Typography style={{ fontSize: "0.72rem", color: "#64748b" }}>
                    Análise e sugestões
                  </Typography>
                </div>
              </div>
              <div
                className={classes.fabMenuItem}
                onClick={() => {
                  setMenuOpen(false);
                  setActiveTab("dialer");
                  setPanelOpen(true);
                }}
              >
                <div className={classes.fabMenuIcon} style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
                  <PhoneIcon style={{ color: "#fff", fontSize: 20 }} />
                </div>
                <div>
                  <Typography style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                    Webphone
                  </Typography>
                  <Typography style={{ fontSize: "0.72rem", color: "#64748b" }}>
                    Discador e chamadas
                  </Typography>
                </div>
              </div>
              {onNewLead && (
                <div
                  className={classes.fabMenuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onNewLead();
                  }}
                >
                  <div className={classes.fabMenuIcon} style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                    <PersonAddIcon style={{ color: "#fff", fontSize: 20 }} />
                  </div>
                  <div>
                    <Typography style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                      Novo Lead
                    </Typography>
                    <Typography style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      Adicionar contato
                    </Typography>
                  </div>
                </div>
              )}
            </div>
          </Fade>
        )}

        <Tooltip title="Ações do CRM" placement="left">
          <button className={classes.fabBtn} onClick={() => setMenuOpen((prev) => !prev)}>
            <AutoAwesomeIcon style={{ color: "#fff", fontSize: 24 }} />
            {pendingCount > 0 && <span className={classes.fabBadge}>{pendingCount}</span>}
          </button>
        </Tooltip>
      </div>

      <CrmAiAssistant
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onNewLead={onNewLead}
        pipelineId={pipelineId}
      />
    </>
  );
};

export default CrmAiAssistant;
