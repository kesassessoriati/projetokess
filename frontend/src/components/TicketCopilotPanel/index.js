import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import SendIcon from "@material-ui/icons/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import api from "../../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles(theme => ({
  sidebar: {
    width: 370,
    minWidth: 340,
    maxWidth: 400,
    height: "80vh",
    maxHeight: "80vh",
    backgroundColor: "#f8fafc",
    borderLeft: "1px solid #dbe4ee",
    boxShadow: "-10px 0 24px rgba(15, 23, 42, 0.08)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    overflow: "hidden",
    [theme.breakpoints.down("sm")]: {
      position: "fixed",
      inset: 0,
      width: "100vw",
      minWidth: "100vw",
      maxWidth: "100vw",
      height: "100vh",
      maxHeight: "100vh",
      zIndex: 1400
    }
  },
  header: {
    padding: theme.spacing(1.5, 2),
    borderBottom: "1px solid #dbe4ee",
    background: "linear-gradient(135deg, #064e3b 0%, #059669 70%, #10b981 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexShrink: 0
  },
  title: {
    fontWeight: 800,
    flex: 1
  },
  creditsBadge: {
    backgroundColor: "rgba(99,102,241,0.2)",
    border: "1px solid rgba(99,102,241,0.4)",
    color: "#c7d2fe",
    borderRadius: 8,
    padding: "3px 10px",
    fontSize: "0.75rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    maxWidth: 120,
    overflow: "hidden",
    textOverflow: "ellipsis",
    flexShrink: 0
  },
  content: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5)
  },
  emptyState: {
    border: "1px dashed #cbd5e1",
    borderRadius: 14,
    padding: theme.spacing(2),
    backgroundColor: "#fff",
    textAlign: "left"
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: theme.spacing(1)
  },
  actionButton: {
    justifyContent: "space-between",
    borderRadius: 12,
    padding: theme.spacing(1.25, 1.5),
    textTransform: "none",
    fontWeight: 700,
    backgroundColor: "#fff",
    borderColor: "#dbe4ee",
    "&:hover": {
      borderColor: "#10b981",
      backgroundColor: "#ecfdf5"
    }
  },
  disabledAction: {
    justifyContent: "space-between",
    borderRadius: 12,
    padding: theme.spacing(1.25, 1.5),
    textTransform: "none",
    color: "#94a3b8",
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0"
  },
  resultCard: {
    borderRadius: 14,
    padding: theme.spacing(1.5),
    border: "1px solid #dbe4ee",
    backgroundColor: "#fff"
  },
  resultTitle: {
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: theme.spacing(0.75)
  },
  resultText: {
    color: "#334155",
    whiteSpace: "pre-wrap",
    lineHeight: 1.55,
    fontSize: 14
  },
  resultFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.25)
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    color: "#475569",
    backgroundColor: "#fff",
    border: "1px solid #dbe4ee",
    borderRadius: 12,
    padding: theme.spacing(1.25)
  },
  footer: {
    borderTop: "1px solid #dbe4ee",
    padding: theme.spacing(1.5),
    backgroundColor: "#fff",
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "flex-end"
  },
  input: {
    flex: 1,
    "& .MuiOutlinedInput-root": {
      borderRadius: 14,
      backgroundColor: "#f8fafc"
    }
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#10b981",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#059669"
    },
    "&.Mui-disabled": {
      backgroundColor: "#cbd5e1",
      color: "#fff"
    }
  }
}));

const actionLabels = {
  summarize: "Resumo da conversa",
  suggest_reply: "Sugestao de resposta",
  rewrite: "Texto reescrito"
};

const noCreditsMessage =
  "Créditos de IA esgotados para hoje. Entre em contato com o administrador ou atualize seu plano para continuar usando o Copiloto.";

