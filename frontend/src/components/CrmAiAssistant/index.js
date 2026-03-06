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
  Paper,
} from "@material-ui/core";
import SendIcon from "@material-ui/icons/Send";
import CloseIcon from "@material-ui/icons/Close";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import api from "../../services/api";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

const useStyles = makeStyles(() => ({
  // Floating action button
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
    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(99,102,241,0.5)",
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "scale(1.08)",
      boxShadow: "0 6px 24px rgba(99,102,241,0.6)",
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
  // Modal
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
    width: 420,
    maxHeight: "80vh",
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
    maxWidth: "85%",
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
  "Como estão minhas metas?",
  "Resumo do dia",
];

const CrmAiAssistant = ({ open, onClose, onNewLead }) => {
  const classes = useStyles();
  const history = useHistory();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [creditInfo, setCreditInfo] = useState(null);

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
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data } = await api.post("/crm-ai/chat", { message: trimmed });
      setMessages(prev => [...prev, { role: "ai", text: data.reply, time: new Date() }]);
      if (data.creditInfo) setCreditInfo(data.creditInfo);
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.error === "NO_CREDITS") {
        setMessages(prev => [...prev, {
          role: "ai",
          text: "⚠️ Créditos de IA insuficientes. Contate o administrador para ampliar seu plano.",
          time: new Date(),
        }]);
        await loadCredits();
      } else {
        toast.error("Erro ao consultar IA: " + (errData?.error || "tente novamente"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
            <div style={{ flex: 1 }}>
              <Typography className={classes.modalTitle}>Assistente CRM IA</Typography>
              <Typography className={classes.modalSubtitle}>Análises e sugestões em tempo real</Typography>
            </div>
            <span className={classes.creditsBadge}>{creditsLabel}</span>
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
                  Posso analisar seu pipeline, identificar oportunidades e sugerir próximas ações baseadas nos seus dados.
                </Typography>
              </div>
            )}

            {messages.map((msg, i) => (
              <Box key={i} style={{ display: "flex", flexDirection: "column" }}>
                <div className={`${classes.msgBubble} ${msg.role === "user" ? classes.msgUser : classes.msgAi}`}>
                  {msg.text.split("\n").map((line, j) => (
                    <span key={j}>{line}{j < msg.text.split("\n").length - 1 && <br />}</span>
                  ))}
                </div>
                <Typography className={classes.msgTime} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start" }}>
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
              {loading ? <CircularProgress size={18} style={{ color: "#a5b4fc" }} /> : <SendIcon fontSize="small" />}
            </IconButton>
          </div>
        </div>
      </Fade>
    </div>
  );
};

export const CrmAiFab = ({ onNewLead }) => {
  const classes = useStyles();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [pendingCount] = useState(0);
  const menuRef = useRef(null);

  // Close menu when clicking outside
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

  return (
    <>
      <div className={classes.fab} ref={menuRef}>
        {/* Menu items */}
        {menuOpen && (
          <Fade in={menuOpen}>
            <div className={classes.fabMenu}>
              <div className={classes.fabMenuItem} onClick={openChat}>
                <div className={classes.fabMenuIcon} style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                  <SmartToyIcon style={{ color: "#fff", fontSize: 20 }} />
                </div>
                <div>
                  <Typography style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>Assistente IA</Typography>
                  <Typography style={{ fontSize: "0.72rem", color: "#64748b" }}>Análise e sugestões</Typography>
                </div>
              </div>
              {onNewLead && (
                <div className={classes.fabMenuItem} onClick={() => { setMenuOpen(false); onNewLead(); }}>
                  <div className={classes.fabMenuIcon} style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                    <PersonAddIcon style={{ color: "#fff", fontSize: 20 }} />
                  </div>
                  <div>
                    <Typography style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>Novo Lead</Typography>
                    <Typography style={{ fontSize: "0.72rem", color: "#64748b" }}>Adicionar contato</Typography>
                  </div>
                </div>
              )}
            </div>
          </Fade>
        )}

        {/* Main FAB button */}
        <Tooltip title="Ações do CRM" placement="left">
          <button
            className={classes.fabBtn}
            onClick={() => setMenuOpen(prev => !prev)}
          >
            <AutoAwesomeIcon style={{ color: "#fff", fontSize: 24 }} />
            {pendingCount > 0 && (
              <span className={classes.fabBadge}>{pendingCount}</span>
            )}
          </button>
        </Tooltip>
      </div>

      <CrmAiAssistant
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onNewLead={onNewLead}
      />
    </>
  );
};

export default CrmAiAssistant;
