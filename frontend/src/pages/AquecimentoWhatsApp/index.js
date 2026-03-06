import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Typography,
  CircularProgress,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Divider,
  Tooltip,
  IconButton,
} from "@material-ui/core";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import RouterIcon from "@material-ui/icons/Router";
import MessageIcon from "@material-ui/icons/Message";
import TrendingUpIcon from "@material-ui/icons/TrendingUp";
import DeleteIcon from "@material-ui/icons/Delete";
import AddIcon from "@material-ui/icons/Add";
import AutorenewIcon from "@material-ui/icons/Autorenew";
import SaveIcon from "@material-ui/icons/Save";
import FiberManualRecordIcon from "@material-ui/icons/FiberManualRecord";

import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
// eslint-disable-next-line no-unused-vars
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import { useSocket } from "../../context/SocketContext";

// ─── Styles ──────────────────────────────────────────────────────────────────

const useStyles = makeStyles(() => ({
  root: {
    minHeight: "100vh",
    backgroundColor: "#0f0f0f",
    color: "#f0f0f0",
    padding: "24px",
    fontFamily: "'Inter', 'Roboto', sans-serif",
  },
  pageHeader: {
    marginBottom: "24px",
  },
  pageTitle: {
    fontSize: "26px",
    fontWeight: 700,
    color: "#f0f0f0",
    lineHeight: 1.2,
  },
  pageSubtitle: {
    fontSize: "14px",
    color: "#888",
    marginTop: "4px",
  },
  // Summary cards
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  statIconWrap: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statLabel: {
    fontSize: "12px",
    color: "#888",
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#f0f0f0",
    lineHeight: 1,
  },
  // Main layout
  mainLayout: {
    display: "grid",
    gridTemplateColumns: "30% 70%",
    gap: "16px",
    alignItems: "flex-start",
  },
  // Left panel
  leftPanel: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    overflow: "hidden",
  },
  leftPanelHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #2a2a2a",
  },
  leftPanelTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#f0f0f0",
  },
  connectionList: {
    maxHeight: "calc(100vh - 280px)",
    overflowY: "auto",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "#1a1a1a",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#3a3a3a",
      borderRadius: "3px",
    },
  },
  connectionItem: {
    padding: "14px 20px",
    borderBottom: "1px solid #1f1f1f",
    cursor: "pointer",
    transition: "background 0.15s",
    "&:hover": {
      backgroundColor: "#222",
    },
    "&:last-child": {
      borderBottom: "none",
    },
  },
  connectionItemSelected: {
    backgroundColor: "#222",
    borderLeft: "3px solid #ff6b35",
  },
  connectionName: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#f0f0f0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  connectionNumber: {
    fontSize: "12px",
    color: "#888",
    marginTop: "2px",
  },
  connectionMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "8px",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.3px",
  },
  connectionToggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "6px",
  },
  // Right panel
  rightPanel: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    overflow: "hidden",
    minHeight: "400px",
  },
  placeholderWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "400px",
    gap: "12px",
    color: "#555",
  },
  placeholderIcon: {
    fontSize: "56px",
    color: "#333",
  },
  placeholderText: {
    fontSize: "15px",
    color: "#555",
    textAlign: "center",
  },
  // Tabs
  tabsRoot: {
    borderBottom: "1px solid #2a2a2a",
    "& .MuiTabs-indicator": {
      backgroundColor: "#ff6b35",
    },
  },
  tabItem: {
    color: "#888",
    fontSize: "13px",
    fontWeight: 500,
    minWidth: "100px",
    "&.Mui-selected": {
      color: "#ff6b35",
    },
  },
  tabContent: {
    padding: "24px",
  },
  // Chart
  chartWrap: {
    backgroundColor: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "20px",
  },
  chartTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#aaa",
    marginBottom: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  // Stats grid
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  miniStatCard: {
    backgroundColor: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "14px",
  },
  miniStatLabel: {
    fontSize: "11px",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "6px",
  },
  miniStatValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#f0f0f0",
  },
  miniStatSub: {
    fontSize: "11px",
    color: "#666",
    marginTop: "2px",
  },
  // Log feed
  logFeedWrap: {
    backgroundColor: "#0d0d0d",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "12px",
    maxHeight: "260px",
    overflowY: "auto",
    fontFamily: "'Fira Mono', 'Courier New', monospace",
    fontSize: "12px",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "#0d0d0d",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#2a2a2a",
      borderRadius: "3px",
    },
  },
  logLine: {
    display: "flex",
    gap: "10px",
    padding: "3px 0",
    borderBottom: "1px solid #181818",
    alignItems: "flex-start",
    "&:last-child": {
      borderBottom: "none",
    },
  },
  logTime: {
    color: "#444",
    flexShrink: 0,
    fontSize: "11px",
    paddingTop: "1px",
  },
  logMsg: {
    flex: 1,
    wordBreak: "break-word",
  },
  logSectionTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  liveIndicator: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    animation: "$pulse 1.5s infinite",
  },
  "@keyframes pulse": {
    "0%": { opacity: 1 },
    "50%": { opacity: 0.3 },
    "100%": { opacity: 1 },
  },
  // Config form
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "16px",
  },
  formRowFull: {
    marginBottom: "16px",
  },
  formLabel: {
    fontSize: "12px",
    color: "#888",
    marginBottom: "6px",
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  darkInput: {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#141414",
      borderRadius: "8px",
      color: "#f0f0f0",
      "& fieldset": {
        borderColor: "#2a2a2a",
      },
      "&:hover fieldset": {
        borderColor: "#3a3a3a",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#ff6b35",
      },
    },
    "& .MuiInputLabel-root": {
      color: "#666",
      "&.Mui-focused": {
        color: "#ff6b35",
      },
    },
    "& .MuiSelect-root": {
      color: "#f0f0f0",
    },
    "& .MuiSelect-icon": {
      color: "#666",
    },
    "& .MuiInputBase-input": {
      color: "#f0f0f0",
    },
  },
  darkSelect: {
    backgroundColor: "#141414",
    borderRadius: "8px",
    color: "#f0f0f0",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#2a2a2a",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#3a3a3a",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#ff6b35",
    },
    "& .MuiSelect-icon": {
      color: "#666",
    },
  },
  rampUpBox: {
    backgroundColor: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "16px",
    marginTop: "4px",
  },
  primaryBtn: {
    backgroundColor: "#ff6b35",
    color: "#fff",
    fontWeight: 600,
    borderRadius: "8px",
    padding: "8px 20px",
    textTransform: "none",
    "&:hover": {
      backgroundColor: "#e55a25",
    },
    "&:disabled": {
      backgroundColor: "#3a3a3a",
      color: "#666",
    },
  },
  secondaryBtn: {
    backgroundColor: "#2a2a2a",
    color: "#f0f0f0",
    fontWeight: 600,
    borderRadius: "8px",
    padding: "8px 20px",
    textTransform: "none",
    "&:hover": {
      backgroundColor: "#333",
    },
  },
  // Scripts tab
  scriptsList: {
    maxHeight: "200px",
    overflowY: "auto",
    marginBottom: "16px",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": { background: "#141414" },
    "&::-webkit-scrollbar-thumb": { background: "#2a2a2a", borderRadius: "3px" },
  },
  scriptItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "8px 0",
    borderBottom: "1px solid #1f1f1f",
    "&:last-child": { borderBottom: "none" },
  },
  scriptText: {
    flex: 1,
    fontSize: "13px",
    color: "#ccc",
    lineHeight: 1.5,
  },
  aiSection: {
    backgroundColor: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "16px",
  },
  aiSectionTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#ff6b35",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  previewScripts: {
    backgroundColor: "#0d0d0d",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "12px",
    maxHeight: "200px",
    overflowY: "auto",
    marginTop: "12px",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": { background: "#0d0d0d" },
    "&::-webkit-scrollbar-thumb": { background: "#2a2a2a", borderRadius: "3px" },
  },
  previewScriptItem: {
    fontSize: "12px",
    color: "#aaa",
    padding: "6px 0",
    borderBottom: "1px solid #181818",
    "&:last-child": { borderBottom: "none" },
  },
  addScriptRow: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
  },
  sectionDivider: {
    borderColor: "#2a2a2a",
    margin: "20px 0",
  },
  switchLabel: {
    "& .MuiFormControlLabel-label": {
      fontSize: "13px",
      color: "#ccc",
    },
    "& .MuiSwitch-colorPrimary.Mui-checked": {
      color: "#ff6b35",
    },
    "& .MuiSwitch-colorPrimary.Mui-checked + .MuiSwitch-track": {
      backgroundColor: "#ff6b35",
    },
  },
  emptyLogs: {
    textAlign: "center",
    color: "#444",
    padding: "20px",
    fontSize: "13px",
  },
  loadingWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
  },
  menuPaper: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    "& .MuiMenuItem-root": {
      color: "#f0f0f0",
      fontSize: "13px",
      "&:hover": { backgroundColor: "#2a2a2a" },
    },
  },
}));

