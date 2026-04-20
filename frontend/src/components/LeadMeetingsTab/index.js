import React, { useState, useEffect, useCallback, useReducer } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Typography,
  makeStyles
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import DeleteIcon from "@material-ui/icons/Delete";
import RefreshIcon from "@material-ui/icons/Refresh";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "react-toastify";
import MeetingRecorder from "../MeetingRecorder";
import api from "../../services/api";
import { useSocket } from "../../context/SocketContext";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2)
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  card: {
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: theme.spacing(1.5),
    backgroundColor: "#fff"
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1)
  },
  statusPending: { backgroundColor: "#ffa726", color: "#fff" },
  statusProcessing: { backgroundColor: "#29b6f6", color: "#fff" },
  statusCompleted: { backgroundColor: "#66bb6a", color: "#fff" },
  statusFailed: { backgroundColor: "#ef5350", color: "#fff" },
  insightBox: {
    marginTop: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    background: "#f8f9fa",
    borderRadius: 6,
    fontSize: "0.85rem"
  },
  transcriptionBox: {
    maxHeight: 160,
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    fontSize: "0.8rem",
    background: "#f0f0f0",
    borderRadius: 4,
    padding: theme.spacing(1),
    fontFamily: "monospace",
    marginTop: theme.spacing(1)
  },
  interestBar: {
    display: "inline-block",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#66bb6a",
    marginLeft: 6
  }
}));

const STATUS_LABELS = {
  pending: "Aguardando",
  processing: "Processando",
  completed: "Concluída",
  failed: "Erro"
};

function reducer(state, action) {
  switch (action.type) {
    case "LOAD": return [...action.payload];
    case "ADD": return [action.payload, ...state.filter(m => m.id !== action.payload.id)];
    case "UPDATE": return state.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m);
    case "DELETE": return state.filter(m => m.id !== action.payload);
    default: return state;
  }
}

function MeetingCard({ meeting, onDelete }) {
  const classes = useStyles();
  const [expanded, setExpanded] = useState(false);

  const statusClass =
    meeting.status === "pending" ? classes.statusPending :
    meeting.status === "processing" ? classes.statusProcessing :
    meeting.status === "completed" ? classes.statusCompleted :
    classes.statusFailed;

  const { insights, transcription } = meeting;

  return (
    <Box className={classes.card}>
      <Box className={classes.cardHeader}>
        <Box>
          <Typography variant="body2" style={{ fontWeight: 600 }}>
            {meeting.title || "Reunião sem título"}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {format(parseISO(meeting.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            {meeting.duration ? ` · ${Math.floor(meeting.duration / 60)}m${meeting.duration % 60}s` : ""}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip label={STATUS_LABELS[meeting.status] || meeting.status} size="small" className={statusClass} />
          {meeting.status === "processing" && <CircularProgress size={12} />}
          {meeting.status === "completed" && (
            <IconButton size="small" onClick={() => setExpanded(v => !v)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
          <IconButton size="small" onClick={() => onDelete(meeting.id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {meeting.status === "failed" && meeting.errorMessage && (
        <Typography variant="caption" color="error" display="block" style={{ marginTop: 4 }}>
          Erro: {meeting.errorMessage}
        </Typography>
      )}

      {meeting.status === "completed" && (
        <Collapse in={expanded}>
          <Box className={classes.insightBox}>
            {insights?.resumo && (
              <Box mb={1}>
                <Typography variant="caption" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Resumo
                </Typography>
                <Typography variant="body2">{insights.resumo}</Typography>
              </Box>
            )}

            {insights?.nivel_interesse !== undefined && (
              <Box mb={1} display="flex" alignItems="center">
                <Typography variant="caption" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Interesse&nbsp;
                </Typography>
                <span
                  className={classes.interestBar}
                  style={{ width: `${insights.nivel_interesse * 8}%`, minWidth: 12 }}
                />
                <Typography variant="caption" style={{ marginLeft: 6 }}>
                  {insights.nivel_interesse}/10
                </Typography>
              </Box>
            )}

            {insights?.objecoes?.length > 0 && (
              <Box mb={1}>
                <Typography variant="caption" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Objeções
                </Typography>
                <Box>
                  {insights.objecoes.map((o, i) => (
                    <Chip key={i} label={o} size="small" style={{ margin: "2px", backgroundColor: "#fce4ec" }} />
                  ))}
                </Box>
              </Box>
            )}

            {insights?.sugestoes?.length > 0 && (
              <Box mb={1}>
                <Typography variant="caption" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Sugestões
                </Typography>
                <Box>
                  {insights.sugestoes.map((s, i) => (
                    <Chip key={i} label={s} size="small" style={{ margin: "2px", backgroundColor: "#e3f2fd" }} />
                  ))}
                </Box>
              </Box>
            )}

            {insights?.palavras_chave?.length > 0 && (
              <Box mb={1}>
                <Typography variant="caption" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Palavras-chave
                </Typography>
                <Box>
                  {insights.palavras_chave.map((p, i) => (
                    <Chip key={i} label={p} size="small" variant="outlined" style={{ margin: "2px" }} />
                  ))}
                </Box>
              </Box>
            )}

            {transcription && (
              <Box>
                <Typography variant="caption" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Transcrição completa
                </Typography>
                <div className={classes.transcriptionBox}>{transcription}</div>
              </Box>
            )}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

export default function LeadMeetingsTab({ leadId, opportunityId }) {
  const classes = useStyles();
  const [meetings, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchMeetings = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const params = {};
      if (leadId) params.leadId = leadId;
      if (opportunityId) params.opportunityId = opportunityId;
      const { data } = await api.get("/meetings", { params });
      dispatch({ type: "LOAD", payload: data });
    } catch {
      toast.error("Erro ao carregar reuniões");
    } finally {
      setLoading(false);
    }
  }, [leadId, opportunityId]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    if (!socket) return;
    const handleEvent = (data) => {
      if (data.action === "updated" && data.meetingId) {
        api.get(`/meetings/${data.meetingId}`).then(({ data: m }) => {
          dispatch({ type: "UPDATE", payload: m });
        }).catch(() => {});
      }
    };
    socket.on("meeting", handleEvent);
    return () => socket.off("meeting", handleEvent);
  }, [socket]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Excluir esta reunião?")) return;
    try {
      await api.delete(`/meetings/${id}`);
      dispatch({ type: "DELETE", payload: id });
    } catch {
      toast.error("Erro ao excluir reunião.");
    }
  }, []);

  const handleSaved = useCallback((meeting) => {
    dispatch({ type: "ADD", payload: meeting });
  }, []);

  return (
    <Box className={classes.root}>
      <Box className={classes.toolbar}>
        <Typography variant="subtitle2">
          {meetings.length} reunião(ões) gravada(s)
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <MeetingRecorder
            leadId={leadId}
            opportunityId={opportunityId}
            onSaved={handleSaved}
          />
          <IconButton size="small" onClick={fetchMeetings} title="Atualizar">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress size={24} />
        </Box>
      ) : meetings.length === 0 ? (
        <Box p={3} textAlign="center">
          <Typography variant="body2" color="textSecondary">
            Nenhuma reunião gravada para este lead.<br />
            Clique em "Gravar Reunião" para começar.
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" style={{ gap: 8 }}>
          {meetings.map(m => (
            <MeetingCard key={m.id} meeting={m} onDelete={handleDelete} />
          ))}
        </Box>
      )}
    </Box>
  );
}
