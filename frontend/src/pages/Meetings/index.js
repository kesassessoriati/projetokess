import React, { useState, useEffect, useReducer, useCallback } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import DeleteIcon from "@material-ui/icons/Delete";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import RefreshIcon from "@material-ui/icons/Refresh";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MeetingRecorder from "../../components/MeetingRecorder";
import api from "../../services/api";
import { useSocket } from "../../context/SocketContext";

const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(2) },
  insightsBox: {
    background: theme.palette.background.default,
    borderRadius: 8,
    padding: theme.spacing(2),
    marginTop: theme.spacing(1)
  },
  chip: { margin: "2px" },
  statusPending: { backgroundColor: "#ffa726", color: "#fff" },
  statusProcessing: { backgroundColor: "#29b6f6", color: "#fff" },
  statusCompleted: { backgroundColor: "#66bb6a", color: "#fff" },
  statusFailed: { backgroundColor: "#ef5350", color: "#fff" },
  transcriptionBox: {
    maxHeight: 200,
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    fontSize: "0.85rem",
    background: theme.palette.type === "dark" ? "#1e1e1e" : "#f5f5f5",
    borderRadius: 4,
    padding: theme.spacing(1.5),
    fontFamily: "monospace"
  },
  interestBar: {
    display: "inline-block",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#66bb6a",
    marginLeft: 8
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
    case "LOAD":
      return [...action.payload];
    case "ADD":
      return [action.payload, ...state.filter((m) => m.id !== action.payload.id)];
    case "UPDATE":
      return state.map((m) => (m.id === action.payload.id ? { ...m, ...action.payload } : m));
    case "DELETE":
      return state.filter((m) => m.id !== action.payload);
    default:
      return state;
  }
}

function InsightPanel({ meeting }) {
  const classes = useStyles();
  const { insights, transcription } = meeting;

  if (!insights || Object.keys(insights).length === 0) {
    return (
      <Typography variant="caption" color="textSecondary">
        Insights não disponíveis.
      </Typography>
    );
  }

  return (
    <Box className={classes.insightsBox}>
      {insights.resumo && (
        <Box mb={1.5}>
          <Typography variant="subtitle2">Resumo</Typography>
          <Typography variant="body2">{insights.resumo}</Typography>
        </Box>
      )}

      {insights.nivel_interesse !== undefined && (
        <Box mb={1.5} display="flex" alignItems="center">
          <Typography variant="subtitle2">Nível de interesse</Typography>
          <span
            className={classes.interestBar}
            style={{ width: `${insights.nivel_interesse * 10}%`, minWidth: 20 }}
          />
          <Typography variant="body2" style={{ marginLeft: 8 }}>
            {insights.nivel_interesse}/10
          </Typography>
        </Box>
      )}

      {insights.objecoes?.length > 0 && (
        <Box mb={1.5}>
          <Typography variant="subtitle2">Objeções</Typography>
          {insights.objecoes.map((o, i) => (
            <Chip key={i} label={o} size="small" className={classes.chip} color="secondary" />
          ))}
        </Box>
      )}

      {insights.sugestoes?.length > 0 && (
        <Box mb={1.5}>
          <Typography variant="subtitle2">Sugestões</Typography>
          {insights.sugestoes.map((s, i) => (
            <Chip key={i} label={s} size="small" className={classes.chip} color="primary" />
          ))}
        </Box>
      )}

      {insights.palavras_chave?.length > 0 && (
        <Box mb={1.5}>
          <Typography variant="subtitle2">Palavras-chave</Typography>
          {insights.palavras_chave.map((p, i) => (
            <Chip key={i} label={p} size="small" className={classes.chip} variant="outlined" />
          ))}
        </Box>
      )}

      {transcription && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Transcrição completa</Typography>
          <div className={classes.transcriptionBox}>{transcription}</div>
        </Box>
      )}
    </Box>
  );
}

