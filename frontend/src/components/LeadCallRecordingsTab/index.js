import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Typography,
  makeStyles,
} from "@material-ui/core";
import {
  GetApp as GetAppIcon,
  Refresh as RefreshIcon,
  FiberManualRecord as FiberManualRecordIcon,
} from "@material-ui/icons";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBackendUrl } from "../../config";
import { useWebphone } from "../../context/WebphoneContext";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    flexWrap: "wrap",
  },
  summary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    backgroundColor: "#eefbf2",
    color: "#15803d",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
  },
  card: {
    borderRadius: 14,
    border: "1px solid #dbe7df",
    backgroundColor: "#fff",
    padding: theme.spacing(2),
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
  },
  title: {
    fontWeight: 800,
    color: "#0f172a",
    fontSize: "0.92rem",
  },
  meta: {
    color: "#64748b",
    fontSize: "0.78rem",
  },
  audio: {
    width: "100%",
    marginTop: theme.spacing(1),
  },
  empty: {
    borderRadius: 16,
    border: "1px dashed #cbd5e1",
    backgroundColor: "#f8fafc",
    padding: theme.spacing(3),
    textAlign: "center",
    color: "#64748b",
  },
}));

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  try {
    const date = typeof value === "string" ? parseISO(value) : new Date(value);
    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch (_error) {
    return "-";
  }
};

const formatDuration = (value) => {
  const seconds = Number(value || 0);
  if (!seconds) {
    return "0s";
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (!mins) {
    return `${secs}s`;
  }

  return `${mins}m ${secs}s`;
};

const LeadCallRecordingsTab = ({ leadId, opportunityId, callRecordId }) => {
  const classes = useStyles();
  const { loadRecordings } = useWebphone();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(false);

  const backendBaseUrl = useMemo(() => (getBackendUrl() || "").replace(/\/$/, ""), []);

  const fetchRecordings = useCallback(async () => {
    if (!leadId && !opportunityId && !callRecordId) {
      setRecordings([]);
      return;
    }

    setLoading(true);
    const items = await loadRecordings({
      leadId: leadId || undefined,
      opportunityId: opportunityId || undefined,
      callRecordId: callRecordId || undefined,
    });
    setRecordings(items);
    setLoading(false);
  }, [callRecordId, leadId, loadRecordings, opportunityId]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  return (
    <Box className={classes.root}>
      <Box className={classes.toolbar}>
        <Box className={classes.summary}>
          <FiberManualRecordIcon style={{ fontSize: 14 }} />
          {recordings.length} grava{recordings.length === 1 ? "cao encontrada" : "coes encontradas"}
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={fetchRecordings}
          startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
          style={{ textTransform: "none", fontWeight: 700 }}
        >
          Atualizar
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress size={26} />
        </Box>
      ) : recordings.length === 0 ? (
        <Box className={classes.empty}>
          <Typography variant="subtitle2" style={{ fontWeight: 800, marginBottom: 6 }}>
            Nenhuma gravacao encontrada
          </Typography>
          <Typography variant="body2">
            As gravacoes das chamadas desse lead vao aparecer aqui para ouvir ou baixar.
          </Typography>
        </Box>
      ) : (
        <Box className={classes.list}>
          {recordings.map((recording) => {
            const publicUrl = recording.publicUrl
              ? /^https?:\/\//i.test(String(recording.publicUrl))
                ? String(recording.publicUrl)
                : `${backendBaseUrl}${String(recording.publicUrl).startsWith("/") ? recording.publicUrl : `/${recording.publicUrl}`}`
              : "";

            return (
              <Box key={recording.id} className={classes.card}>
                <Box className={classes.header}>
                  <Box>
                    <Typography className={classes.title}>
                      {recording.callRecord?.toNumber || recording.callRecord?.fromNumber || recording.originalName || "Gravacao"}
                    </Typography>
                    <Typography className={classes.meta}>
                      {`${formatDateTime(recording.createdAt)} - duracao ${formatDuration(recording.duration)}`}
                    </Typography>
                  </Box>

                  <Chip
                    label={recording.source === "native" ? "SIP" : "Browser"}
                    size="small"
                    style={{
                      fontWeight: 700,
                      backgroundColor: recording.source === "native" ? "#e0f2fe" : "#ecfccb",
                      color: recording.source === "native" ? "#075985" : "#3f6212",
                    }}
                  />
                </Box>

                {publicUrl ? (
                  <>
                    <audio className={classes.audio} controls preload="none" src={publicUrl}>
                      Seu navegador nao suporta reproducao de audio.
                    </audio>

                    <Box mt={1.5}>
                      <Link
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        download
                        underline="none"
                        color="inherit"
                      >
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<GetAppIcon />}
                          style={{ textTransform: "none", fontWeight: 700 }}
                        >
                          Baixar audio
                        </Button>
                      </Link>
                    </Box>
                  </>
                ) : (
                  <Typography className={classes.meta}>
                    O arquivo ainda nao esta disponivel para reproducao.
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default LeadCallRecordingsTab;
