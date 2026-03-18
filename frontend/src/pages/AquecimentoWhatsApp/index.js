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
  Checkbox,
  ListItemText,
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
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseCircleOutlineIcon from "@material-ui/icons/PauseCircleOutline";
import StopIcon from "@material-ui/icons/Stop";
import ScheduleIcon from "@material-ui/icons/Schedule";

import { useHistory } from "react-router-dom";
import SimCardIcon from "@mui/icons-material/SimCard";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
// eslint-disable-next-line no-unused-vars
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import { useSocket } from "../../context/SocketContext";

// ─── Styles ──────────────────────────────────────────────────────────────────

const useStyles = makeStyles(() => ({
  root: {
    minHeight: "calc(100vh - 96px)",
    background: "radial-gradient(circle at top left, #eef8f1 0%, #e2efe7 44%, #d9e7df 100%)",
    color: "#173624",
    padding: "16px",
    fontFamily: "'Inter', 'Roboto', sans-serif",
  },
  shell: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  pageHeader: {
    marginBottom: 0,
    borderRadius: "18px",
    border: "1px solid #cfe2d5",
    background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,252,249,0.96) 100%)",
    boxShadow: "0 14px 32px rgba(16, 24, 40, 0.08)",
    padding: "16px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  titleIcon: {
    width: "46px",
    height: "46px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #dcfce7 0%, #c7f0d6 100%)",
    color: "#137b42",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
  },
  titleContent: {
    minWidth: 0,
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  pageTitle: {
    fontSize: "1.65rem",
    fontWeight: 800,
    color: "#173624",
    lineHeight: 1.2,
  },
  pageSubtitle: {
    fontSize: "0.8rem",
    color: "#5d7d6b",
    marginTop: "4px",
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    marginBottom: 0,
  },
  statCard: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(245,251,247,0.98) 100%)",
    border: "1px solid #cfe2d5",
    borderRadius: "14px",
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    boxShadow: "0 10px 24px rgba(16,24,40,0.06), inset 0 1px 0 rgba(255,255,255,0.55)",
    transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s",
    "&:hover": {
      boxShadow: "0 16px 30px rgba(21,118,63,0.10)",
      borderColor: "#bed8c7",
      transform: "translateY(-2px)",
    },
  },
  statIconWrap: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
  },
  statLabel: {
    fontSize: "12px",
    color: "#5d7d6b",
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#173624",
    lineHeight: 1,
  },
  secondaryMetrics: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: 0,
  },
  subStatCard: {
    border: "1px solid #cfe2d5",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "14px 16px",
    boxShadow: "0 6px 18px rgba(16,24,40,0.05)",
  },
  mainLayout: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gap: "14px",
    alignItems: "stretch",
  },
  leftPanel: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(246,251,248,0.98) 100%)",
    border: "1px solid #cfe2d5",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 14px 28px rgba(16,24,40,0.07)",
  },
  leftPanelHeader: {
    padding: "16px 18px",
    borderBottom: "1px solid #e7f0ea",
    background: "linear-gradient(180deg, rgba(240,248,243,0.95) 0%, rgba(255,255,255,0.95) 100%)",
  },
  leftPanelTitle: {
    fontSize: "14px",
    fontWeight: 800,
    color: "#173624",
  },
  connectionList: {
    maxHeight: "calc(100vh - 280px)",
    overflowY: "auto",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "#F8FAFC",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#D1D5DB",
      borderRadius: "3px",
    },
  },
  connectionItem: {
    padding: "14px 18px",
    borderBottom: "1px solid #e7f0ea",
    cursor: "pointer",
    transition: "background 0.15s, box-shadow 0.15s, border-color 0.15s",
    "&:hover": {
      backgroundColor: "#f2f8f4",
    },
    "&:last-child": {
      borderBottom: "none",
    },
  },
  connectionItemSelected: {
    background: "linear-gradient(135deg, #ebf8ef 0%, #f7fcf9 100%)",
    borderLeft: "4px solid #22ab5d",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
  },
  connectionName: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#173624",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  connectionNumber: {
    fontSize: "12px",
    color: "#5d7d6b",
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
    padding: "3px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.3px",
    border: "1px solid rgba(0,0,0,0.04)",
  },
  connectionToggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "6px",
  },
  rightPanel: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,248,0.98) 100%)",
    border: "1px solid #cfe2d5",
    borderRadius: "16px",
    overflow: "hidden",
    minHeight: "400px",
    boxShadow: "0 18px 36px rgba(16,24,40,0.08)",
  },
  placeholderWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "400px",
    gap: "12px",
    color: "#6f897a",
  },
  placeholderIcon: {
    fontSize: "56px",
    color: "#c2d4c8",
  },
  placeholderText: {
    fontSize: "15px",
    color: "#6f897a",
    textAlign: "center",
  },
  detailHeader: {
    padding: "16px 22px",
    borderBottom: "1px solid #e7f0ea",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "linear-gradient(180deg, rgba(238,248,241,0.9) 0%, rgba(255,255,255,0.92) 100%)",
  },
  tabsShell: {
    padding: "8px 10px 0",
    borderBottom: "1px solid #e7f0ea",
    background: "rgba(255,255,255,0.5)",
  },
  tabsRoot: {
    "& .MuiTabs-indicator": {
      display: "none",
    },
  },
  tabItem: {
    color: "#486556",
    fontSize: "13px",
    fontWeight: 700,
    minWidth: "100px",
    textTransform: "none",
    minHeight: "42px",
    borderRadius: "10px 10px 0 0",
    marginRight: "8px",
    border: "1px solid #d7e5dc",
    borderBottom: "none",
    background: "#f6fbf8",
    "&.Mui-selected": {
      color: "#ffffff",
      background: "linear-gradient(135deg, #22ab5d 0%, #15763f 100%)",
      boxShadow: "0 8px 18px rgba(21,118,63,0.18)",
    },
  },
  tabContent: {
    padding: "24px",
    background: "linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(244,249,246,0.78) 100%)",
  },
  chartWrap: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #d8e6dd",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
    boxShadow: "0 8px 22px rgba(16,24,40,0.05)",
  },
  chartTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#5d7d6b",
    marginBottom: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  miniStatCard: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #d8e6dd",
    borderRadius: "12px",
    padding: "14px",
    boxShadow: "0 6px 16px rgba(16,24,40,0.05)",
  },
  miniStatLabel: {
    fontSize: "11px",
    color: "#6f897a",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "6px",
  },
  miniStatValue: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#173624",
  },
  miniStatSub: {
    fontSize: "11px",
    color: "#86a094",
    marginTop: "2px",
  },
  logFeedWrap: {
    backgroundColor: "#f6fbf8",
    border: "1px solid #d8e6dd",
    borderRadius: "12px",
    padding: "12px",
    maxHeight: "260px",
    overflowY: "auto",
    fontFamily: "'Fira Mono', 'Courier New', monospace",
    fontSize: "12px",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "#F8FAFC",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#E5E7EB",
      borderRadius: "3px",
    },
  },
  logLine: {
    display: "flex",
    gap: "10px",
    padding: "3px 0",
    borderBottom: "1px solid #E5E7EB",
    alignItems: "flex-start",
    "&:last-child": {
      borderBottom: "none",
    },
  },
  logTime: {
    color: "#9CA3AF",
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
    fontWeight: 700,
    color: "#486556",
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
    color: "#5d7d6b",
    marginBottom: "6px",
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  darkInput: {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#FFFFFF",
      borderRadius: "10px",
      color: "#173624",
      "& fieldset": {
        borderColor: "#d7e4dc",
      },
      "&:hover fieldset": {
        borderColor: "#bfd3c6",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#22ab5d",
      },
    },
    "& .MuiInputLabel-root": {
      color: "#7c9588",
      "&.Mui-focused": {
        color: "#22ab5d",
      },
    },
    "& .MuiSelect-root": {
      color: "#173624",
    },
    "& .MuiSelect-icon": {
      color: "#7c9588",
    },
    "& .MuiInputBase-input": {
      color: "#173624",
    },
  },
  darkSelect: {
    backgroundColor: "#FFFFFF",
    borderRadius: "10px",
    color: "#173624",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#d7e4dc",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#bfd3c6",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#22ab5d",
    },
    "& .MuiSelect-icon": {
      color: "#7c9588",
    },
  },
  rampUpBox: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #d8e6dd",
    borderRadius: "12px",
    padding: "16px",
    marginTop: "4px",
    boxShadow: "0 8px 18px rgba(16,24,40,0.04)",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #20a45a 0%, #157a43 100%)",
    color: "#fff",
    fontWeight: 700,
    borderRadius: "10px",
    padding: "8px 20px",
    textTransform: "none",
    boxShadow: "0 10px 22px rgba(21,122,67,0.18)",
    "&:hover": {
      background: "linear-gradient(135deg, #1b934f 0%, #126937 100%)",
    },
    "&:disabled": {
      backgroundColor: "#D1D5DB",
      color: "#9CA3AF",
      boxShadow: "none",
    },
  },
  secondaryBtn: {
    backgroundColor: "#f7fcf9",
    border: "1px solid #bfd7c7",
    color: "#1c5a35",
    fontWeight: 700,
    borderRadius: "10px",
    padding: "8px 20px",
    textTransform: "none",
    "&:hover": {
      backgroundColor: "#eef7f2",
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
    "&::-webkit-scrollbar-track": { background: "#FFFFFF" },
    "&::-webkit-scrollbar-thumb": { background: "#E5E7EB", borderRadius: "3px" },
  },
  scriptItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "8px 0",
    borderBottom: "1px solid #E5E7EB",
    "&:last-child": { borderBottom: "none" },
  },
  scriptText: {
    flex: 1,
    fontSize: "13px",
    color: "#4B5563",
    lineHeight: 1.5,
  },
  aiSection: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #d8e6dd",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
    boxShadow: "0 8px 18px rgba(16,24,40,0.04)",
  },
  aiSectionTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#15763f",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  previewScripts: {
    backgroundColor: "#f6fbf8",
    border: "1px solid #d8e6dd",
    borderRadius: "10px",
    padding: "12px",
    maxHeight: "200px",
    overflowY: "auto",
    marginTop: "12px",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": { background: "#F8FAFC" },
    "&::-webkit-scrollbar-thumb": { background: "#E5E7EB", borderRadius: "3px" },
  },
  previewScriptItem: {
    fontSize: "12px",
    color: "#6B7280",
    padding: "6px 0",
    borderBottom: "1px solid #E5E7EB",
    "&:last-child": { borderBottom: "none" },
  },
  addScriptRow: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
  },
  sectionDivider: {
    borderColor: "#E5E7EB",
    margin: "20px 0",
  },
  switchLabel: {
    "& .MuiFormControlLabel-label": {
      fontSize: "13px",
      color: "#4B5563",
    },
    "& .MuiSwitch-colorPrimary.Mui-checked": {
      color: "#22C55E",
    },
    "& .MuiSwitch-colorPrimary.Mui-checked + .MuiSwitch-track": {
      backgroundColor: "#22C55E",
    },
  },
  emptyLogs: {
    textAlign: "center",
    color: "#9CA3AF",
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
    backgroundColor: "#f6fbf8",
    border: "1px solid #d8e6dd",
    "& .MuiMenuItem-root": {
      color: "#173624",
      fontSize: "13px",
      "&:hover": { backgroundColor: "#eaf4ee" },
    },
  },
  // ── Responsive overrides ──────────────────────────────────────────────
  "@media (max-width: 1280px)": {
    summaryRow: {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
    secondaryMetrics: {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
    mainLayout: {
      gridTemplateColumns: "1fr",
    },
  },
  "@media (max-width: 960px)": {
    root: {
      padding: "16px",
    },
    summaryRow: {
      gridTemplateColumns: "1fr",
    },
    secondaryMetrics: {
      gridTemplateColumns: "1fr",
    },
    mainLayout: {
      gridTemplateColumns: "1fr",
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
  chipId: "",
  warmupMode: "private",
  messagesPerDay: 20,
  minInterval: 5,
  maxInterval: 15,
  startHour: "08:00",
  endHour: "22:00",
  dailyRampUp: false,
  rampUpStart: 5,
};

const SESSION_SCRIPT_MODES = [
  { value: "manual", label: "Script Manual" },
  { value: "standard", label: "Script Padrão" },
  { value: "random", label: "Script Aleatório" },
  { value: "ai", label: "Script com IA" },
  { value: "hybrid", label: "Script Híbrido" },
];

const SESSION_STATUS_COLORS = {
  draft: "#9ca3af",
  scheduled: "#f59e0b",
  running: "#22c55e",
  paused: "#fb7185",
  completed: "#3b82f6",
  failed: "#ef4444",
  canceled: "#6b7280",
};

const DEFAULT_SESSION_FORM = {
  name: "",
  connectionIds: [],
  starterWhatsappId: "",
  turns: 2,
  minIntervalSeconds: 6,
  maxIntervalSeconds: 15,
  scriptMode: "standard",
  scheduleAt: "",
  tema: "",
  tom: "profissional amigável",
  contexto: "",
  idioma: "pt-BR",
  quantidadeMensagens: 12,
  objetivo: "simular conversa natural",
  estiloConversa: "curta e objetiva",
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

function formatDateTime(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleString("pt-BR");
  } catch {
    return "—";
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
      <Box className={classes.statIconWrap} style={{ background: iconBg }}>
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
        <CircularProgress size={32} style={{ color: "#22C55E" }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: "8px", color: "#1F2937" }}
                labelStyle={{ color: "#6B7280" }}
                itemStyle={{ color: "#22C55E" }}
              />
              <Bar dataKey="Mensagens" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0", fontSize: "13px" }}>
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

function ConfigTab({ warmup, selectedId, onSaved, chips }) {
  const classes = useStyles();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const selectedChip = useMemo(
    () => (chips || []).find((chip) => Number(chip.id) === Number(form.chipId)) || null,
    [chips, form.chipId]
  );

  useEffect(() => {
    if (warmup) {
      setForm({
        chipId: warmup.chipId || warmup.chip?.id || "",
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
      <Box className={classes.formRowFull}>
        <FormControl variant="outlined" fullWidth className={classes.darkInput}>
          <InputLabel>Chip vinculado</InputLabel>
          <Select
            value={form.chipId}
            onChange={handleChange("chipId")}
            label="Chip vinculado"
            MenuProps={{ classes: { paper: classes.menuPaper } }}
          >
            <MenuItem value="">
              <em>Sem chip especifico</em>
            </MenuItem>
            {(chips || []).map((chip) => (
              <MenuItem key={chip.id} value={chip.id}>
                {chip.number} • {chip.carrier || "Operadora"} • Nivel {chip.warmupLevel}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedChip && (
          <Typography style={{ fontSize: "12px", color: "#5d7d6b", marginTop: "8px" }}>
            Limites herdados do chip: {selectedChip.warmupMessageLimit}/dia • intervalo {selectedChip.warmupMinInterval}-{selectedChip.warmupMaxInterval} min.
          </Typography>
        )}
      </Box>

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
          disabled={!!selectedChip}
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
          disabled={!!selectedChip}
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
          disabled={!!selectedChip}
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
                <Typography style={{ color: "#6B7280", fontSize: "13px" }}>
                  Dia atual de ramp-up:{" "}
                  <strong style={{ color: "#1F2937" }}>
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
        count: 20,
      });
      setPreviewScripts(data.scripts || []);
      const src = data.source === "openai" ? "OpenAI" : data.source === "gemini" ? "Google Gemini" : "templates locais";
      toast.info(`Scripts gerados via ${src}`);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 402) {
        toast.error("Créditos de IA insuficientes. Contate o administrador do sistema.");
      } else if (status === 429) {
        toast.error("Cota da API de IA esgotada. Tente novamente mais tarde.");
      } else if (status === 401) {
        toast.error("Chave de API de IA inválida. Verifique a configuração.");
      } else if (status === 503) {
        toast.error("Nenhuma chave de IA configurada. Contate o administrador.");
      } else if (status === 403) {
        toast.error("Seu plano não possui acesso ao módulo de IA.");
      } else {
        toast.error("Erro ao gerar scripts com IA.");
      }
      console.error(err);
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
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            color: "#9CA3AF",
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
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
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
            <Typography style={{ fontSize: "12px", color: "#6B7280", marginBottom: "6px" }}>
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

function SessionStatusBadge({ status }) {
  const classes = useStyles();
  const color = SESSION_STATUS_COLORS[status] || "#9ca3af";
  return (
    <Box className={classes.badge} style={{ backgroundColor: `${color}22`, color }}>
      {String(status || "draft").toUpperCase()}
    </Box>
  );
}

function WarmupSessionBuilder({
  connections,
  sessions,
  onRefreshSessions,
  onRefreshMetrics,
  onSelectSession,
}) {
  const classes = useStyles();
  const [form, setForm] = useState(DEFAULT_SESSION_FORM);
  const [saving, setSaving] = useState(false);
  const [manualSteps, setManualSteps] = useState([]);
  const [draftStep, setDraftStep] = useState({ type: "send", fromWhatsappId: "", toWhatsappId: "", message: "", seconds: 8 });
  const [generatingSteps, setGeneratingSteps] = useState(false);

  useEffect(() => {
    if (!form.starterWhatsappId && form.connectionIds.length) {
      setForm(prev => ({ ...prev, starterWhatsappId: form.connectionIds[0] }));
    }
  }, [form.connectionIds, form.starterWhatsappId]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleAddStep = () => {
    if (draftStep.type === "wait") {
      setManualSteps(prev => [...prev, { type: "wait", seconds: Number(draftStep.seconds) || 8 }]);
      return;
    }
    if (!draftStep.fromWhatsappId || !draftStep.toWhatsappId || !String(draftStep.message || "").trim()) {
      toast.warning("Preencha remetente, destinatário e mensagem.");
      return;
    }
    setManualSteps(prev => [
      ...prev,
      {
        type: "send",
        fromWhatsappId: Number(draftStep.fromWhatsappId),
        toWhatsappId: Number(draftStep.toWhatsappId),
        message: String(draftStep.message || "").trim(),
      },
    ]);
    setDraftStep(prev => ({ ...prev, message: "" }));
  };

  const handleGenerateScript = async () => {
    if (form.connectionIds.length < 2) {
      toast.warning("Selecione pelo menos 2 conexões para gerar script.");
      return;
    }
    setGeneratingSteps(true);
    try {
      const { data } = await api.post("/whatsapp-warmup/generate-script", {
        mode: form.scriptMode,
        connectionIds: form.connectionIds,
        starterWhatsappId: form.starterWhatsappId,
        turns: form.turns,
        minIntervalSeconds: form.minIntervalSeconds,
        maxIntervalSeconds: form.maxIntervalSeconds,
        aiConfig: {
          tema: form.tema,
          tom: form.tom,
          contexto: form.contexto,
          idioma: form.idioma,
          quantidadeMensagens: form.quantidadeMensagens,
          objetivo: form.objetivo,
          estiloConversa: form.estiloConversa,
        },
      });
      if (Array.isArray(data.steps)) {
        setManualSteps(data.steps);
      }
      toast.success("Script gerado com sucesso.");
    } catch (error) {
      const status = error?.response?.status;
      if (status === 402) {
        toast.error("Créditos de IA insuficientes. Contate o administrador do sistema.");
      } else if (status === 429) {
        toast.error("Cota da API de IA esgotada. Tente novamente mais tarde.");
      } else if (status === 401) {
        toast.error("Chave de API de IA inválida. Verifique a configuração.");
      } else if (status === 503) {
        toast.error("Nenhuma chave de IA configurada. Contate o administrador.");
      } else if (status === 403) {
        toast.error("Seu plano não possui acesso ao módulo de IA.");
      } else {
        toast.error("Erro ao gerar script.");
      }
      console.error(error);
    } finally {
      setGeneratingSteps(false);
    }
  };

  const handleCreateSession = async (autoStart = false) => {
    if (form.connectionIds.length < 2) {
      toast.warning("Selecione pelo menos 2 conexões.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name || `Sessão ${new Date().toLocaleString("pt-BR")}`,
        connectionIds: form.connectionIds,
        starterWhatsappId: form.starterWhatsappId,
        turns: Number(form.turns) || 2,
        minIntervalSeconds: Number(form.minIntervalSeconds) || 6,
        maxIntervalSeconds: Number(form.maxIntervalSeconds) || 15,
        scriptMode: form.scriptMode,
        scheduleAt: form.scheduleAt ? new Date(form.scheduleAt).toISOString() : null,
        scriptSteps: manualSteps,
        aiConfig: {
          tema: form.tema,
          tom: form.tom,
          contexto: form.contexto,
          idioma: form.idioma,
          quantidadeMensagens: Number(form.quantidadeMensagens) || 12,
          objetivo: form.objetivo,
          estiloConversa: form.estiloConversa,
        },
        autoStart,
      };
      const { data } = await api.post("/whatsapp-warmup/sessions", payload);
      toast.success(form.scheduleAt ? "Sessão agendada com sucesso." : "Sessão criada com sucesso.");
      if (data?.id) onSelectSession(data.id);
      setForm(DEFAULT_SESSION_FORM);
      setManualSteps([]);
      onRefreshSessions();
      onRefreshMetrics();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar sessão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box style={{ marginTop: 24, background: "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(246,251,248,0.98) 100%)", border: "1px solid #cfe2d5", borderRadius: 16, padding: 20, boxShadow: "0 14px 28px rgba(16,24,40,0.07)" }}>
      <Typography style={{ fontSize: 16, fontWeight: 800, color: "#173624", marginBottom: 12 }}>
        Sessões de Aquecimento
      </Typography>
      <Typography style={{ color: "#6f897a", fontSize: 13, marginBottom: 18 }}>
        Configure sessões entre conexões, com script por etapas, modo de script, agendamento e controles de execução.
      </Typography>

      <Box style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        <TextField
          label="Nome da sessão"
          variant="outlined"
          value={form.name}
          onChange={handleChange("name")}
          className={classes.darkInput}
          fullWidth
        />

        <FormControl variant="outlined" className={classes.darkInput} fullWidth>
          <InputLabel>Conexões</InputLabel>
          <Select
            multiple
            value={form.connectionIds}
            onChange={handleChange("connectionIds")}
            label="Conexões"
            renderValue={(selected) => `${selected.length} selecionadas`}
            MenuProps={{ classes: { paper: classes.menuPaper } }}
          >
            {connections.map((conn) => (
              <MenuItem key={conn.whatsappId} value={conn.whatsappId}>
                <Checkbox checked={form.connectionIds.includes(conn.whatsappId)} color="primary" />
                <ListItemText primary={`${conn.name || `Chip ${conn.whatsappId}`} (${conn.number || "sem número"})`} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl variant="outlined" className={classes.darkInput} fullWidth>
          <InputLabel>Quem inicia</InputLabel>
          <Select
            value={form.starterWhatsappId}
            onChange={handleChange("starterWhatsappId")}
            label="Quem inicia"
            MenuProps={{ classes: { paper: classes.menuPaper } }}
          >
            {form.connectionIds.map((id) => {
              const conn = connections.find(c => c.whatsappId === id);
              return (
                <MenuItem key={id} value={id}>
                  {conn ? `${conn.name || `Chip ${id}`} (${conn.number || ""})` : `Conexão #${id}`}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <TextField label="Turnos" type="number" variant="outlined" className={classes.darkInput} value={form.turns} onChange={handleChange("turns")} fullWidth />
        <TextField label="Intervalo mínimo (s)" type="number" variant="outlined" className={classes.darkInput} value={form.minIntervalSeconds} onChange={handleChange("minIntervalSeconds")} fullWidth />
        <TextField label="Intervalo máximo (s)" type="number" variant="outlined" className={classes.darkInput} value={form.maxIntervalSeconds} onChange={handleChange("maxIntervalSeconds")} fullWidth />

        <FormControl variant="outlined" className={classes.darkInput} fullWidth>
          <InputLabel>Modo de script</InputLabel>
          <Select
            value={form.scriptMode}
            onChange={handleChange("scriptMode")}
            label="Modo de script"
            MenuProps={{ classes: { paper: classes.menuPaper } }}
          >
            {SESSION_SCRIPT_MODES.map((mode) => (
              <MenuItem key={mode.value} value={mode.value}>{mode.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Agendar para"
          type="datetime-local"
          variant="outlined"
          className={classes.darkInput}
          value={form.scheduleAt}
          onChange={handleChange("scheduleAt")}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Box>

      <Box style={{ marginTop: 14, borderTop: "1px solid #e5efe8", paddingTop: 14 }}>
        <Typography style={{ fontSize: 13, color: "#6f897a", marginBottom: 8, fontWeight: 700 }}>
          Gerador com IA
        </Typography>
        <Box style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <TextField label="Tema" variant="outlined" className={classes.darkInput} value={form.tema} onChange={handleChange("tema")} fullWidth />
          <TextField label="Tom" variant="outlined" className={classes.darkInput} value={form.tom} onChange={handleChange("tom")} fullWidth />
          <TextField label="Contexto" variant="outlined" className={classes.darkInput} value={form.contexto} onChange={handleChange("contexto")} fullWidth />
          <TextField label="Idioma" variant="outlined" className={classes.darkInput} value={form.idioma} onChange={handleChange("idioma")} fullWidth />
          <TextField label="Quantidade de mensagens" type="number" variant="outlined" className={classes.darkInput} value={form.quantidadeMensagens} onChange={handleChange("quantidadeMensagens")} fullWidth />
          <TextField label="Objetivo" variant="outlined" className={classes.darkInput} value={form.objetivo} onChange={handleChange("objetivo")} fullWidth />
          <TextField label="Estilo da conversa" variant="outlined" className={classes.darkInput} value={form.estiloConversa} onChange={handleChange("estiloConversa")} fullWidth />
        </Box>
      </Box>

      <Box style={{ marginTop: 16, borderTop: "1px solid #e5efe8", paddingTop: 14 }}>
        <Typography style={{ fontSize: 13, color: "#6f897a", marginBottom: 8, fontWeight: 700 }}>
          Editor de script por etapas
        </Typography>
        <Box style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr 2fr 160px", gap: 8, alignItems: "center" }}>
          <FormControl variant="outlined" className={classes.darkInput} fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select value={draftStep.type} onChange={(e) => setDraftStep(prev => ({ ...prev, type: e.target.value }))} label="Tipo">
              <MenuItem value="send">Conexão envia</MenuItem>
              <MenuItem value="wait">Aguardar</MenuItem>
            </Select>
          </FormControl>
          <FormControl variant="outlined" className={classes.darkInput} fullWidth disabled={draftStep.type === "wait"}>
            <InputLabel>De</InputLabel>
            <Select value={draftStep.fromWhatsappId} onChange={(e) => setDraftStep(prev => ({ ...prev, fromWhatsappId: e.target.value }))} label="De">
              {form.connectionIds.map((id) => <MenuItem key={`from-${id}`} value={id}>Conexão #{id}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl variant="outlined" className={classes.darkInput} fullWidth disabled={draftStep.type === "wait"}>
            <InputLabel>Para</InputLabel>
            <Select value={draftStep.toWhatsappId} onChange={(e) => setDraftStep(prev => ({ ...prev, toWhatsappId: e.target.value }))} label="Para">
              {form.connectionIds.map((id) => <MenuItem key={`to-${id}`} value={id}>Conexão #{id}</MenuItem>)}
            </Select>
          </FormControl>
          {draftStep.type === "wait" ? (
            <TextField label="Segundos" type="number" variant="outlined" className={classes.darkInput} value={draftStep.seconds} onChange={(e) => setDraftStep(prev => ({ ...prev, seconds: e.target.value }))} fullWidth />
          ) : (
            <TextField label="Mensagem" variant="outlined" className={classes.darkInput} value={draftStep.message} onChange={(e) => setDraftStep(prev => ({ ...prev, message: e.target.value }))} fullWidth />
          )}
          <Button className={classes.secondaryBtn} onClick={handleAddStep} startIcon={<AddIcon />}>Adicionar</Button>
        </Box>

        <Box style={{ marginTop: 10, background: "#ffffff", border: "1px solid #d8e6dd", borderRadius: 10, maxHeight: 220, overflowY: "auto", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)" }}>
          {manualSteps.length === 0 ? (
            <Typography style={{ color: "#7c9588", fontSize: 12, padding: 12 }}>Nenhuma etapa adicionada.</Typography>
          ) : manualSteps.map((step, idx) => (
            <Box key={`step-${idx}`} style={{ padding: "8px 12px", borderBottom: "1px solid #edf4ef", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography style={{ color: "#355946", fontSize: 12 }}>
                {step.type === "wait"
                  ? `${idx + 1}. Aguardar ${step.seconds}s`
                  : `${idx + 1}. #${step.fromWhatsappId} envia para #${step.toWhatsappId}: ${step.message}`}
              </Typography>
              <IconButton size="small" onClick={() => setManualSteps(prev => prev.filter((_, i) => i !== idx))}>
                <DeleteIcon fontSize="small" style={{ color: "#f87171" }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      </Box>

      <Box style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
        <Button className={classes.secondaryBtn} onClick={handleGenerateScript} startIcon={<AutorenewIcon />} disabled={generatingSteps}>
          {generatingSteps ? "Gerando..." : "Gerar script por modo"}
        </Button>
        <Box style={{ display: "flex", gap: 8 }}>
          <Button className={classes.secondaryBtn} startIcon={<ScheduleIcon />} onClick={() => handleCreateSession(false)} disabled={saving}>
            {form.scheduleAt ? "Salvar agendamento" : "Salvar sessão"}
          </Button>
          <Button className={classes.primaryBtn} startIcon={<PlayArrowIcon />} onClick={() => handleCreateSession(true)} disabled={saving || !!form.scheduleAt}>
            Iniciar agora
          </Button>
        </Box>
      </Box>

      <Typography style={{ marginTop: 14, color: "#5d7d6b", fontSize: 12 }}>
        Sessões criadas: {sessions.length}
      </Typography>
    </Box>
  );
}

function WarmupSessionsHistory({ sessions, selectedSessionId, onSelectSession, onRefreshSessions, onRefreshMetrics, sessionLogs }) {
  const classes = useStyles();
  const [actionLoading, setActionLoading] = useState({});

  const doAction = async (sessionId, action) => {
    setActionLoading(prev => ({ ...prev, [`${sessionId}-${action}`]: true }));
    try {
      await api.post(`/whatsapp-warmup/sessions/${sessionId}/${action}`);
      toast.success("Ação executada com sucesso.");
      onRefreshSessions();
      onRefreshMetrics();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao executar ação da sessão.");
    } finally {
      setActionLoading(prev => ({ ...prev, [`${sessionId}-${action}`]: false }));
    }
  };

  return (
    <Box style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
      <Box style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(246,251,248,0.98) 100%)", border: "1px solid #cfe2d5", borderRadius: 16, overflow: "hidden", boxShadow: "0 14px 28px rgba(16,24,40,0.07)" }}>
        <Box style={{ padding: "14px 16px", borderBottom: "1px solid #e5efe8", background: "linear-gradient(180deg, rgba(240,248,243,0.95) 0%, rgba(255,255,255,0.95) 100%)" }}>
          <Typography style={{ color: "#1F2937", fontWeight: 700, fontSize: 14 }}>Sessões criadas</Typography>
        </Box>
        <Box style={{ maxHeight: 360, overflowY: "auto" }}>
          {sessions.length === 0 ? (
            <Typography style={{ color: "#9CA3AF", fontSize: 12, padding: 14 }}>Nenhuma sessão cadastrada.</Typography>
          ) : sessions.map((session) => (
            <Box
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              style={{
                padding: 12,
                borderBottom: "1px solid #E5E7EB",
                cursor: "pointer",
                background: selectedSessionId === session.id ? "#DCFCE7" : "transparent",
              }}
            >
              <Box style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <Typography style={{ color: "#1F2937", fontSize: 13, fontWeight: 600 }}>
                  {session.name || `Sessão #${session.id}`}
                </Typography>
                <SessionStatusBadge status={session.status} />
              </Box>
              <Typography style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                Modo: {session.scriptMode} • Turnos: {session.turns} • Msgs: {session.messagesSent || 0}
              </Typography>
              <Typography style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>
                Agendada: {formatDateTime(session.scheduledAt)}
              </Typography>

              <Box style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Button size="small" className={classes.secondaryBtn} startIcon={<PlayArrowIcon />} disabled={!!actionLoading[`${session.id}-start`]} onClick={(e) => { e.stopPropagation(); doAction(session.id, "start"); }}>
                  Iniciar
                </Button>
                <Button size="small" className={classes.secondaryBtn} startIcon={<PauseCircleOutlineIcon />} disabled={!!actionLoading[`${session.id}-pause`]} onClick={(e) => { e.stopPropagation(); doAction(session.id, "pause"); }}>
                  Pausar
                </Button>
                <Button size="small" className={classes.secondaryBtn} startIcon={<AutorenewIcon />} disabled={!!actionLoading[`${session.id}-resume`]} onClick={(e) => { e.stopPropagation(); doAction(session.id, "resume"); }}>
                  Retomar
                </Button>
                <Button size="small" className={classes.secondaryBtn} startIcon={<StopIcon />} disabled={!!actionLoading[`${session.id}-stop`]} onClick={(e) => { e.stopPropagation(); doAction(session.id, "stop"); }}>
                  Encerrar
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        <Box style={{ padding: "14px 16px", borderBottom: "1px solid #E5E7EB" }}>
          <Typography style={{ color: "#1F2937", fontWeight: 700, fontSize: 14 }}>
            Histórico da sessão {selectedSessionId ? `#${selectedSessionId}` : ""}
          </Typography>
        </Box>
        <Box style={{ maxHeight: 360, overflowY: "auto", padding: 10 }}>
          {!selectedSessionId ? (
            <Typography style={{ color: "#9CA3AF", fontSize: 12 }}>Selecione uma sessão para ver os logs.</Typography>
          ) : sessionLogs.length === 0 ? (
            <Typography style={{ color: "#9CA3AF", fontSize: 12 }}>Sem logs para esta sessão.</Typography>
          ) : sessionLogs.map((log) => (
            <Box key={log.id} style={{ borderBottom: "1px solid #E5E7EB", padding: "8px 2px" }}>
              <Typography style={{ color: "#22C55E", fontSize: 11 }}>{formatDateTime(log.createdAt)}</Typography>
              <Typography style={{ color: "#4B5563", fontSize: 12 }}>
                [{log.type}] {log.message}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default function AquecimentoWhatsApp() {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const history = useHistory();

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
  const [sessions, setSessions] = useState([]);
  const [sessionMetrics, setSessionMetrics] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [chips, setChips] = useState([]);

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

  const fetchChips = useCallback(async () => {
    try {
      const { data } = await api.get("/chips");
      setChips(Array.isArray(data) ? data : []);
    } catch (error) {
      setChips([]);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await api.get("/whatsapp-warmup/sessions?limit=100");
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar sessões:", error);
      setSessions([]);
    }
  }, []);

  const fetchSessionMetrics = useCallback(async () => {
    try {
      const { data } = await api.get("/whatsapp-warmup/metrics");
      setSessionMetrics(data || null);
    } catch (error) {
      console.error("Erro ao carregar métricas do módulo:", error);
      setSessionMetrics(null);
    }
  }, []);

  const fetchSessionLogs = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      const { data } = await api.get(`/whatsapp-warmup/sessions/${sessionId}/logs?limit=300`);
      setSessionLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar logs da sessão:", error);
      setSessionLogs([]);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchSessionMetrics();
    fetchChips();
  }, [fetchSessions, fetchSessionMetrics, fetchChips]);

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
    const sessionEvent = `company-${user.companyId}-warmup-session`;

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
    socket.on(sessionEvent, () => {
      fetchSessions();
      fetchSessionMetrics();
      if (selectedSessionId) {
        fetchSessionLogs(selectedSessionId);
      }
    });
    return () => {
      socket.off(event, handleWarmupLog);
      socket.off(sessionEvent);
    };
  }, [socket, user, selectedId, fetchSessions, fetchSessionMetrics, selectedSessionId, fetchSessionLogs]);

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

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionLogs(selectedSessionId);
    } else {
      setSessionLogs([]);
    }
  }, [selectedSessionId, fetchSessionLogs]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box className={classes.root}>
      <Box className={classes.shell}>
        <Box className={classes.pageHeader}>
          <Box className={classes.titleRow}>
            <Box className={classes.titleIcon}>
              <WhatsAppIcon style={{ fontSize: 24 }} />
            </Box>
            <Box className={classes.titleContent}>
              <Typography className={classes.pageTitle}>Aquecimento WhatsApp</Typography>
              <Typography className={classes.pageSubtitle}>
                Mantenha seus chips saudáveis, com leitura visual clara e operação mais segura.
              </Typography>
            </Box>
          </Box>
          <Box className={classes.headerActions}>
          <Button
            className={classes.secondaryBtn}
            startIcon={<SimCardIcon />}
            onClick={() => history.push("/chips")}
          >
            Gerenciar Chips
          </Button>
          <Button
            className={classes.secondaryBtn}
            startIcon={<AutorenewIcon />}
            onClick={fetchSummary}
            disabled={loadingSummary}
          >
            Sincronizar
          </Button>
          <Button
            className={classes.primaryBtn}
            startIcon={<PlayArrowIcon />}
            onClick={() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }}
          >
            Criar Sessão
          </Button>
          </Box>
        </Box>

        <Box className={classes.summaryRow}>
          <StatCard
            icon={WhatsAppIcon}
            iconBg="linear-gradient(135deg, #44d67f 0%, #1ba451 100%)"
            label="Total conexões"
            value={loadingSummary ? "..." : computedStats.total}
          />
          <StatCard
            icon={RouterIcon}
            iconBg="linear-gradient(135deg, #52c77d 0%, #238c53 100%)"
            label="Aquecendo"
            value={loadingSummary ? "..." : computedStats.aquecendo}
          />
          <StatCard
            icon={MessageIcon}
            iconBg="linear-gradient(135deg, #76aefc 0%, #3b82f6 100%)"
            label="Mensagens hoje"
            value={loadingSummary ? "..." : computedStats.hoje}
          />
          <StatCard
            icon={TrendingUpIcon}
            iconBg="linear-gradient(135deg, #d2b4ff 0%, #9a67ea 100%)"
            label="Total simuladas"
            value={loadingSummary ? "..." : computedStats.simuladas}
          />
        </Box>

        <Box className={classes.secondaryMetrics}>
          <Box className={classes.subStatCard}><Typography className={classes.statLabel}>Sessões executadas</Typography><Typography className={classes.statValue}>{sessionMetrics?.sessionsExecuted || 0}</Typography></Box>
          <Box className={classes.subStatCard}><Typography className={classes.statLabel}>Sessões com falha</Typography><Typography className={classes.statValue}>{sessionMetrics?.sessionsFailed || 0}</Typography></Box>
          <Box className={classes.subStatCard}><Typography className={classes.statLabel}>Média msg/sessão</Typography><Typography className={classes.statValue}>{sessionMetrics?.avgMessagesPerSession || 0}</Typography></Box>
          <Box className={classes.subStatCard}><Typography className={classes.statLabel}>Conexões aquecendo</Typography><Typography className={classes.statValue}>{sessionMetrics?.activeWarmingConnections || 0}</Typography></Box>
        </Box>

        <Box className={classes.mainLayout}>
          <Box className={classes.leftPanel}>
          <Box className={classes.leftPanelHeader}>
            <Typography className={classes.leftPanelTitle}>
              Conexões ({summary.length})
            </Typography>
          </Box>

          {loadingSummary ? (
            <Box className={classes.loadingWrap}>
              <CircularProgress size={28} style={{ color: "#15763f" }} />
            </Box>
          ) : summary.length === 0 ? (
            <Box style={{ padding: "32px 20px", textAlign: "center", color: "#6f897a", fontSize: "13px" }}>
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
                      <Typography style={{ fontSize: "11px", color: "#6f897a", fontWeight: 600 }}>
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

          <Box className={classes.rightPanel}>
          {!selectedId ? (
            <Box className={classes.placeholderWrap} style={{ background: "linear-gradient(180deg, #f2f8f4 0%, #fbfdfb 100%)", border: "1px dashed #c5d8cc", margin: "24px", borderRadius: "14px", height: "calc(100% - 48px)" }}>
              <WhatsAppIcon style={{ fontSize: "64px", color: "#c2d4c8", marginBottom: "16px" }} />
              <Typography style={{ fontSize: "16px", fontWeight: 700, color: "#587565" }}>
                Nenhuma conexão selecionada
              </Typography>
              <Typography style={{ fontSize: "14px", color: "#6f897a", textAlign: "center", padding: "0 20px" }}>
                Selecione uma conexão à esquerda para gerenciar o aquecimento e acompanhar as estatísticas.
              </Typography>
            </Box>
          ) : loadingDetail ? (
            <Box className={classes.loadingWrap} style={{ height: "400px" }}>
              <CircularProgress size={36} style={{ color: "#15763f" }} />
            </Box>
          ) : (
            <Box>
              {selectedConn && (
                <Box className={classes.detailHeader}>
                  <WhatsAppIcon style={{ color: "#25d366", fontSize: "20px" }} />
                  <Box>
                    <Typography style={{ fontSize: "15px", fontWeight: 700, color: "#173624" }}>
                      {selectedConn.name || `Chip ${selectedConn.whatsappId}`}
                    </Typography>
                    {selectedConn.number && (
                      <Typography style={{ fontSize: "12px", color: "#5d7d6b" }}>
                        {selectedConn.number}
                      </Typography>
                    )}
                  </Box>
                  <Box style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <StatusBadge status={selectedConn.connectionStatus} />
                    <HealthBadge score={warmupConfig ? warmupConfig.healthScore : null} />
                  </Box>
                </Box>
              )}

              <Box className={classes.tabsShell}>
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                  className={classes.tabsRoot}
                >
                  <Tab label="Dashboard" className={classes.tabItem} />
                  <Tab label="Configuração" className={classes.tabItem} />
                  <Tab label="Scripts" className={classes.tabItem} />
                </Tabs>
              </Box>

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
                    chips={chips.filter(chip => !chip.whatsappId || Number(chip.whatsappId) === Number(selectedId))}
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

      <WarmupSessionBuilder
        connections={summary}
        sessions={sessions}
        onRefreshSessions={fetchSessions}
        onRefreshMetrics={fetchSessionMetrics}
        onSelectSession={setSelectedSessionId}
      />

      <WarmupSessionsHistory
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSelectSession={setSelectedSessionId}
        onRefreshSessions={fetchSessions}
        onRefreshMetrics={fetchSessionMetrics}
        sessionLogs={sessionLogs}
      />
      </Box>
    </Box>
  );
}