// ─── Constants ───────────────────────────────────────────────────────────────

const LOG_COLORS = {
  PRIVATE_MSG: "#60a5fa",
  GROUP_MSG: "#4ade80",
  CROSS_MSG: "#c084fc",
  ERROR: "#f87171",
  INFO: "#9ca3af",
};

const HEALTH_CONFIG = {
  excellent: { color: "#3b82f6", label: "💪 Excelente" },
  great: { color: "#22c55e", label: "✅ Ótimo" },
  good: { color: "#eab308", label: "👍 Bom" },
  warming: { color: "#f97316", label: "🔥 Aquecendo" },
  null: { color: "#6b7280", label: "❄️ Inativo" },
};

const WARMUP_MODES = [
  { value: "private", label: "Privado (números aleatórios)" },
  { value: "groups", label: "Grupos do número" },
  { value: "cross", label: "Cruzado (números conectados)" },
  { value: "combined", label: "Combinado (todos os modos)" },
];

const AI_CATEGORIES = [
  { value: "ecommerce", label: "E-commerce" },
  { value: "services", label: "Serviços" },
  { value: "food", label: "Alimentação" },
  { value: "health", label: "Saúde" },
  { value: "education", label: "Educação" },
  { value: "realestate", label: "Imobiliário" },
  { value: "generic", label: "Genérico" },
];