function MeetingRow({ meeting, onDelete, onReprocess }) {
  const classes = useStyles();
  const [expanded, setExpanded] = useState(false);

  const statusClass =
    meeting.status === "pending" ? classes.statusPending :
    meeting.status === "processing" ? classes.statusProcessing :
    meeting.status === "completed" ? classes.statusCompleted :
    classes.statusFailed;

  return (
    <>
      <TableRow hover>
        <TableCell>
          <Typography variant="body2" style={{ fontWeight: 500 }}>
            {meeting.title || "Sem título"}
          </Typography>
          {meeting.lead && (
            <Typography variant="caption" color="textSecondary">
              Lead: {meeting.lead.name}
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Chip
            label={STATUS_LABELS[meeting.status] || meeting.status}
            size="small"
            className={statusClass}
          />
          {meeting.status === "processing" && (
            <CircularProgress size={12} style={{ marginLeft: 6 }} />
          )}
        </TableCell>
        <TableCell>
          {meeting.duration ? `${Math.floor(meeting.duration / 60)}m ${meeting.duration % 60}s` : "—"}
        </TableCell>
        <TableCell>
          {format(parseISO(meeting.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
        </TableCell>
        <TableCell>
          {meeting.user?.name || "—"}
        </TableCell>
        <TableCell align="right">
          {meeting.status === "completed" && (
            <Tooltip title="Ver detalhes">
              <IconButton size="small" onClick={() => setExpanded((v) => !v)}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
          )}
          {meeting.status === "failed" && (
            <Tooltip title="Reprocessar">
              <IconButton size="small" onClick={() => onReprocess(meeting.id)}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Excluir">
            <IconButton size="small" onClick={() => onDelete(meeting.id)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      {meeting.status === "completed" && (
        <TableRow>
          <TableCell colSpan={6} style={{ paddingTop: 0, paddingBottom: 0 }}>
            <Collapse in={expanded}>
              <InsightPanel meeting={meeting} />
            </Collapse>
          </TableCell>
        </TableRow>
      )}

      {meeting.status === "failed" && meeting.errorMessage && (
        <TableRow>
          <TableCell colSpan={6}>
            <Typography variant="caption" color="error">
              Erro: {meeting.errorMessage}
            </Typography>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function Meetings() {
  const classes = useStyles();
  const [meetings, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchMeetings = useCallback(async () => {
    try {
      const { data } = await api.get("/meetings");
      dispatch({ type: "LOAD", payload: data });
    } catch {
      toast.error("Erro ao carregar reuniões");
    } finally {
      setLoading(false);
    }
  }, []);

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
      toast.success("Reunião excluída.");
    } catch {
      toast.error("Erro ao excluir reunião.");
    }
  }, []);

  const handleReprocess = useCallback(async (id) => {
    try {
      await api.post(`/meetings/${id}/reprocess`);
      dispatch({ type: "UPDATE", payload: { id, status: "pending", errorMessage: null } });
      toast.info("Reunião enfileirada para reprocessamento.");
    } catch {
      toast.error("Erro ao reprocessar.");
    }
  }, []);

  const handleSaved = useCallback((meeting) => {
    dispatch({ type: "ADD", payload: meeting });
  }, []);

  return (
    <MainContainer>
      <MainHeader>
        <Title>Reuniões Gravadas</Title>
        <Box display="flex" alignItems="center" gap={1}>
          <MeetingRecorder onSaved={handleSaved} />
          <Button size="small" onClick={fetchMeetings} startIcon={<RefreshIcon />}>
            Atualizar
          </Button>
        </Box>
      </MainHeader>

      <Box className={classes.root}>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Título / Lead</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Usuário</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : meetings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="textSecondary">
                      Nenhuma reunião gravada ainda. Clique em "Gravar Reunião" para começar.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                meetings.map((m) => (
                  <MeetingRow
                    key={m.id}
                    meeting={m}
                    onDelete={handleDelete}
                    onReprocess={handleReprocess}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </MainContainer>
  );
}
