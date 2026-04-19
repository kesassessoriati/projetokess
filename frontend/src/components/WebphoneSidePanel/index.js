import React from "react";
import {
  makeStyles,
  Drawer,
  Typography,
  Box,
  IconButton,
  TextField,
  Button,
  Avatar,
  Paper,
} from "@material-ui/core";
import {
  Close as CloseIcon,
  Call as CallIcon,
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Dialpad as DialpadIcon,
  History as HistoryIcon,
  PhoneInTalk as PhoneInTalkIcon,
  PhoneMissed as PhoneMissedIcon,
} from "@material-ui/icons";
import { useWebphone } from "../../context/WebphoneContext";

const useStyles = makeStyles((theme) => ({
  drawerPaper: {
    width: 320,
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
    borderLeft: "1px solid #e2e8f0",
  },
  header: {
    padding: theme.spacing(2),
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    color: "#fff",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(3),
  },
  dialerArea: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    alignItems: "center",
  },
  dialInput: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 12,
      fontSize: "1.25rem",
      textAlign: "center",
      fontWeight: 600,
    },
    "& .MuiOutlinedInput-input": {
      textAlign: "center",
    },
  },
  keypad: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    width: "100%",
  },
  key: {
    height: 56,
    borderRadius: 12,
    fontSize: "1.1rem",
    fontWeight: 600,
    backgroundColor: "#f8fafc",
    "&:hover": {
      backgroundColor: "#f1f5f9",
    },
  },
  callButton: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    backgroundColor: "#22a45d",
    color: "#fff",
    marginTop: 16,
    "&:hover": {
      backgroundColor: "#1c914f",
    },
  },
  hangupButton: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    backgroundColor: "#ef4444",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#dc2626",
    },
  },
  activeCallCard: {
    padding: theme.spacing(3),
    borderRadius: 20,
    textAlign: "center",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  statusBadge: {
    backgroundColor: "#22a45d",
    color: "#fff",
    padding: "4px 12px",
    borderRadius: 99,
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
  },
}));

const WebphoneSidePanel = () => {
  const classes = useStyles();
  const {
    status,
    panelOpen,
    setPanelOpen,
    makeCall,
    hangup,
    answer,
    toggleMute,
    muted,
    currentLead,
    session,
    callDuration
  } = useWebphone();
  const [dialNumber, setDialNumber] = React.useState("");

  const handleKeyClick = (key) => setDialNumber((prev) => prev + key);

  const isInCall = status === "in-call" || status === "calling";
  const isIncoming = status === "calling" && session?.direction === "incoming";
  const formattedDuration = new Date(callDuration * 1000).toISOString().slice(14, 19);
  const statusLabel = status === "in-call"
    ? "Em chamada"
    : isIncoming
      ? "Ligacao recebida"
      : status === "calling"
        ? "Discando"
        : status === "connecting"
          ? "Conectando"
          : status === "connected"
            ? "Pronto para ligar"
            : "Desconectado";

  return (
    <Drawer
      anchor="right"
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
      classes={{ paper: classes.drawerPaper }}
    >
      <Box className={classes.header}>
        <Box display="flex" alignItems="center" gap={1}>
          <DialpadIcon fontSize="small" />
          <Typography variant="subtitle1" style={{ fontWeight: 700 }}>Webphone</Typography>
        </Box>
        <IconButton size="small" color="inherit" onClick={() => setPanelOpen(false)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box className={classes.content}>
        {isInCall ? (
          <Box className={classes.activeCallCard}>
            <Box className={classes.statusBadge}>{statusLabel}</Box>
            <Avatar style={{ width: 80, height: 80, backgroundColor: "#22a45d" }}>
              {isIncoming ? <PhoneMissedIcon style={{ fontSize: 40 }} /> : <PhoneInTalkIcon style={{ fontSize: 40 }} />}
            </Avatar>
            <Box>
              <Typography variant="h6" style={{ fontWeight: 800 }}>
                {currentLead?.name || session?.remote_identity?.uri?.user || "Numero desconhecido"}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {status === "in-call" ? `Conectado • ${formattedDuration}` : statusLabel}
              </Typography>
            </Box>

            <Box display="flex" gap={2} mt={2}>
              <IconButton
                style={{ backgroundColor: "#f1f5f9" }}
                onClick={toggleMute}
                disabled={status !== "in-call"}
              >
                {muted ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
              {isIncoming && (
                <IconButton
                  className={classes.callButton}
                  onClick={answer}
                  style={{ marginTop: 0 }}
                >
                  <CallIcon style={{ fontSize: 32 }} />
                </IconButton>
              )}
              <IconButton className={classes.hangupButton} onClick={hangup}>
                <CallEndIcon style={{ fontSize: 32 }} />
              </IconButton>
              <IconButton style={{ backgroundColor: "#f1f5f9" }} disabled>
                <DialpadIcon />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Box className={classes.dialerArea}>
            <TextField
              className={classes.dialInput}
              fullWidth
              variant="outlined"
              placeholder="Digite o numero"
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
            />

            <Box className={classes.keypad}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => (
                <Button key={key} className={classes.key} onClick={() => handleKeyClick(key)}>
                  {key}
                </Button>
              ))}
            </Box>

            <IconButton
              className={classes.callButton}
              disabled={!dialNumber || status === "disconnected" || status === "connecting"}
              onClick={() => makeCall(dialNumber)}
            >
              <CallIcon style={{ fontSize: 32 }} />
            </IconButton>
            <Typography variant="caption" color="textSecondary">
              {statusLabel}
            </Typography>
          </Box>
        )}

        <Box mt="auto">
          <Typography variant="overline" color="textSecondary">Chamadas Recentes</Typography>
          <Paper variant="outlined" style={{ borderRadius: 12, padding: 8, marginTop: 8 }}>
            <Box p={4} textAlign="center" color="textSecondary">
              <HistoryIcon style={{ fontSize: 40, opacity: 0.2 }} />
              <Typography variant="body2">Nenhuma chamada recente</Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Drawer>
  );
};

export default WebphoneSidePanel;