const DEFAULT_FORM = {
  warmupMode: "private",
  messagesPerDay: 20,
  minInterval: 5,
  maxInterval: 15,
  startHour: "08:00",
  endHour: "22:00",
  dailyRampUp: false,
  rampUpStart: 5,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

function formatDate(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return isoString;
  }
}

function getHealthConfig(score) {
  if (!score) return HEALTH_CONFIG["null"];
  return HEALTH_CONFIG[score] || HEALTH_CONFIG["null"];
}

function getModeLabelShort(mode) {
  const map = {
    private: "Privado",
    groups: "Grupos",
    cross: "Cruzado",
    combined: "Combinado",
  };
  return map[mode] || mode || "-";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconBg, label, value }) {
  const classes = useStyles();
  return (
    <Box className={classes.statCard}>
      <Box className={classes.statIconWrap} style={{ backgroundColor: iconBg }}>
        <Icon style={{ color: "#fff", fontSize: "22px" }} />
      </Box>
      <Box>
        <Typography className={classes.statLabel}>{label}</Typography>
        <Typography className={classes.statValue}>{value}</Typography>
      </Box>
    </Box>
  );
}

function StatusBadge({ status }) {
  const classes = useStyles();
  const connected = status === "CONNECTED" || status === "open";
  return (
    <Box
      className={classes.badge}
      style={{
        backgroundColor: connected ? "rgba(34,197,94,0.15)" : "rgba(107,114,128,0.15)",
        color: connected ? "#22c55e" : "#6b7280",
      }}
    >
      <FiberManualRecordIcon style={{ fontSize: "8px" }} />
      {connected ? "Conectado" : "Desconectado"}
    </Box>
  );
}

function HealthBadge({ score }) {
  const classes = useStyles();
  const cfg = getHealthConfig(score);
  return (
    <Box
      className={classes.badge}
      style={{
        backgroundColor: cfg.color + "22",
        color: cfg.color,
      }}
    >
      {cfg.label}
    </Box>
  );
}

