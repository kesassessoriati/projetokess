import React, { useState, useRef, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import FiberManualRecordIcon from "@material-ui/icons/FiberManualRecord";
import StopIcon from "@material-ui/icons/Stop";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  recordButton: {
    backgroundColor: "#e53935",
    color: "#fff",
    "&:hover": { backgroundColor: "#b71c1c" }
  },
  stopButton: {
    backgroundColor: "#424242",
    color: "#fff",
    "&:hover": { backgroundColor: "#212121" }
  },
  timer: {
    fontFamily: "monospace",
    fontSize: "1.4rem",
    fontWeight: "bold",
    color: theme.palette.error.main
  },
  pulse: {
    animation: "$pulse 1s infinite",
    color: "#e53935"
  },
  "@keyframes pulse": {
    "0%": { opacity: 1 },
    "50%": { opacity: 0.3 },
    "100%": { opacity: 1 }
  }
}));

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function MeetingRecorder({ leadId, opportunityId, contactId, onSaved }) {
  const classes = useStyles();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [blob, setBlob] = useState(null);

  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      let micStream = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // microphone optional
      }

      const tracks = [
        ...displayStream.getTracks(),
        ...(micStream ? micStream.getAudioTracks() : [])
      ];

      const combinedStream = new MediaStream(tracks);

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        tracks.forEach((t) => t.stop());
        const recorded = new Blob(chunks.current, { type: mimeType });
        setBlob(recorded);
        setDialogOpen(true);
        clearInterval(timerRef.current);
      };

      recorder.start(1000);
      mediaRecorder.current = recorder;
      startTimeRef.current = Date.now();
      setElapsed(0);
      setRecording(true);

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      toast.error("Não foi possível iniciar a gravação: " + err.message);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!blob) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("video", blob, `meeting_${Date.now()}.webm`);
      formData.append("title", title || `Reunião ${new Date().toLocaleDateString("pt-BR")}`);
      formData.append("duration", String(elapsed));
      if (leadId) formData.append("leadId", String(leadId));
      if (opportunityId) formData.append("opportunityId", String(opportunityId));
      if (contactId) formData.append("contactId", String(contactId));

      const { data } = await api.post("/meetings/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("Reunião enviada! Transcrição em processamento...");
      setDialogOpen(false);
      setBlob(null);
      setElapsed(0);
      setTitle("");
      if (onSaved) onSaved(data);
    } catch (err) {
      toast.error("Erro ao enviar reunião: " + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  }, [blob, title, elapsed, leadId, opportunityId, contactId, onSaved]);

  return (
    <>
      <Box display="flex" alignItems="center" gap={1}>
        {!recording ? (
          <Button
            variant="contained"
            className={classes.recordButton}
            startIcon={<FiberManualRecordIcon />}
            onClick={startRecording}
            size="small"
          >
            Gravar Reunião
          </Button>
        ) : (
          <>
            <FiberManualRecordIcon className={classes.pulse} />
            <Typography className={classes.timer}>{formatTime(elapsed)}</Typography>
            <Button
              variant="contained"
              className={classes.stopButton}
              startIcon={<StopIcon />}
              onClick={stopRecording}
              size="small"
            >
              Parar
            </Button>
          </>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => !uploading && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Salvar Reunião Gravada</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Duração: {formatTime(elapsed)} — Tamanho: {blob ? (blob.size / 1024 / 1024).toFixed(1) : 0} MB
          </Typography>
          <TextField
            label="Título da reunião (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            style={{ marginTop: 12 }}
          />
          {uploading && (
            <Box mt={2}>
              <Typography variant="caption">Enviando...</Typography>
              <LinearProgress style={{ marginTop: 4 }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            color="primary"
            variant="contained"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
          >
            {uploading ? "Enviando..." : "Enviar e Transcrever"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