const TicketCopilotPanel = ({
  open,
  onClose,
  ticket,
  request,
  onInsertText
}) => {
  const classes = useStyles();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [creditInfo, setCreditInfo] = useState(null);
  const lastRequestId = useRef(null);

  const ticketId = ticket?.id;

  const canRun = Boolean(open && ticketId && !loading);

  const loadCredits = useCallback(async () => {
    try {
      const { data } = await api.get("/crm-ai/credits");
      setCreditInfo(data);
    } catch {
      // silent: credit badge is informational and must not block copilot usage
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadCredits();
    }
  }, [open, loadCredits]);

  const runCopilot = useCallback(async (action, options = {}) => {
    if (!ticketId || loading) return;

    setLoading(true);
    try {
      const { data } = await api.post(`/tickets/${ticketId}/copilot`, {
        action,
        message: options.message || "",
        draft: options.draft || ""
      });

      setResults(prev => [
        {
          id: `${Date.now()}-${action}`,
          action: data.action || action,
          result: data.result || "",
          metadata: data.metadata || {}
        },
        ...prev
      ]);
      if (data.creditInfo) setCreditInfo(data.creditInfo);
    } catch (err) {
      const errData = err?.response?.data || {};
      if (errData?.creditInfo) {
        setCreditInfo(errData.creditInfo);
      } else if (err?.response?.status === 402 || errData?.error === "NO_CREDITS") {
        loadCredits();
      }
      const message =
        err?.response?.status === 402 || errData?.error === "NO_CREDITS"
          ? noCreditsMessage
          : (
            errData?.message ||
            errData?.error ||
            "Nao foi possivel conectar ao servico de inteligencia."
          );
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [ticketId, loading, loadCredits]);

  useEffect(() => {
    if (!open || !request?.id || request.id === lastRequestId.current) return;
    lastRequestId.current = request.id;
    runCopilot(request.action, {
      message: request.message || "",
      draft: request.draft || ""
    });
  }, [open, request, runCopilot]);

  const handleAsk = useCallback(() => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;
    setPrompt("");
    runCopilot("suggest_reply", { message: cleanPrompt });
  }, [prompt, runCopilot]);

  const hasResults = results.length > 0;

  const subtitle = useMemo(() => {
    if (!ticket?.contact?.name) return "Atendimento selecionado";
    return `${ticket.contact.name}${ticket.contact.number ? ` - ${ticket.contact.number}` : ""}`;
  }, [ticket]);

  const creditsLabel = creditInfo
    ? creditInfo.allowed === 0
      ? "Ilimitado"
      : `${creditInfo.remaining} créditos`
    : "...";

  return (
    <aside className={classes.sidebar}>
      <Box className={classes.header}>
        <SmartToyIcon style={{ fontSize: 22 }} />
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Typography className={classes.title}>Copiloto</Typography>
          <Typography variant="caption" style={{ color: "rgba(255,255,255,0.86)" }} noWrap>
            {subtitle}
          </Typography>
        </Box>
        <span className={classes.creditsBadge}>{creditsLabel}</span>
        <IconButton size="small" onClick={onClose} style={{ color: "#fff" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box className={classes.content}>
        <Paper elevation={0} className={classes.emptyState}>
          <Typography style={{ fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
            Comece a usar o Copiloto
          </Typography>
          <Typography variant="body2" style={{ color: "#64748b", lineHeight: 1.5 }}>
            Use a IA para resumir, sugerir respostas e melhorar seu atendimento.
          </Typography>
        </Paper>

        <Box className={classes.actionGrid}>
          <Button
            variant="outlined"
            className={classes.actionButton}
            disabled={!canRun}
            onClick={() => runCopilot("summarize")}
          >
            Resumir esta conversa
            <span>&gt;</span>
          </Button>
          <Button
            variant="outlined"
            className={classes.actionButton}
            disabled={!canRun}
            onClick={() => runCopilot("suggest_reply")}
          >
            Sugerir uma resposta
            <span>&gt;</span>
          </Button>
          <Button variant="outlined" disabled className={classes.disabledAction}>
            Avaliar esta conversa
            <span>Em breve</span>
          </Button>
        </Box>

        {loading && (
          <Box className={classes.loadingBox}>
            <CircularProgress size={18} />
            <Typography variant="body2">Consultando inteligencia...</Typography>
          </Box>
        )}

        {hasResults && results.map(item => (
          <Paper key={item.id} elevation={0} className={classes.resultCard}>
            <Typography className={classes.resultTitle}>
              {actionLabels[item.action] || "Resposta do Copiloto"}
            </Typography>
            <Typography className={classes.resultText}>
              {item.result}
            </Typography>
            {(item.action === "suggest_reply" || item.action === "rewrite") && (
              <Box className={classes.resultFooter}>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={() => onInsertText(item.result)}
                >
                  Inserir no editor
                </Button>
              </Box>
            )}
          </Paper>
        ))}
      </Box>

      <Box className={classes.footer}>
        <TextField
          className={classes.input}
          size="small"
          variant="outlined"
          multiline
          rowsMax={3}
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          placeholder="Pergunte ao Copiloto..."
          disabled={loading}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleAsk();
            }
          }}
        />
        <IconButton
          className={classes.sendButton}
          disabled={loading || !prompt.trim()}
          onClick={handleAsk}
          title="Pedir sugestao ao Copiloto"
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </aside>
  );
};

export default TicketCopilotPanel;