function LogFeed({ logs }) {
  const classes = useStyles();
  const feedRef = useRef(null);

  // Keep scroll at bottom when new logs arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Box>
      <Typography className={classes.logSectionTitle}>
        <span className={classes.liveIndicator} />
        Log em tempo real
      </Typography>
      <Box className={classes.logFeedWrap} ref={feedRef}>
        {logs.length === 0 ? (
          <Typography className={classes.emptyLogs}>Nenhum log registrado ainda.</Typography>
        ) : (
          [...logs].reverse().map((log, idx) => (
            <Box key={log.id || idx} className={classes.logLine}>
              <span className={classes.logTime}>{formatTime(log.createdAt)}</span>
              <span
                className={classes.logMsg}
                style={{ color: LOG_COLORS[log.type] || LOG_COLORS.INFO }}
              >
                [{log.type || "INFO"}] {log.message}
              </span>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

function DashboardTab({ warmup, stats, logs, loadingStats }) {
  const classes = useStyles();
  if (loadingStats) {
    return (
      <Box className={classes.loadingWrap}>
        <CircularProgress size={32} style={{ color: "#ff6b35" }} />
      </Box>
    );
  }

  const chartData = (stats && stats.chart) ? stats.chart.map((d) => ({
    date: formatDate(d.date),
    Mensagens: d.count,
  })) : [];

  const effectiveLimit = warmup ? warmup.messagesPerDay : "-";
  const sentToday = warmup ? (warmup.messagesSentToday || 0) : "-";
  const healthScore = warmup ? warmup.healthScore : null;
  const mode = warmup ? getModeLabelShort(warmup.warmupMode) : "-";
  const rampDay = warmup && warmup.dailyRampUp ? warmup.rampUpDay || 1 : null;

  return (
    <Box>
      {/* Chart */}
      <Box className={classes.chartWrap}>
        <Typography className={classes.chartTitle}>Mensagens enviadas — últimos 7 dias</Typography>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#f0f0f0" }}
                labelStyle={{ color: "#aaa" }}
                itemStyle={{ color: "#ff6b35" }}
              />
              <Bar dataKey="Mensagens" fill="#ff6b35" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box style={{ textAlign: "center", color: "#444", padding: "40px 0", fontSize: "13px" }}>
            Nenhum dado disponível ainda.
          </Box>
        )}
      </Box>

      {/* Stats grid */}
      <Box className={classes.statsGrid}>
        <Box className={classes.miniStatCard}>
          <Typography className={classes.miniStatLabel}>Limite efetivo</Typography>
          <Typography className={classes.miniStatValue}>{effectiveLimit}</Typography>
          <Typography className={classes.miniStatSub}>msgs/dia</Typography>
        </Box>
        <Box className={classes.miniStatCard}>
          <Typography className={classes.miniStatLabel}>Enviadas hoje</Typography>
          <Typography className={classes.miniStatValue}>{sentToday}</Typography>
          <Typography className={classes.miniStatSub}>mensagens</Typography>
        </Box>
        <Box className={classes.miniStatCard}>
          <Typography className={classes.miniStatLabel}>Saúde</Typography>
          <Typography className={classes.miniStatValue} style={{ fontSize: "15px", marginTop: "4px" }}>
            {getHealthConfig(healthScore).label}
          </Typography>
        </Box>
        <Box className={classes.miniStatCard}>
          <Typography className={classes.miniStatLabel}>Modo</Typography>
          <Typography className={classes.miniStatValue} style={{ fontSize: "15px", marginTop: "4px" }}>{mode}</Typography>
        </Box>
        {rampDay !== null && (
          <Box className={classes.miniStatCard}>
            <Typography className={classes.miniStatLabel}>Dia de ramp-up</Typography>
            <Typography className={classes.miniStatValue}>#{rampDay}</Typography>
            <Typography className={classes.miniStatSub}>automático ativo</Typography>
          </Box>
        )}
      </Box>

      {/* Log feed */}
      <LogFeed logs={logs} />
    </Box>
  );
}

function ConfigTab({ warmup, selectedId, onSaved }) {
  const classes = useStyles();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (warmup) {
      setForm({
        warmupMode: warmup.warmupMode || "private",
        messagesPerDay: warmup.messagesPerDay || 20,
        minInterval: warmup.minInterval || 5,
        maxInterval: warmup.maxInterval || 15,
        startHour: warmup.startHour || "08:00",
        endHour: warmup.endHour || "22:00",
        dailyRampUp: warmup.dailyRampUp || false,
        rampUpStart: warmup.rampUpStart || 5,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [warmup, selectedId]);

  const handleChange = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.post(`/whatsapp-warmup/${selectedId}`, form);
      toast.success("Configuração salva com sucesso!");
      if (onSaved) onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar configuração.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Warmup mode */}
      <Box className={classes.formRowFull}>
        <FormControl variant="outlined" fullWidth className={classes.darkInput}>
          <InputLabel>Modo de aquecimento</InputLabel>
          <Select
            value={form.warmupMode}
            onChange={handleChange("warmupMode")}
            label="Modo de aquecimento"
            MenuProps={{ classes: { paper: classes.menuPaper } }}
          >
            {WARMUP_MODES.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Messages per day */}
      <Box className={classes.formRow}>
        <TextField
          label="Mensagens por dia"
          type="number"
          variant="outlined"
          fullWidth
          className={classes.darkInput}
          value={form.messagesPerDay}
          onChange={handleChange("messagesPerDay")}
          inputProps={{ min: 1, max: 500 }}
        />
        <Box /> {/* spacer */}
      </Box>

      {/* Intervals */}
      <Box className={classes.formRow}>
        <TextField
          label="Intervalo mínimo (min)"
          type="number"
          variant="outlined"
          fullWidth
          className={classes.darkInput}
          value={form.minInterval}
          onChange={handleChange("minInterval")}
          inputProps={{ min: 1, max: 60 }}
        />
        <TextField
          label="Intervalo máximo (min)"
          type="number"
          variant="outlined"
          fullWidth
          className={classes.darkInput}
          value={form.maxInterval}
          onChange={handleChange("maxInterval")}
          inputProps={{ min: 1, max: 120 }}
        />
      </Box>

      {/* Time range */}
      <Box className={classes.formRow}>
        <TextField
          label="Horário início"
          type="time"
          variant="outlined"
          fullWidth
          className={classes.darkInput}
          value={form.startHour}
          onChange={handleChange("startHour")}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Horário fim"
          type="time"
          variant="outlined"
          fullWidth
          className={classes.darkInput}
          value={form.endHour}
          onChange={handleChange("endHour")}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {/* Ramp-up */}
      <Box className={classes.formRowFull}>
        <FormControlLabel
          className={classes.switchLabel}
          control={
            <Switch
              checked={form.dailyRampUp}
              onChange={(e) => setForm((prev) => ({ ...prev, dailyRampUp: e.target.checked }))}
              color="primary"
            />
          }
          label="Ramp-up automático (aumenta gradualmente ao longo dos dias)"
        />
        {form.dailyRampUp && (
          <Box className={classes.rampUpBox}>
            <Box className={classes.formRow}>
              <TextField
                label="Começar com (msgs/dia)"
                type="number"
                variant="outlined"
                fullWidth
                className={classes.darkInput}
                value={form.rampUpStart}
                onChange={handleChange("rampUpStart")}
                inputProps={{ min: 1, max: 50 }}
              />
              <Box style={{ display: "flex", alignItems: "center" }}>
                <Typography style={{ color: "#888", fontSize: "13px" }}>
                  Dia atual de ramp-up:{" "}
                  <strong style={{ color: "#f0f0f0" }}>
                    #{warmup && warmup.dailyRampUp ? warmup.rampUpDay || 1 : "—"}
                  </strong>
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <Divider className={classes.sectionDivider} />

      <Box style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          className={classes.primaryBtn}
          startIcon={saving ? <CircularProgress size={16} style={{ color: "#fff" }} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar configuração"}
        </Button>
      </Box>
    </Box>
  );
}

function ScriptsTab({ warmup, selectedId, onSaved }) {
  const classes = useStyles();
  const [scripts, setScripts] = useState([]);
  const [newScript, setNewScript] = useState("");
  const [aiCategory, setAiCategory] = useState("generic");
  const [generating, setGenerating] = useState(false);
  const [previewScripts, setPreviewScripts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (warmup && warmup.scriptTemplates) {
      const arr = Array.isArray(warmup.scriptTemplates)
        ? warmup.scriptTemplates
        : typeof warmup.scriptTemplates === "string"
        ? warmup.scriptTemplates.split("\n").filter(Boolean)
        : [];
      setScripts(arr);
    } else {
      setScripts([]);
    }
    setPreviewScripts([]);
    setNewScript("");
  }, [warmup, selectedId]);

  const handleDelete = (idx) => {
    setScripts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    const trimmed = newScript.trim();
    if (!trimmed) return;
    setScripts((prev) => [...prev, trimmed]);
    setNewScript("");
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setPreviewScripts([]);
    try {
      const { data } = await api.post("/whatsapp-warmup/generate-script", {
        category: aiCategory,
        count: 15,
      });
      setPreviewScripts(data.scripts || []);
      const src = data.source === "openai" ? "OpenAI" : "templates locais";
      toast.info(`Scripts gerados via ${src}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar scripts com IA.");
    } finally {
      setGenerating(false);
    }
  };

  const handleUsePreview = () => {
    setScripts((prev) => {
      const combined = [...prev, ...previewScripts];
      // deduplicate
      return [...new Set(combined)];
    });
    setPreviewScripts([]);
    toast.success(`${previewScripts.length} scripts adicionados!`);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.post(`/whatsapp-warmup/${selectedId}`, { scriptTemplates: scripts });
      toast.success("Scripts salvos com sucesso!");
      if (onSaved) onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar scripts.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Current scripts */}
      <Typography className={classes.logSectionTitle} style={{ marginBottom: "10px" }}>
        Scripts atuais ({scripts.length})
      </Typography>

      {scripts.length === 0 ? (
        <Box
          style={{
            backgroundColor: "#141414",
            border: "1px solid #2a2a2a",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            color: "#555",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          Nenhum script configurado. Adicione manualmente ou gere com IA.
        </Box>
      ) : (
        <Box
          className={classes.scriptsList}
          style={{
            backgroundColor: "#141414",
            border: "1px solid #2a2a2a",
            borderRadius: "8px",
            padding: "8px 12px",
            marginBottom: "16px",
          }}
        >
          {scripts.map((s, idx) => (
            <Box key={idx} className={classes.scriptItem}>
              <Typography className={classes.scriptText}>{s}</Typography>
              <Tooltip title="Remover">
                <IconButton
                  size="small"
                  onClick={() => handleDelete(idx)}
                  style={{ color: "#f87171", padding: "2px" }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      {/* Add manually */}
      <Box className={classes.addScriptRow} style={{ marginBottom: "16px" }}>
        <TextField
          placeholder="Digite uma mensagem de script..."
          variant="outlined"
          fullWidth
          multiline
          rows={2}
          className={classes.darkInput}
          value={newScript}
          onChange={(e) => setNewScript(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          className={classes.secondaryBtn}
          startIcon={<AddIcon />}
          onClick={handleAdd}
          style={{ height: "56px", flexShrink: 0 }}
        >
          Adicionar
        </Button>
      </Box>

      <Divider className={classes.sectionDivider} />

      {/* AI generation section */}
      <Box className={classes.aiSection}>
        <Typography className={classes.aiSectionTitle}>
          ✨ Gerar com IA
        </Typography>
        <Box style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <FormControl variant="outlined" style={{ minWidth: "180px" }} className={classes.darkInput}>
            <InputLabel>Categoria</InputLabel>
            <Select
              value={aiCategory}
              onChange={(e) => setAiCategory(e.target.value)}
              label="Categoria"
              MenuProps={{ classes: { paper: classes.menuPaper } }}
            >
              {AI_CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            className={classes.primaryBtn}
            startIcon={generating ? <CircularProgress size={16} style={{ color: "#fff" }} /> : <AutorenewIcon />}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Gerando..." : "Gerar Scripts"}
          </Button>
        </Box>

        {previewScripts.length > 0 && (
          <Box style={{ marginTop: "12px" }}>
            <Typography style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>
              Pré-visualização ({previewScripts.length} scripts):
            </Typography>
            <Box className={classes.previewScripts}>
              {previewScripts.map((s, idx) => (
                <Box key={idx} className={classes.previewScriptItem}>
                  {idx + 1}. {s}
                </Box>
              ))}
            </Box>
            <Button
              className={classes.primaryBtn}
              style={{ marginTop: "10px" }}
              onClick={handleUsePreview}
            >
              Usar estes scripts
            </Button>
          </Box>
        )}
      </Box>

      <Box style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          className={classes.primaryBtn}
          startIcon={saving ? <CircularProgress size={16} style={{ color: "#fff" }} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar scripts"}
        </Button>
      </Box>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AquecimentoWhatsApp() {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();

  // Summary state
  const [summary, setSummary] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Selected connection state
  const [selectedId, setSelectedId] = useState(null);
  const [warmupConfig, setWarmupConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Toggle loading state per connection
  const [toggling, setToggling] = useState({});

  // ── Fetch summary ──────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const { data } = await api.get("/whatsapp-warmup/summary");
      setSummary(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar resumo de aquecimento:", err);
      toast.error("Erro ao carregar conexões.");
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // ── Fetch detail when connection selected ─────────────────────────────────
  const fetchDetail = useCallback(async (id) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const [configRes, logsRes] = await Promise.all([
        api.get(`/whatsapp-warmup/${id}`),
        api.get(`/whatsapp-warmup/${id}/logs?limit=100`),
      ]);
      setWarmupConfig(configRes.data || null);
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
    } catch (err) {
      console.error("Erro ao carregar detalhes do aquecimento:", err);
      setWarmupConfig(null);
      setLogs([]);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const fetchStats = useCallback(async (id) => {
    if (!id) return;
    setLoadingStats(true);
    try {
      const { data } = await api.get(`/whatsapp-warmup/${id}/stats`);
      setStats(data || null);
      // Update warmupConfig from stats if more up-to-date
      if (data && data.warmup) {
        setWarmupConfig((prev) => ({ ...(prev || {}), ...data.warmup }));
      }
    } catch (err) {
      console.error("Erro ao carregar stats:", err);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const handleSelectConnection = useCallback((id) => {
    setSelectedId(id);
    setActiveTab(0);
    setWarmupConfig(null);
    setLogs([]);
    setStats(null);
    fetchDetail(id);
    fetchStats(id);
  }, [fetchDetail, fetchStats]);

  // ── Socket: real-time logs ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;
    const event = `company-${user.companyId}-warmup-log`;

    const handleWarmupLog = (data) => {
      if (data.action === "create" && data.log) {
        // Only add if belongs to current selected connection
        if (!selectedId || data.log.whatsappId === selectedId || !data.log.whatsappId) {
          setLogs((prev) => {
            const updated = [...prev, data.log];
            return updated.slice(-100); // keep last 100
          });
        }
        // Also refresh summary for updated counts
        setSummary((prev) => prev.map((c) => {
          if (c.whatsappId === data.log.whatsappId && data.log.type !== "ERROR") {
            return {
              ...c,
              warmup: c.warmup
                ? { ...c.warmup, messagesSentToday: (c.warmup.messagesSentToday || 0) + 1 }
                : c.warmup,
            };
          }
          return c;
        }));
      }
    };

    socket.on(event, handleWarmupLog);
    return () => {
      socket.off(event, handleWarmupLog);
    };
  }, [socket, user, selectedId]);

  // ── Toggle warmup on/off ──────────────────────────────────────────────────
  const handleToggle = useCallback(async (e, conn) => {
    e.stopPropagation();
    const id = conn.whatsappId;
    const newActive = !(conn.warmup && conn.warmup.isActive);
    setToggling((prev) => ({ ...prev, [id]: true }));
    try {
      await api.post(`/whatsapp-warmup/${id}`, { isActive: newActive });
      setSummary((prev) =>
        prev.map((c) =>
          c.whatsappId === id
            ? { ...c, warmup: { ...(c.warmup || {}), isActive: newActive } }
            : c
        )
      );
      if (selectedId === id) {
        setWarmupConfig((prev) => prev ? { ...prev, isActive: newActive } : prev);
      }
      toast.success(newActive ? "Aquecimento ativado!" : "Aquecimento desativado.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao alterar status do aquecimento.");
    } finally {
      setToggling((prev) => ({ ...prev, [id]: false }));
    }
  }, [selectedId]);

  // ── Summary computed stats ────────────────────────────────────────────────
  const computedStats = useMemo(() => {
    const total = summary.length;
    const aquecendo = summary.filter((c) => c.warmup && c.warmup.isActive).length;
    const hoje = summary.reduce((acc, c) => acc + (c.warmup ? c.warmup.messagesSentToday || 0 : 0), 0);
    const simuladas = summary.reduce((acc, c) => acc + (c.warmup ? c.warmup.simulatedMessages || 0 : 0), 0);
    return { total, aquecendo, hoje, simuladas };
  }, [summary]);

  // ── On detail refresh ─────────────────────────────────────────────────────
  const handleSaved = useCallback(() => {
    if (selectedId) {
      fetchDetail(selectedId);
      fetchStats(selectedId);
      fetchSummary();
    }
  }, [selectedId, fetchDetail, fetchStats, fetchSummary]);

  // ── Selected connection object ────────────────────────────────────────────
  const selectedConn = useMemo(
    () => summary.find((c) => c.whatsappId === selectedId) || null,
    [summary, selectedId]
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box className={classes.root}>
      {/* Header */}
      <Box className={classes.pageHeader}>
        <Typography className={classes.pageTitle}>🔥 Aquecimento WhatsApp</Typography>
        <Typography className={classes.pageSubtitle}>
          Mantenha seus chips saudáveis e com alta entregabilidade
        </Typography>
      </Box>

      {/* Summary cards */}
      <Box className={classes.summaryRow}>
        <StatCard
          icon={WhatsAppIcon}
          iconBg="rgba(37,211,102,0.2)"
          label="Total conexões"
          value={loadingSummary ? "..." : computedStats.total}
        />
        <StatCard
          icon={RouterIcon}
          iconBg="rgba(255,107,53,0.2)"
          label="Aquecendo"
          value={loadingSummary ? "..." : computedStats.aquecendo}
        />
        <StatCard
          icon={MessageIcon}
          iconBg="rgba(59,130,246,0.2)"
          label="Mensagens hoje"
          value={loadingSummary ? "..." : computedStats.hoje}
        />
        <StatCard
          icon={TrendingUpIcon}
          iconBg="rgba(168,85,247,0.2)"
          label="Total simuladas"
          value={loadingSummary ? "..." : computedStats.simuladas}
        />
      </Box>

      {/* Main layout */}
      <Box className={classes.mainLayout}>
        {/* Left: connection list */}
        <Box className={classes.leftPanel}>
          <Box className={classes.leftPanelHeader}>
            <Typography className={classes.leftPanelTitle}>
              Conexões ({summary.length})
            </Typography>
          </Box>

          {loadingSummary ? (
            <Box className={classes.loadingWrap}>
              <CircularProgress size={28} style={{ color: "#ff6b35" }} />
            </Box>
          ) : summary.length === 0 ? (
            <Box style={{ padding: "32px 20px", textAlign: "center", color: "#555", fontSize: "13px" }}>
              Nenhuma conexão WhatsApp encontrada.
            </Box>
          ) : (
            <Box className={classes.connectionList}>
              {summary.map((conn) => {
                const isSelected = conn.whatsappId === selectedId;
                const isActive = conn.warmup && conn.warmup.isActive;
                const healthScore = conn.warmup ? conn.warmup.healthScore : null;

                return (
                  <Box
                    key={conn.whatsappId}
                    className={`${classes.connectionItem} ${isSelected ? classes.connectionItemSelected : ""}`}
                    onClick={() => handleSelectConnection(conn.whatsappId)}
                  >
                    <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Typography className={classes.connectionName}>
                          {conn.name || `Chip ${conn.whatsappId}`}
                        </Typography>
                        {conn.number && (
                          <Typography className={classes.connectionNumber}>
                            {conn.number}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box className={classes.connectionMeta}>
                      <StatusBadge status={conn.connectionStatus} />
                      <HealthBadge score={healthScore} />
                    </Box>

                    <Box className={classes.connectionToggleRow}>
                      <Typography style={{ fontSize: "11px", color: "#666" }}>
                        {isActive ? "Aquecimento ativo" : "Aquecimento inativo"}
                      </Typography>
                      <Tooltip title={isActive ? "Desativar aquecimento" : "Ativar aquecimento"}>
                        <span>
                          <Switch
                            size="small"
                            checked={!!isActive}
                            onChange={(e) => handleToggle(e, conn)}
                            disabled={!!toggling[conn.whatsappId]}
                            color="primary"
                            style={{
                              "& .MuiSwitch-colorPrimary.Mui-checked": { color: "#ff6b35" },
                            }}
                          />
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Right: detail panel */}
        <Box className={classes.rightPanel}>
          {!selectedId ? (
            <Box className={classes.placeholderWrap}>
              <WhatsAppIcon className={classes.placeholderIcon} />
              <Typography className={classes.placeholderText}>
                Selecione uma conexão à esquerda para gerenciar o aquecimento
              </Typography>
            </Box>
          ) : loadingDetail ? (
            <Box className={classes.loadingWrap} style={{ height: "400px" }}>
              <CircularProgress size={36} style={{ color: "#ff6b35" }} />
            </Box>
          ) : (
            <Box>
              {/* Connection header */}
              {selectedConn && (
                <Box
                  style={{
                    padding: "16px 24px",
                    borderBottom: "1px solid #2a2a2a",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <WhatsAppIcon style={{ color: "#25d366", fontSize: "20px" }} />
                  <Box>
                    <Typography style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0f0" }}>
                      {selectedConn.name || `Chip ${selectedConn.whatsappId}`}
                    </Typography>
                    {selectedConn.number && (
                      <Typography style={{ fontSize: "12px", color: "#888" }}>
                        {selectedConn.number}
                      </Typography>
                    )}
                  </Box>
                  <Box style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                    <StatusBadge status={selectedConn.connectionStatus} />
                    <HealthBadge score={warmupConfig ? warmupConfig.healthScore : null} />
                  </Box>
                </Box>
              )}

              {/* Tabs */}
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                className={classes.tabsRoot}
              >
                <Tab label="Dashboard" className={classes.tabItem} />
                <Tab label="Configuração" className={classes.tabItem} />
                <Tab label="Scripts" className={classes.tabItem} />
              </Tabs>

              <Box className={classes.tabContent}>
                {activeTab === 0 && (
                  <DashboardTab
                    warmup={warmupConfig}
                    stats={stats}
                    logs={logs}
                    loadingStats={loadingStats}
                  />
                )}
                {activeTab === 1 && (
                  <ConfigTab
                    warmup={warmupConfig}
                    selectedId={selectedId}
                    onSaved={handleSaved}
                  />
                )}
                {activeTab === 2 && (
                  <ScriptsTab
                    warmup={warmupConfig}
                    selectedId={selectedId}
                    onSaved={handleSaved}
                  />
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
