import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  makeStyles,
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Grid,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  LinearProgress
} from "@material-ui/core";
import GroupIcon from "@material-ui/icons/Group";
import SearchIcon from "@material-ui/icons/Search";
import RefreshIcon from "@material-ui/icons/Refresh";
import SendIcon from "@material-ui/icons/Send";
import AddIcon from "@material-ui/icons/Add";
import GroupAddIcon from "@material-ui/icons/GroupAdd";
import DescriptionIcon from "@material-ui/icons/Description";
import PhotoCameraIcon from "@material-ui/icons/PhotoCamera";
import GetAppIcon from "@material-ui/icons/GetApp";
import StarIcon from "@material-ui/icons/Star";
import StarBorderIcon from "@material-ui/icons/StarBorder";
import FilterListIcon from "@material-ui/icons/FilterList";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import PersonIcon from "@material-ui/icons/Person";
import ArrowForwardIcon from "@material-ui/icons/ArrowForward";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import { toast } from "react-toastify";

import api from "../../services/api";
import { useSocket } from "../../context/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";

const TABS = [
  "Dashboard",
  "Grupos",
  "Campanhas",
  "Agendamentos",
  "Templates",
  "Historico",
  "Relatorios"
];

const TAB_META = [
  {
    title: "Resumo executivo da operacao",
    description:
      "Leitura rapida do volume, campanhas e sincronizacao para orientar a operacao."
  },
  {
    title: "Workspace de grupos",
    description:
      "Lista, contexto e acoes lado a lado para manter leitura clara e resposta rapida."
  },
  {
    title: "Campanhas de grupos",
    description:
      "Monte disparos, acompanhe logs e mantenha o controle dos envios em um unico fluxo."
  },
  {
    title: "Agendamentos de grupos",
    description:
      "Visualize os disparos programados sem sair da experiencia principal da operacao."
  },
  {
    title: "Templates operacionais",
    description:
      "Guarde modelos reutilizaveis para reduzir retrabalho e acelerar campanhas."
  },
  {
    title: "Historico da operacao",
    description:
      "Acompanhe registros recentes para entender o que aconteceu e agir com contexto."
  },
  {
    title: "Relatorios de desempenho",
    description:
      "Consolide resultados, falhas e volume de execucao em uma visao mais limpa."
  }
];

const initialCampaign = {
  name: "",
  whatsappId: "",
  templateId: "",
  message: "",
  mentionsMode: "none",
  messageType: "text",
  recurrenceRule: "none",
  intervalSeconds: 3,
  scheduledAt: "",
  scheduleMode: "now",
  mediaContent: null,
  groupIds: []
};

const initialTemplate = {
  name: "",
  messageType: "text",
  message: "",
  mediaContent: null
};

const safeNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateTime = value => {
  if (!value) return "Sem agenda";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem agenda";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const statusBg = status =>
  ({
    DRAFT: "#64748b",
    SCHEDULED: "#f59e0b",
    PROCESSING: "#0ea5e9",
    PAUSED: "#8b5cf6",
    SENT: "#16a34a",
    FAILED: "#dc2626",
    CANCELED: "#6b7280"
  }[String(status || "").toUpperCase()] || "#64748b");

const roleTone = participant => {
  if (participant?.isSuperAdmin) {
    return { label: "Super admin", bg: "#ede9fe", color: "#6d28d9" };
  }

  if (participant?.isAdmin) {
    return { label: "Admin", bg: "#dcfce7", color: "#047857" };
  }

  return { label: "Membro", bg: "#e2e8f0", color: "#475569" };
};

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "calc(100vh - 112px)",
    padding: theme.spacing(2.5),
    gap: theme.spacing(2),
    background:
      "radial-gradient(circle at top left, rgba(37,99,235,0.12), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #eef7f2 100%)",
    overflowY: "auto",
    overflowX: "hidden",
    ...theme.scrollbarStyles,
    [theme.breakpoints.down("sm")]: {
      minHeight: "calc(100vh - 64px - 70px)",
      padding: theme.spacing(2)
    }
  },
  overviewShell: {
    position: "relative",
    padding: theme.spacing(2.75),
    borderRadius: 30,
    background:
      "linear-gradient(135deg, #172554 0%, #1e3a8a 46%, #1d4ed8 100%)",
    boxShadow: "0 28px 70px rgba(15, 23, 42, 0.2)",
    overflow: "hidden",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2)
    },
    "&:before": {
      content: '""',
      position: "absolute",
      inset: "auto auto -130px -120px",
      width: 320,
      height: 320,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.08)"
    },
    "&:after": {
      content: '""',
      position: "absolute",
      inset: "20px -70px auto auto",
      width: 240,
      height: 240,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.06)"
    }
  },
  overviewTop: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns:
      "minmax(300px, 0.95fr) minmax(320px, 1.08fr) minmax(260px, 0.8fr)",
    gridTemplateAreas: '"hero connections summary"',
    gap: theme.spacing(2),
    alignItems: "stretch",
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 0.9fr)",
      gridTemplateAreas: '"hero summary" "connections connections"'
    },
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
      gridTemplateAreas: '"hero" "connections" "summary"'
    }
  },
  heroPane: {
    gridArea: "hero",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
    minWidth: 0,
    padding: theme.spacing(2),
    borderRadius: 26,
    background:
      "linear-gradient(180deg, rgba(59,130,246,0.12) 0%, rgba(16,185,129,0.16) 100%)",
    border: "1px solid rgba(191,219,254,0.18)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)"
  },
  pageBadge: {
    alignSelf: "flex-start",
    background: "rgba(255,255,255,0.14)",
    color: "#eff6ff",
    border: "1px solid rgba(255,255,255,0.16)",
    fontWeight: 700,
    letterSpacing: 0.3
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 1.02,
    letterSpacing: "-0.04em",
    fontWeight: 800,
    color: "#ffffff",
    maxWidth: 520,
    [theme.breakpoints.down("md")]: {
      fontSize: 30
    },
    [theme.breakpoints.down("sm")]: {
      fontSize: 26
    }
  },
  heroSubtitle: {
    maxWidth: 500,
    color: "rgba(219, 234, 254, 0.92)",
    fontSize: 13,
    lineHeight: 1.5
  },
  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1.25)
  },
  primaryAction: {
    borderRadius: 14,
    padding: theme.spacing(1.1, 2),
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "#020617",
    boxShadow: "0 16px 28px rgba(2, 6, 23, 0.38)",
    textTransform: "none",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    "& .MuiButton-label": {
      fontWeight: 700
    },
    "&:hover": {
      background: "#020617",
      transform: "translateY(-2px)",
      boxShadow: "0 22px 34px rgba(2, 6, 23, 0.46)"
    }
  },
  secondaryAction: {
    borderRadius: 14,
    padding: theme.spacing(1, 1.8),
    color: "#fff",
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
    textTransform: "none",
    "& .MuiButton-label": {
      fontWeight: 700
    },
    "&:hover": {
      borderColor: "rgba(255,255,255,0.32)",
      backgroundColor: "rgba(255,255,255,0.12)"
    }
  },
  heroSupportRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75)
  },
  heroSupportChip: {
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    color: "#dbeafe",
    border: "1px solid rgba(255,255,255,0.12)",
    fontWeight: 700
  },
  connectionPanel: {
    gridArea: "connections",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    padding: theme.spacing(1.75),
    borderRadius: 28,
    background:
      "linear-gradient(180deg, rgba(37,99,235,0.26) 0%, rgba(15,23,42,0.34) 100%)",
    border: "1px solid rgba(191,219,254,0.2)",
    boxShadow:
      "0 20px 34px rgba(15, 23, 42, 0.18), inset 0 1px 0 rgba(255,255,255,0.08)"
  },
  connectionPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.4),
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column"
    }
  },
  connectionPanelTitle: {
    fontSize: 16,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#ffffff"
  },
  connectionPanelSubtitle: {
    marginTop: theme.spacing(0.35),
    fontSize: 12,
    color: "rgba(219, 234, 254, 0.84)",
    lineHeight: 1.45
  },
  connectionPanelSummary: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    justifyContent: "flex-end",
    [theme.breakpoints.down("sm")]: {
      justifyContent: "flex-start"
    }
  },
  connectionPanelSummaryChip: {
    borderRadius: 999,
    background: "rgba(15,23,42,0.32)",
    color: "#e0f2fe",
    border: "1px solid rgba(255,255,255,0.16)",
    fontWeight: 700
  },
  connectionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: theme.spacing(1),
    alignContent: "start"
  },
  connectionCard: {
    minWidth: 0,
    display: "grid",
    gap: theme.spacing(0.75),
    padding: theme.spacing(1.15, 1.2),
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.42)",
    background: "rgba(15,23,42,0.24)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)"
  },
  connectionCardName: {
    fontSize: 13,
    fontWeight: 800,
    color: "#ffffff",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  connectionCardMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    color: "rgba(219, 234, 254, 0.82)",
    fontSize: 12
  },
  connectionCardCount: {
    fontSize: 26,
    lineHeight: 1,
    fontWeight: 800,
    color: "#4ade80"
  },
  connectionEmptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 156,
    borderRadius: 18,
    border: "1px dashed rgba(255,255,255,0.18)",
    color: "rgba(219, 234, 254, 0.82)",
    textAlign: "center",
    padding: theme.spacing(2)
  },
  summaryColumn: {
    gridArea: "summary",
    display: "grid",
    minWidth: 0,
    gap: theme.spacing(1.1)
  },
  summaryCard: {
    position: "relative",
    padding: theme.spacing(1.5),
    borderRadius: 20,
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.78) 0%, rgba(30,41,59,0.92) 100%)",
    color: "#fff",
    border: "1px solid rgba(148,163,184,0.18)",
    backdropFilter: "blur(14px)",
    boxShadow:
      "0 18px 30px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255,255,255,0.06)"
  },
  summaryCardPrimary: {
    minHeight: 150,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background:
      "linear-gradient(135deg, rgba(23,37,84,0.96) 0%, rgba(30,58,138,0.98) 48%, rgba(29,78,216,0.94) 100%)"
  },
  summaryMiniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: theme.spacing(1.1),
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr"
    }
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "rgba(219, 234, 254, 0.86)"
  },
  summaryValue: {
    marginTop: theme.spacing(1),
    fontSize: 34,
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: "-0.05em",
    overflowWrap: "anywhere",
    [theme.breakpoints.down("sm")]: {
      fontSize: 30
    }
  },
  summaryDescription: {
    marginTop: theme.spacing(0.75),
    color: "rgba(226, 232, 240, 0.9)",
    lineHeight: 1.5
  },
  summaryMiniValue: {
    marginTop: theme.spacing(1),
    fontSize: 26,
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: "-0.05em"
  },
  summaryMiniDescription: {
    marginTop: theme.spacing(0.75),
    color: "rgba(226, 232, 240, 0.86)",
    fontSize: 13,
    lineHeight: 1.45
  },
  highlightProgress: {
    marginTop: theme.spacing(1.5),
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    "& .MuiLinearProgress-bar": {
      borderRadius: 999,
      background: "linear-gradient(90deg, #ffffff 0%, #bfdbfe 100%)"
    }
  },
  statsRow: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: theme.spacing(1.25),
    marginTop: theme.spacing(2)
  },
  statCard: {
    padding: theme.spacing(1.75),
    borderRadius: 22,
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(226,232,240,0.64)",
    boxShadow: "0 16px 28px rgba(15, 23, 42, 0.12)"
  },
  statCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5)
  },
  statLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#64748b"
  },
  statValue: {
    marginTop: theme.spacing(0.5),
    fontSize: 34,
    lineHeight: 1,
    fontWeight: 800
  },
  statIconBox: {
    width: 50,
    height: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18
  },
  statFooter: {
    marginTop: theme.spacing(1.5),
    fontSize: 12,
    color: "#475569",
    lineHeight: 1.45
  },
  tabsShell: {
    position: "relative",
    zIndex: 1,
    marginTop: theme.spacing(2),
    padding: theme.spacing(0.75),
    borderRadius: 22,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(191,219,254,0.32)",
    boxShadow: "0 14px 26px rgba(15, 23, 42, 0.12)"
  },
  tabs: {
    "& .MuiTabs-indicator": {
      display: "none"
    }
  },
  tab: {
    minHeight: 46,
    marginRight: theme.spacing(1),
    padding: theme.spacing(0, 1.5),
    borderRadius: 14,
    textTransform: "none",
    fontWeight: 800,
    color: "#365745",
    background: "#f8fafc",
    border: "1px solid rgba(148,163,184,0.18)",
    "&.Mui-selected": {
      color: "#fff",
      background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
      boxShadow: "0 14px 24px rgba(37, 99, 235, 0.25)"
    }
  },
  filterPanel: {
    position: "relative",
    zIndex: 1,
    marginTop: theme.spacing(1.75),
    padding: theme.spacing(2),
    borderRadius: 24,
    background: "rgba(255,255,255,0.97)",
    border: "1px solid rgba(226,232,240,0.58)",
    boxShadow: "0 16px 30px rgba(15, 23, 42, 0.12)"
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(2),
    flexWrap: "wrap",
    marginBottom: theme.spacing(1.5)
  },
  panelTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.25)
  },
  panelIconWrap: {
    width: 42,
    height: 42,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    background:
      "linear-gradient(135deg, rgba(37,99,235,0.14), rgba(59,130,246,0.24))",
    color: "#1d4ed8"
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a"
  },
  panelSubtitle: {
    marginTop: theme.spacing(0.35),
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.45
  },
  filterActions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  contextChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.5)
  },
  contextChip: {
    borderRadius: 999,
    background: "#e0e7ff",
    color: "#3730a3",
    fontWeight: 700
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: theme.spacing(1.25)
  },
  controlButtonBase: {
    textTransform: "none",
    borderRadius: 14,
    fontWeight: 700,
    boxShadow: "none"
  },
  controlButtonPrimary: {
    color: "#fff",
    background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
    "&:hover": {
      background: "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)"
    }
  },
  controlButtonSecondary: {
    color: "#0f172a",
    borderColor: "rgba(148,163,184,0.28)",
    background: "#fff",
    "&:hover": {
      background: "#f8fafc",
      borderColor: "rgba(100,116,139,0.4)"
    }
  },
  contentShell: {
    padding: theme.spacing(2.25),
    borderRadius: 30,
    background: "rgba(255,255,255,0.97)",
    border: "1px solid rgba(148,163,184,0.18)",
    boxShadow: "0 20px 44px rgba(15, 23, 42, 0.08)",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2)
    }
  },
  contentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(2),
    flexWrap: "wrap",
    marginBottom: theme.spacing(2)
  },
  sectionTitle: {
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#0f172a",
    [theme.breakpoints.down("sm")]: {
      fontSize: 24
    }
  },
  sectionDescription: {
    marginTop: theme.spacing(0.75),
    color: "#64748b",
    lineHeight: 1.45,
    maxWidth: 720
  },
  tabBody: {
    minHeight: 320
  },
  workspaceGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 0.9fr) minmax(0, 1.25fr)",
    gap: theme.spacing(2),
    alignItems: "start",
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "1fr"
    }
  },
  workspacePanel: {
    borderRadius: 26,
    border: "1px solid rgba(226,232,240,0.75)",
    boxShadow: "0 18px 28px rgba(15, 23, 42, 0.08)",
    overflow: "hidden",
    background: "#fff"
  },
  workspacePanelHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1.5, 1.75),
    borderBottom: "1px solid rgba(226,232,240,0.74)",
    flexWrap: "wrap"
  },
  workspacePanelTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a"
  },
  workspacePanelMeta: {
    marginTop: theme.spacing(0.35),
    fontSize: 12,
    color: "#64748b"
  },
  selectedHint: {
    margin: theme.spacing(1.5, 1.75, 0),
    padding: theme.spacing(1.4),
    borderRadius: 20,
    border: "1px solid rgba(191,219,254,0.54)",
    background:
      "linear-gradient(135deg, rgba(239,246,255,0.96), rgba(236,253,245,0.98))"
  },
  selectedHintLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: 800,
    color: "#1e3a8a"
  },
  selectedHintValue: {
    marginTop: theme.spacing(0.6),
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 800,
    color: "#0f172a"
  },
  groupList: {
    display: "grid",
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    maxHeight: "68vh",
    overflowY: "auto",
    ...theme.scrollbarStyles,
    [theme.breakpoints.down("md")]: {
      maxHeight: "none"
    }
  },
  groupCard: {
    display: "grid",
    gap: theme.spacing(1),
    padding: theme.spacing(1.3),
    borderRadius: 20,
    border: "1px solid rgba(226,232,240,0.92)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",
    cursor: "pointer",
    transition:
      "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 16px 26px rgba(15, 23, 42, 0.08)",
      borderColor: "rgba(59,130,246,0.32)"
    }
  },
  groupCardActive: {
    borderColor: "rgba(37,99,235,0.38)",
    boxShadow: "0 18px 30px rgba(37, 99, 235, 0.12)",
    background:
      "linear-gradient(180deg, rgba(239,246,255,0.98), rgba(248,250,252,0.98))"
  },
  groupCardHeader: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    gap: theme.spacing(1),
    alignItems: "center"
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, rgba(37,99,235,0.14), rgba(16,185,129,0.2))",
    color: "#1d4ed8"
  },
  groupAvatarFallback: {
    fontWeight: 800,
    fontSize: 16
  },
  groupCardInfo: {
    minWidth: 0
  },
  groupCardTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  groupCardMeta: {
    marginTop: theme.spacing(0.45),
    fontSize: 12,
    color: "#64748b",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  groupCardChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75)
  },
  neutralBadge: {
    borderRadius: 999,
    background: "#e2e8f0",
    color: "#334155",
    fontWeight: 700
  },
  favoriteButton: {
    minWidth: 42,
    width: 42,
    height: 42,
    borderRadius: 14,
    padding: 0
  },
  detailHero: {
    padding: theme.spacing(1.8),
    background:
      "linear-gradient(180deg, rgba(248,250,252,0.98), rgba(239,246,255,0.94))",
    borderBottom: "1px solid rgba(226,232,240,0.74)"
  },
  detailHeroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(2),
    flexWrap: "wrap"
  },
  detailHeroBadgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    marginBottom: theme.spacing(1)
  },
  detailHeroTitle: {
    fontSize: 26,
    lineHeight: 1.05,
    fontWeight: 800,
    color: "#0f172a",
    [theme.breakpoints.down("sm")]: {
      fontSize: 22
    }
  },
  detailHeroMeta: {
    marginTop: theme.spacing(0.75),
    color: "#475569",
    lineHeight: 1.5,
    maxWidth: 640
  },
  detailActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  selectedStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5)
  },
  selectedStatCard: {
    padding: theme.spacing(1.25),
    borderRadius: 18,
    border: "1px solid rgba(191,219,254,0.48)",
    background: "#fff"
  },
  selectedStatLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: 800,
    color: "#64748b"
  },
  selectedStatValue: {
    marginTop: theme.spacing(0.75),
    fontSize: 26,
    lineHeight: 1,
    fontWeight: 800,
    color: "#0f172a"
  },
  detailSection: {
    padding: theme.spacing(1.5, 1.75)
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: theme.spacing(1.25)
  },
  memberList: {
    display: "grid",
    gap: theme.spacing(1),
    maxHeight: "58vh",
    overflowY: "auto",
    ...theme.scrollbarStyles,
    [theme.breakpoints.down("md")]: {
      maxHeight: "none"
    }
  },
  memberRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: theme.spacing(1.25),
    alignItems: "center",
    padding: theme.spacing(1.2),
    borderRadius: 18,
    border: "1px solid rgba(226,232,240,0.9)",
    background: "#fff",
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr"
    }
  },
  memberIdentity: {
    minWidth: 0,
    display: "grid",
    gap: theme.spacing(0.55)
  },
  memberPhone: {
    fontSize: 15,
    fontWeight: 800,
    color: "#0f172a"
  },
  memberMeta: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.5
  },
  memberRoleChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    fontWeight: 800
  },
  memberActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: theme.spacing(0.75),
    [theme.breakpoints.down("sm")]: {
      justifyContent: "flex-start"
    }
  },
  rowAction: {
    textTransform: "none",
    borderRadius: 12,
    fontWeight: 700,
    borderColor: "rgba(148,163,184,0.25)",
    color: "#334155",
    background: "#f8fafc",
    "&:hover": {
      background: "#eff6ff"
    }
  },
  rowActionPositive: {
    color: "#047857",
    borderColor: "rgba(16,185,129,0.22)",
    background: "#ecfdf5"
  },
  rowActionDanger: {
    color: "#b91c1c",
    borderColor: "rgba(239,68,68,0.22)",
    background: "#fef2f2"
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1),
    textAlign: "center",
    minHeight: 280,
    padding: theme.spacing(4),
    borderRadius: 24,
    background:
      "linear-gradient(180deg, rgba(248,250,252,0.98), rgba(241,245,249,0.95))",
    border: "1px dashed rgba(148,163,184,0.45)",
    color: "#64748b"
  },
  emptyIcon: {
    fontSize: 52,
    opacity: 0.55
  },
  collectionPanel: {
    borderRadius: 24,
    border: "1px solid rgba(226,232,240,0.78)",
    boxShadow: "0 16px 28px rgba(15, 23, 42, 0.08)",
    background: "#fff",
    overflow: "hidden"
  },
  collectionPanelHead: {
    padding: theme.spacing(1.5, 1.75),
    borderBottom: "1px solid rgba(226,232,240,0.74)"
  },
  collectionList: {
    display: "grid",
    gap: theme.spacing(1),
    padding: theme.spacing(1.5)
  },
  collectionRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: theme.spacing(1),
    alignItems: "center",
    padding: theme.spacing(1.25),
    borderRadius: 18,
    border: "1px solid rgba(226,232,240,0.9)",
    background: "#fff",
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr"
    }
  },
  collectionRowHeader: {
    minWidth: 0
  },
  collectionRowTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  collectionRowMeta: {
    marginTop: theme.spacing(0.5),
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.5
  },
  collectionRowActions: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    flexWrap: "wrap",
    justifyContent: "flex-end",
    [theme.breakpoints.down("sm")]: {
      justifyContent: "flex-start"
    }
  },
  statusChip: {
    borderRadius: 999,
    fontWeight: 800
  },
  formGrid: {
    display: "grid",
    gap: theme.spacing(1.2),
    padding: theme.spacing(1.5)
  },
  fileInput: {
    width: "100%"
  },
  logList: {
    display: "grid",
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    maxHeight: 420,
    overflowY: "auto",
    ...theme.scrollbarStyles
  },
  logLine: {
    padding: theme.spacing(1.1),
    borderRadius: 16,
    border: "1px solid rgba(226,232,240,0.8)",
    background: "#f8fafc",
    fontSize: 12,
    lineHeight: 1.55,
    color: "#334155"
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 320
  }
}));

export default function GroupManagement() {
  const classes = useStyles();
  const { socket } = useSocket();
  const { user } = useContext(AuthContext);

  const [tab, setTab] = useState(1);
  const [loading, setLoading] = useState(false);
  const [groupInfoLoading, setGroupInfoLoading] = useState(false);
  const [metrics, setMetrics] = useState({});
  const [groups, setGroups] = useState([]);
  const [connections, setConnections] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [reports, setReports] = useState(null);
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [search, setSearch] = useState("");
  const [minMembers, setMinMembers] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [campaignForm, setCampaignForm] = useState(initialCampaign);
  const [templateForm, setTemplateForm] = useState(initialTemplate);
  const [campaignFileKey, setCampaignFileKey] = useState(0);
  const [templateFileKey, setTemplateFileKey] = useState(0);
  const [dialogs, setDialogs] = useState({
    batch: false,
    bulkMembers: false,
    description: false,
    picture: false
  });
  const [batchForm, setBatchForm] = useState({
    whatsappId: "",
    baseName: "",
    quantity: 1,
    participants: ""
  });
  const [bulkMembersForm, setBulkMembersForm] = useState({
    whatsappId: "",
    groupId: "",
    strategy: "round_robin",
    members: ""
  });
  const [description, setDescription] = useState("");
  const [pictureFile, setPictureFile] = useState(null);

  const readValue = (event, fallback = "") =>
    event && event.target ? event.target.value : fallback;
  const readFile = event =>
    event && event.target && event.target.files ? event.target.files[0] || null : null;

  const refreshAll = useCallback(async () => {
    setLoading(true);

    try {
      const [m, g, c, s, t, h, r] = await Promise.allSettled([
        api.get("/group-management/dashboard"),
        api.get("/group-management/groups"),
        api.get("/group-management/campaigns"),
        api.get("/group-management/schedules"),
        api.get("/group-management/templates"),
        api.get("/group-management/history?limit=300"),
        api.get("/group-management/reports")
      ]);

      if (m.status === "fulfilled") setMetrics(m.value.data || {});
      if (c.status === "fulfilled") {
        setCampaigns(Array.isArray(c.value.data) ? c.value.data : []);
      }
      if (s.status === "fulfilled") {
        setSchedules(Array.isArray(s.value.data) ? s.value.data : []);
      }
      if (t.status === "fulfilled") {
        setTemplates(Array.isArray(t.value.data) ? t.value.data : []);
      }
      if (h.status === "fulfilled") {
        setHistoryLogs(Array.isArray(h.value.data) ? h.value.data : []);
      }
      if (r.status === "fulfilled") setReports(r.value.data || null);

      if (g.status === "fulfilled") {
        const nextConnections = [];
        const nextGroups = [];

        (g.value.data || []).forEach(connection => {
          if (connection.whatsappId && connection.whatsappName) {
            nextConnections.push({
              id: connection.whatsappId,
              name: connection.whatsappName
            });
          }

          (connection.groups || []).forEach(group =>
            nextGroups.push({
              ...group,
              whatsappId: connection.whatsappId,
              whatsappName: connection.whatsappName
            })
          );
        });

        setConnections(nextConnections);
        setGroups(nextGroups);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!socket || !user) return undefined;

    const channel = `company-${user.companyId}-group-campaign`;
    socket.on(channel, refreshAll);

    return () => socket.off(channel, refreshAll);
  }, [socket, user, refreshAll]);

  useEffect(() => {
    if (!selectedGroup) return;

    const refreshedSelectedGroup = groups.find(
      group =>
        Number(group.groupId) === Number(selectedGroup.groupId) &&
        Number(group.whatsappId) === Number(selectedGroup.whatsappId)
    );

    if (refreshedSelectedGroup && refreshedSelectedGroup !== selectedGroup) {
      setSelectedGroup(refreshedSelectedGroup);
    }
  }, [groups, selectedGroup]);

  const filteredGroups = useMemo(
    () =>
      groups.filter(group => {
        const matchesConnection =
          !selectedConnection || group.whatsappId === Number(selectedConnection);
        const matchesSearch =
          !search ||
          String(group.subject || "")
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesMin =
          !minMembers || safeNumber(group.size) >= safeNumber(minMembers);
        const matchesMax =
          !maxMembers || safeNumber(group.size) <= safeNumber(maxMembers);

        return matchesConnection && matchesSearch && matchesMin && matchesMax;
      }),
    [groups, selectedConnection, search, minMembers, maxMembers]
  );

  const campaignGroups = useMemo(
    () =>
      groups.filter(
        group =>
          !campaignForm.whatsappId ||
          group.whatsappId === Number(campaignForm.whatsappId)
      ),
    [groups, campaignForm.whatsappId]
  );

  const selectedParticipants = useMemo(
    () => groupInfo?.participants || [],
    [groupInfo]
  );

  const selectedAdminsCount = useMemo(
    () =>
      selectedParticipants.filter(
        participant => participant?.isAdmin || participant?.isSuperAdmin
      ).length,
    [selectedParticipants]
  );

  const selectedKnownContactsCount = useMemo(
    () =>
      selectedParticipants.filter(
        participant => participant?.leadName || participant?.contactName
      ).length,
    [selectedParticipants]
  );

  const favoriteGroupsCount = useMemo(
    () => groups.filter(group => group.isFavorite).length,
    [groups]
  );

  const connectionMetrics = useMemo(
    () =>
      connections
        .map(connection => {
          const connectionGroups = groups.filter(
            group => Number(group.whatsappId) === Number(connection.id)
          );

          return {
            id: connection.id,
            name: connection.name,
            groups: connectionGroups.length,
            members: connectionGroups.reduce(
              (total, group) => total + safeNumber(group.size),
              0
            ),
            favorites: connectionGroups.filter(group => group.isFavorite).length
          };
        })
        .sort(
          (first, second) =>
            second.groups - first.groups || second.members - first.members
        ),
    [connections, groups]
  );

  const nextScheduledCampaign = useMemo(() => {
    const now = Date.now();

    const sortedCampaigns = campaigns
      .filter(campaign => campaign?.scheduledAt)
      .map(campaign => ({
        ...campaign,
        scheduleTime: new Date(campaign.scheduledAt).getTime()
      }))
      .filter(campaign => !Number.isNaN(campaign.scheduleTime))
      .sort((first, second) => {
        const firstIsFuture = first.scheduleTime >= now ? 0 : 1;
        const secondIsFuture = second.scheduleTime >= now ? 0 : 1;

        if (firstIsFuture !== secondIsFuture) {
          return firstIsFuture - secondIsFuture;
        }

        return first.scheduleTime - second.scheduleTime;
      });

    return sortedCampaigns[0] || null;
  }, [campaigns]);

  const deliveryRate = useMemo(() => {
    const total = safeNumber(metrics.campaignsTotal);
    if (!total) return 0;

    return Math.round((safeNumber(metrics.campaignsSent) / total) * 100);
  }, [metrics]);

  const activeCampaignCount = useMemo(
    () =>
      campaigns.filter(campaign =>
        ["DRAFT", "SCHEDULED", "PROCESSING", "PAUSED"].includes(
          String(campaign.status || "").toUpperCase()
        )
      ).length,
    [campaigns]
  );

  const heroChips = useMemo(
    () => [
      `${filteredGroups.length} grupo(s) visivel(is)`,
      `${connections.length} conexao(oes) ativa(s)`,
      `${favoriteGroupsCount} favorito(s)`
    ],
    [filteredGroups.length, connections.length, favoriteGroupsCount]
  );

  const filterContextChips = useMemo(() => {
    const chips = [
      selectedConnection ? "Conexao filtrada" : "Todas as conexoes",
      search ? "Busca ativa" : "Sem filtro por nome",
      minMembers || maxMembers ? "Recorte por membros" : "Sem recorte por membros"
    ];

    if (selectedGroup?.subject) {
      chips.push(`Grupo ativo: ${selectedGroup.subject}`);
    }

    return chips;
  }, [selectedConnection, search, minMembers, maxMembers, selectedGroup]);

  const statCards = useMemo(
    () => [
      {
        key: "groups",
        label: "Grupos",
        value: safeNumber(metrics.totalGroups) || groups.length,
        color: "#4f46e5",
        icon: <GroupIcon />,
        footer: "Volume total de grupos sincronizados no contexto atual."
      },
      {
        key: "members",
        label: "Membros",
        value:
          safeNumber(metrics.totalMembers) ||
          groups.reduce((total, group) => total + safeNumber(group.size), 0),
        color: "#2563eb",
        icon: <PersonIcon />,
        footer: "Base total de participantes considerando os grupos carregados."
      },
      {
        key: "admins",
        label: "Admins",
        value: safeNumber(metrics.totalAdmins),
        color: "#059669",
        icon: <DoneAllIcon />,
        footer: "Administradores identificados para moderacao e governanca."
      },
      {
        key: "campaigns",
        label: "Campanhas",
        value: safeNumber(metrics.campaignsTotal) || campaigns.length,
        color: "#7c3aed",
        icon: <SendIcon />,
        footer: "Historico de campanhas registradas para grupos."
      },
      {
        key: "sent",
        label: "Enviadas",
        value: safeNumber(metrics.campaignsSent),
        color: "#16a34a",
        icon: <EventAvailableIcon />,
        footer: "Campanhas concluidas com sucesso no panorama geral."
      },
      {
        key: "failed",
        label: "Falhas",
        value: safeNumber(metrics.campaignsFailed),
        color: "#ef4444",
        icon: <ErrorOutlineIcon />,
        footer: "Sinal de pontos que ainda exigem ajuste na operacao."
      }
    ],
    [metrics, groups, campaigns.length]
  );

  const loadGroupInfo = async group => {
    setSelectedGroup(group);
    setGroupInfoLoading(true);

    try {
      const { data } = await api.get(
        `/group-management/groups/${encodeURIComponent(group.id)}/info`,
        { params: { whatsappId: group.whatsappId } }
      );

      setGroupInfo(data);
      setDescription(data.desc || "");
    } catch (error) {
      setGroupInfo(null);
      toast.error(
        error?.response?.data?.error || "Erro ao carregar detalhes do grupo."
      );
    } finally {
      setGroupInfoLoading(false);
    }
  };

  const syncGroups = async () => {
    try {
      await api.post("/group-management/sync", {
        whatsappIds: selectedConnection ? [Number(selectedConnection)] : []
      });
      toast.success("Grupos sincronizados.");
      refreshAll();
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "Falha ao sincronizar grupos."
      );
    }
  };

  const exportMembers = async format => {
    if (!selectedGroup) return;

    try {
      const { data } = await api.get(
        `/group-management/groups/${encodeURIComponent(selectedGroup.id)}/export`,
        { params: { whatsappId: selectedGroup.whatsappId } }
      );

      const items = (data.contacts || []).map(item => ({
        numero_real_whatsapp: item.phone,
        contato_valido: item.valid ? "Sim" : "Nao",
        grupo: selectedGroup.subject,
        admin: item.isAdmin ? "Sim" : "Nao",
        id: item.id
      }));

      const blob =
        format === "json"
          ? new Blob([JSON.stringify(items, null, 2)], {
              type: "application/json"
            })
          : new Blob(
              [
                [
                  "NumeroRealWhatsApp,ContatoValido,Grupo,Admin,ID",
                  ...items.map(
                    item =>
                      `${item.numero_real_whatsapp},${item.contato_valido},"${item.grupo}",${item.admin},${item.id}`
                  )
                ].join("\n")
              ],
              { type: "text/csv;charset=utf-8;" }
            );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `grupo-${selectedGroup.subject.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}.${format === "json" ? "json" : "csv"}`;
      anchor.click();
      URL.revokeObjectURL(url);

      toast.success(
        `Exportacao concluida. ${data.validContacts || 0} contatos validos.`
      );
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao exportar contatos.");
    }
  };

  const createCampaign = async () => {
    try {
      const campaignName = String(campaignForm.name || "").trim();
      const campaignMessage = String(campaignForm.message || "");

      if (!campaignName) return toast.error("Insira o nome da campanha.");
      if (!campaignForm.whatsappId) {
        return toast.error("Selecione a conexao.");
      }

      let mediaPath = null;
      let mediaName = null;

      if (campaignForm.mediaContent) {
        const formData = new FormData();
        formData.append("media", campaignForm.mediaContent);

        const { data } = await api.post(
          "/group-management/campaigns/media",
          formData
        );

        mediaPath = data.mediaPath;
        mediaName = data.mediaName;
      }

      await api.post("/group-management/campaigns", {
        ...campaignForm,
        name: campaignName,
        message: campaignMessage,
        whatsappId: Number(campaignForm.whatsappId),
        templateId: campaignForm.templateId || null,
        groupIds: (campaignForm.groupIds || []).map(Number).filter(Boolean),
        filters: { whatsappId: Number(campaignForm.whatsappId) },
        scheduledAt:
          campaignForm.scheduleMode === "scheduled" && campaignForm.scheduledAt
            ? new Date(campaignForm.scheduledAt).toISOString()
            : null,
        intervalSeconds: Number(campaignForm.intervalSeconds) || 0,
        mediaPath,
        mediaName
      });

      toast.success("Campanha criada.");
      setCampaignForm(initialCampaign);
      setCampaignFileKey(value => value + 1);
      refreshAll();
      setTab(2);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao criar campanha.");
    }
  };

  const saveTemplate = async () => {
    try {
      const templateName = String(templateForm.name || "").trim();
      if (!templateName) {
        return toast.error("Informe o nome do template.");
      }

      let mediaPath = null;
      let mediaName = null;

      if (templateForm.mediaContent) {
        const formData = new FormData();
        formData.append("media", templateForm.mediaContent);

        const { data } = await api.post(
          "/group-management/campaigns/media",
          formData
        );

        mediaPath = data.mediaPath;
        mediaName = data.mediaName;
      }

      await api.post("/group-management/templates", {
        ...templateForm,
        name: templateName,
        mediaPath,
        mediaName
      });

      toast.success("Template salvo.");
      setTemplateForm(initialTemplate);
      setTemplateFileKey(value => value + 1);
      refreshAll();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao salvar template.");
    }
  };

  const campaignAction = async (id, action) => {
    try {
      await api.post(`/group-management/campaigns/${id}/${action}`);
      refreshAll();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Falha na acao.");
    }
  };

  const handleBatchCreate = async () => {
    try {
      const baseName = String(batchForm.baseName || "").trim();
      if (!batchForm.whatsappId || !baseName) {
        return toast.error("Preencha a conexao e o nome base.");
      }

      const participants = batchForm.participants
        .split(/[\n,;]/)
        .map(item => item.trim())
        .filter(Boolean);

      const groupsPayload = Array.from({
        length: Number(batchForm.quantity)
      }).map((_, index) => ({
        whatsappId: Number(batchForm.whatsappId),
        subject: `${baseName} #${index + 1}`,
        participants
      }));

      const { data } = await api.post("/group-management/groups/batch", {
        groups: groupsPayload
      });

      toast.success(
        `Criacao em massa finalizada. ${data.created || 0} grupos criados.`
      );
      setDialogs(current => ({ ...current, batch: false }));
      setBatchForm({
        whatsappId: "",
        baseName: "",
        quantity: 1,
        participants: ""
      });
      refreshAll();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Erro ao criar grupos.");
    }
  };

  const handleBulkMembers = async () => {
    try {
      const members = bulkMembersForm.members
        .split(/[\n,;]/)
        .map(item => item.trim())
        .filter(Boolean);

      if (!members.length) {
        return toast.error("Informe ao menos um contato.");
      }

      const chosenGroupId = Number(
        bulkMembersForm.groupId || selectedGroup?.groupId || 0
      );
      const groupIds = chosenGroupId
        ? [chosenGroupId]
        : filteredGroups.map(group => group.groupId);
      const whatsappId = Number(
        bulkMembersForm.whatsappId ||
          selectedGroup?.whatsappId ||
          selectedConnection
      );

      if (!whatsappId) return toast.error("Selecione a conexao.");
      if (!groupIds.length) {
        return toast.error("Selecione o grupo que recebera os membros.");
      }

      const { data } = await api.post(
        "/group-management/groups/bulk-add-members",
        {
          whatsappId,
          groupIds,
          members,
          strategy: bulkMembersForm.strategy
        }
      );

      toast.success(
        `Distribuicao concluida. ${data.assigned || 0} inclusoes processadas.`
      );
      setDialogs(current => ({ ...current, bulkMembers: false }));
      setBulkMembersForm({
        whatsappId: "",
        groupId: "",
        strategy: "round_robin",
        members: ""
      });
      refreshAll();

      if (selectedGroup) loadGroupInfo(selectedGroup);
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "Erro ao adicionar membros."
      );
    }
  };

  const handleDescription = async () => {
    try {
      await api.put(
        `/group-management/groups/${encodeURIComponent(selectedGroup.id)}/description`,
        {
          whatsappId: selectedGroup.whatsappId,
          description
        }
      );

      toast.success("Descricao atualizada.");
      setDialogs(current => ({ ...current, description: false }));
      refreshAll();
      loadGroupInfo(selectedGroup);
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "Erro ao atualizar descricao."
      );
    }
  };

  const handlePicture = async () => {
    try {
      const formData = new FormData();
      formData.append("picture", pictureFile);
      formData.append("whatsappId", String(selectedGroup.whatsappId));

      await api.put(
        `/group-management/groups/${encodeURIComponent(selectedGroup.id)}/picture`,
        formData
      );

      toast.success("Foto do grupo atualizada.");
      setDialogs(current => ({ ...current, picture: false }));
      setPictureFile(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "Erro ao atualizar foto."
      );
    }
  };

  const handleToggleFavorite = async (group, event) => {
    event.stopPropagation();

    try {
      await api.patch(`/group-management/groups/meta/${group.groupId}`, {
        isFavorite: !group.isFavorite
      });
      refreshAll();
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "Nao foi possivel atualizar o favorito."
      );
    }
  };

  const handleResetFilters = () => {
    setSelectedConnection("");
    setSearch("");
    setMinMembers("");
    setMaxMembers("");
  };

  const renderSimpleCollection = (
    title,
    items,
    field = "name",
    emptyMessage = "Sem dados."
  ) => (
    <Paper elevation={0} className={classes.collectionPanel}>
      <Box className={classes.collectionPanelHead}>
        <Typography className={classes.workspacePanelTitle}>{title}</Typography>
      </Box>

      <Box className={classes.collectionList}>
        {(items || []).map(item => {
          const titleValue = item[field] || item.message || "-";
          const primaryMeta = item.createdAt
            ? new Date(item.createdAt).toLocaleString("pt-BR")
            : item.scheduledAt
            ? formatDateTime(item.scheduledAt)
            : item.updatedAt
            ? new Date(item.updatedAt).toLocaleString("pt-BR")
            : "Sem data registrada";

          const secondaryMeta = item.status
            ? `Status: ${item.status}`
            : item.description || item.templateName || "";

          return (
            <Box
              key={item.id || item.createdAt || item.name || titleValue}
              className={classes.collectionRow}
            >
              <Box className={classes.collectionRowHeader}>
                <Typography className={classes.collectionRowTitle}>
                  {titleValue}
                </Typography>
                <Typography className={classes.collectionRowMeta}>
                  {primaryMeta}
                  {secondaryMeta ? ` • ${secondaryMeta}` : ""}
                </Typography>
              </Box>

              {item.status ? (
                <Box className={classes.collectionRowActions}>
                  <Chip
                    size="small"
                    label={item.status}
                    className={classes.statusChip}
                    style={{
                      backgroundColor: `${statusBg(item.status)}18`,
                      color: statusBg(item.status)
                    }}
                  />
                </Box>
              ) : null}
            </Box>
          );
        })}

        {!items?.length ? (
          <Box className={classes.emptyState}>
            <GroupIcon className={classes.emptyIcon} />
            <Typography variant="h6">{emptyMessage}</Typography>
          </Box>
        ) : null}
      </Box>
    </Paper>
  );

  const activeTabMeta = TAB_META[tab] || TAB_META[1];

  return (
    <Box className={classes.root}>
      <Box className={classes.contentShell}>
        <Box className={classes.tabsShell} style={{ marginTop: 0 }}>
          <Tabs
            className={classes.tabs}
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {TABS.map(label => (
              <Tab key={label} label={label} className={classes.tab} />
            ))}
          </Tabs>
        </Box>

        {tab === 1 ? (
          <Paper
            elevation={0}
            className={classes.collectionPanel}
            style={{ marginTop: 16 }}
          >
            <Box className={classes.collectionPanelHead}>
              <Box className={classes.panelHeader} style={{ marginBottom: 0 }}>
                <Box>
                  <Typography className={classes.workspacePanelTitle}>
                    Acoes e filtros de grupos
                  </Typography>
                  <Typography className={classes.workspacePanelMeta}>
                    Mantenha so o que ajuda a operar: criar, sincronizar e filtrar.
                  </Typography>
                </Box>

                <Box className={classes.filterActions}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setDialogs(current => ({ ...current, batch: true }))}
                    className={`${classes.controlButtonBase} ${classes.controlButtonPrimary}`}
                  >
                    Criar grupos em massa
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<GroupAddIcon />}
                    onClick={() =>
                      setDialogs(current => ({ ...current, bulkMembers: true }))
                    }
                    className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                  >
                    Adicionar membros em massa
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DescriptionIcon />}
                    disabled={!selectedGroup}
                    onClick={() =>
                      setDialogs(current => ({ ...current, description: true }))
                    }
                    className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                  >
                    Editar descricao
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PhotoCameraIcon />}
                    disabled={!selectedGroup}
                    onClick={() =>
                      setDialogs(current => ({ ...current, picture: true }))
                    }
                    className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                  >
                    Alterar foto
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<GetAppIcon />}
                    disabled={!selectedGroup}
                    onClick={() => exportMembers("csv")}
                    className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                  >
                    Exportar contatos
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={syncGroups}
                    className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                  >
                    Sincronizar
                  </Button>
                </Box>
              </Box>
            </Box>

            <Box className={classes.formGrid}>
              <Box className={classes.contextChips} style={{ marginBottom: 0 }}>
                {filterContextChips.map(chip => (
                  <Chip key={chip} label={chip} className={classes.contextChip} />
                ))}
              </Box>

              <Box className={classes.filterGrid}>
                <FormControl variant="outlined" size="small">
                  <InputLabel>Conexao</InputLabel>
                  <Select
                    value={selectedConnection}
                    onChange={event => setSelectedConnection(readValue(event))}
                    label="Conexao"
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {connections.map(connection => (
                      <MenuItem key={connection.id} value={connection.id}>
                        {connection.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  variant="outlined"
                  size="small"
                  label="Buscar grupo"
                  value={search}
                  onChange={event => setSearch(readValue(event))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />

                <TextField
                  variant="outlined"
                  size="small"
                  label="Min. membros"
                  value={minMembers}
                  onChange={event => setMinMembers(readValue(event))}
                />

                <TextField
                  variant="outlined"
                  size="small"
                  label="Max. membros"
                  value={maxMembers}
                  onChange={event => setMaxMembers(readValue(event))}
                />
              </Box>

              <Box className={classes.filterActions}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleResetFilters}
                  className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                >
                  Limpar
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={refreshAll}
                  className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                >
                  Atualizar
                </Button>
              </Box>
            </Box>
          </Paper>
        ) : null}

        {(tab === 0 || tab === 2 || tab === 3 || tab === 4 || tab === 5 || tab === 6) ? (
          <Box className={classes.contentHeader} style={{ marginTop: 20 }}>
            <Box>
              <Typography className={classes.sectionTitle}>
                {activeTabMeta.title}
              </Typography>
              <Typography className={classes.sectionDescription}>
                {activeTabMeta.description}
              </Typography>
            </Box>
          </Box>
        ) : null}

        {tab === 1 ? (
          <Box className={classes.contentHeader}>
            <Box>
              <Typography className={classes.sectionTitle}>
                Workspace de grupos
              </Typography>
              <Typography className={classes.sectionDescription}>
                Lista a esquerda, detalhes a direita e o menu compacto logo acima.
              </Typography>
            </Box>
          </Box>
        ) : null}

        <Box className={classes.tabBody}>
          {loading ? (
            <Box className={classes.loadingContainer}>
              <CircularProgress />
            </Box>
          ) : null}

          {!loading && tab === 0 ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={7}>
                {renderSimpleCollection(
                  "Resumo executivo",
                  [
                    {
                      id: "groups",
                      name: "Panorama de grupos",
                      description: `${safeNumber(metrics.totalGroups) || groups.length} grupo(s) sincronizado(s) com ${favoriteGroupsCount} favorito(s).`,
                      status: groups.length ? "ATIVO" : "VAZIO",
                      createdAt: new Date().toISOString()
                    },
                    {
                      id: "campaigns",
                      name: "Volume de campanhas",
                      description: `${campaigns.length} campanha(s) registrada(s) e ${activeCampaignCount} com carga ativa.`,
                      status: activeCampaignCount ? "OPERANDO" : "PARADO",
                      createdAt: new Date().toISOString()
                    }
                  ],
                  "name",
                  "Ainda nao ha indicadores consolidados."
                )}
              </Grid>

              <Grid item xs={12} md={5}>
                {renderSimpleCollection(
                  "Leituras rapidas",
                  [
                    {
                      id: "members",
                      name: "Base de membros",
                      description: `${safeNumber(metrics.totalMembers).toLocaleString("pt-BR")} membro(s) no total.`,
                      status: safeNumber(metrics.totalMembers) ? "OK" : "BAIXO",
                      createdAt: new Date().toISOString()
                    },
                    {
                      id: "schedules",
                      name: "Agenda operacional",
                      description: `${schedules.length} agendamento(s) disponivel(is) para consulta.`,
                      status: schedules.length ? "ATIVO" : "SEM DADOS",
                      createdAt: new Date().toISOString()
                    }
                  ],
                  "name",
                  "Sem leituras complementares."
                )}
              </Grid>
            </Grid>
          ) : null}

          {!loading && tab === 1 ? (
            <Box className={classes.workspaceGrid}>
              <Paper elevation={0} className={classes.workspacePanel}>
                <Box className={classes.workspacePanelHead}>
                  <Box>
                    <Typography className={classes.workspacePanelTitle}>
                      Lista de grupos
                    </Typography>
                    <Typography className={classes.workspacePanelMeta}>
                      {filteredGroups.length} grupo(s) no contexto atual.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={syncGroups}
                    className={`${classes.controlButtonBase} ${classes.controlButtonPrimary}`}
                  >
                    Sincronizar
                  </Button>
                </Box>

                {selectedGroup ? (
                  <Box className={classes.selectedHint}>
                    <Typography className={classes.selectedHintLabel}>
                      Grupo selecionado
                    </Typography>
                    <Typography className={classes.selectedHintValue}>
                      {safeNumber(groupInfo?.memberCount || selectedGroup.size).toLocaleString(
                        "pt-BR"
                      )}
                    </Typography>
                    <Typography className={classes.workspacePanelMeta}>
                      membros visiveis em {selectedGroup.subject}
                    </Typography>
                  </Box>
                ) : null}

                <Box className={classes.groupList}>
                  {filteredGroups.map(group => (
                    <Box
                      key={`${group.groupId}-${group.whatsappId}`}
                      className={`${classes.groupCard} ${
                        selectedGroup?.groupId === group.groupId
                          ? classes.groupCardActive
                          : ""
                      }`}
                      onClick={() => loadGroupInfo(group)}
                    >
                      <Box className={classes.groupCardHeader}>
                        <Box className={classes.groupAvatar}>
                          <Typography className={classes.groupAvatarFallback}>
                            {String(group.subject || group.id || "G")
                              .charAt(0)
                              .toUpperCase()}
                          </Typography>
                        </Box>

                        <Box className={classes.groupCardInfo}>
                          <Typography className={classes.groupCardTitle}>
                            {group.subject || group.id}
                          </Typography>
                          <Typography className={classes.groupCardMeta}>
                            {group.whatsappName || "Conexao nao informada"}
                          </Typography>
                        </Box>

                        <Button
                          variant="outlined"
                          className={`${classes.controlButtonBase} ${classes.controlButtonSecondary} ${classes.favoriteButton}`}
                          onClick={event => handleToggleFavorite(group, event)}
                        >
                          {group.isFavorite ? (
                            <StarIcon fontSize="small" />
                          ) : (
                            <StarBorderIcon fontSize="small" />
                          )}
                        </Button>
                      </Box>

                      <Box className={classes.groupCardChips}>
                        <Chip
                          size="small"
                          className={classes.neutralBadge}
                          label={`${safeNumber(group.size).toLocaleString(
                            "pt-BR"
                          )} membro(s)`}
                        />
                        <Chip
                          size="small"
                          className={classes.neutralBadge}
                          label={`${safeNumber(group.tags?.length).toLocaleString(
                            "pt-BR"
                          )} tag(s)`}
                        />
                        {group.isFavorite ? (
                          <Chip
                            size="small"
                            className={classes.neutralBadge}
                            label="Favorito"
                          />
                        ) : null}
                      </Box>
                    </Box>
                  ))}
                  {!filteredGroups.length ? (
                    <Box className={classes.emptyState}>
                      <GroupIcon className={classes.emptyIcon} />
                      <Typography variant="h6">Nenhum grupo encontrado</Typography>
                      <Typography variant="body2">
                        Ajuste os filtros ou sincronize novamente para atualizar
                        a lista.
                      </Typography>
                    </Box>
                  ) : null}
                </Box>
              </Paper>

              <Paper elevation={0} className={classes.workspacePanel}>
                {!selectedGroup ? (
                  <Box className={classes.emptyState}>
                    <GroupIcon className={classes.emptyIcon} />
                    <Typography variant="h6">
                      Selecione um grupo para abrir o workspace
                    </Typography>
                    <Typography variant="body2">
                      A partir daqui voce consegue revisar membros, editar
                      descricao, alterar foto e exportar contatos com mais clareza.
                    </Typography>
                  </Box>
                ) : groupInfoLoading ? (
                  <Box className={classes.loadingContainer}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <Box className={classes.detailHero}>
                      <Box className={classes.detailHeroTop}>
                        <Box>
                          <Box className={classes.detailHeroBadgeRow}>
                            <Chip
                              size="small"
                              className={classes.contextChip}
                              label={selectedGroup.whatsappName || "Conexao"}
                            />
                            <Chip
                              size="small"
                              className={classes.contextChip}
                              label={selectedGroup.isFavorite ? "Favorito" : "Grupo ativo"}
                            />
                          </Box>

                          <Typography className={classes.detailHeroTitle}>
                            {selectedGroup.subject}
                          </Typography>
                          <Typography className={classes.detailHeroMeta}>
                            {groupInfo?.desc
                              ? groupInfo.desc
                              : "Sem descricao cadastrada. Use os atalhos ao lado para editar informacoes e manter o grupo mais organizado."}
                          </Typography>
                        </Box>

                        <Box className={classes.detailActions}>
                          <Button
                            variant="outlined"
                            startIcon={<DescriptionIcon />}
                            onClick={() =>
                              setDialogs(current => ({
                                ...current,
                                description: true
                              }))
                            }
                            className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                          >
                            Editar descricao
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<PhotoCameraIcon />}
                            onClick={() =>
                              setDialogs(current => ({ ...current, picture: true }))
                            }
                            className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                          >
                            Alterar foto
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<GroupAddIcon />}
                            onClick={() =>
                              setDialogs(current => ({
                                ...current,
                                bulkMembers: true
                              }))
                            }
                            className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                          >
                            Adicionar membros
                          </Button>
                        </Box>
                      </Box>

                      <Box className={classes.selectedStatsGrid}>
                        <Box className={classes.selectedStatCard}>
                          <Typography className={classes.selectedStatLabel}>
                            Membros
                          </Typography>
                          <Typography className={classes.selectedStatValue}>
                            {safeNumber(
                              groupInfo?.memberCount || selectedGroup.size
                            ).toLocaleString("pt-BR")}
                          </Typography>
                        </Box>

                        <Box className={classes.selectedStatCard}>
                          <Typography className={classes.selectedStatLabel}>
                            Admins
                          </Typography>
                          <Typography className={classes.selectedStatValue}>
                            {selectedAdminsCount.toLocaleString("pt-BR")}
                          </Typography>
                        </Box>

                        <Box className={classes.selectedStatCard}>
                          <Typography className={classes.selectedStatLabel}>
                            Contatos mapeados
                          </Typography>
                          <Typography className={classes.selectedStatValue}>
                            {selectedKnownContactsCount.toLocaleString("pt-BR")}
                          </Typography>
                        </Box>

                        <Box className={classes.selectedStatCard}>
                          <Typography className={classes.selectedStatLabel}>
                            Exportacao
                          </Typography>
                          <Typography className={classes.selectedStatValue}>
                            CSV / JSON
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box className={classes.detailSection}>
                      <Box className={classes.panelHeader}>
                        <Box>
                          <Typography className={classes.detailSectionTitle}>
                            Membros e privilegios
                          </Typography>
                          <Typography className={classes.workspacePanelMeta}>
                            {selectedParticipants.length} participante(s)
                            carregado(s) para a moderacao deste grupo.
                          </Typography>
                        </Box>

                        <Box className={classes.filterActions}>
                          <Button
                            variant="outlined"
                            startIcon={<GetAppIcon />}
                            onClick={() => exportMembers("csv")}
                            className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                          >
                            Exportar CSV
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<GetAppIcon />}
                            onClick={() => exportMembers("json")}
                            className={`${classes.controlButtonBase} ${classes.controlButtonSecondary}`}
                          >
                            Exportar JSON
                          </Button>
                        </Box>
                      </Box>

                      <Box className={classes.memberList}>
                        {selectedParticipants.map(participant => {
                          const tone = roleTone(participant);

                          return (
                            <Box key={participant.id} className={classes.memberRow}>
                              <Box className={classes.memberIdentity}>
                                <Typography className={classes.memberPhone}>
                                  {participant.phone ||
                                    String(participant.id).split("@")[0]}
                                </Typography>

                                <Chip
                                  size="small"
                                  label={tone.label}
                                  className={classes.memberRoleChip}
                                  style={{
                                    backgroundColor: tone.bg,
                                    color: tone.color
                                  }}
                                />

                                <Typography className={classes.memberMeta}>
                                  {participant.leadName
                                    ? `Lead: ${participant.leadName}`
                                    : participant.contactName
                                    ? `Contato: ${participant.contactName}`
                                    : "Sem lead relacionado"}
                                </Typography>
                              </Box>

                              <Box className={classes.memberActions}>
                                {!participant.isAdmin ? (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    className={`${classes.rowAction} ${classes.rowActionPositive}`}
                                    onClick={() =>
                                      api
                                        .post(
                                          `/group-management/groups/${encodeURIComponent(
                                            selectedGroup.id
                                          )}/members/${encodeURIComponent(
                                            participant.id
                                          )}/promote`,
                                          {
                                            whatsappId: selectedGroup.whatsappId
                                          }
                                        )
                                        .then(() => loadGroupInfo(selectedGroup))
                                    }
                                  >
                                    Promover
                                  </Button>
                                ) : (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    className={classes.rowAction}
                                    onClick={() =>
                                      api
                                        .post(
                                          `/group-management/groups/${encodeURIComponent(
                                            selectedGroup.id
                                          )}/members/${encodeURIComponent(
                                            participant.id
                                          )}/demote`,
                                          {
                                            whatsappId: selectedGroup.whatsappId
                                          }
                                        )
                                        .then(() => loadGroupInfo(selectedGroup))
                                    }
                                  >
                                    Rebaixar
                                  </Button>
                                )}

                                <Button
                                  size="small"
                                  variant="outlined"
                                  className={`${classes.rowAction} ${classes.rowActionDanger}`}
                                  onClick={() =>
                                    api
                                      .delete(
                                        `/group-management/groups/${encodeURIComponent(
                                          selectedGroup.id
                                        )}/members/${encodeURIComponent(
                                          participant.id
                                        )}`,
                                        {
                                          data: {
                                            whatsappId: selectedGroup.whatsappId
                                          }
                                        }
                                      )
                                      .then(() => loadGroupInfo(selectedGroup))
                                  }
                                >
                                  Remover
                                </Button>
                              </Box>
                            </Box>
                          );
                        })}

                        {!selectedParticipants.length ? (
                          <Box className={classes.emptyState}>
                            <PersonIcon className={classes.emptyIcon} />
                            <Typography variant="h6">
                              Nenhum participante carregado
                            </Typography>
                            <Typography variant="body2">
                              Sincronize o grupo ou abra outro contexto para
                              revisar os membros.
                            </Typography>
                          </Box>
                        ) : null}
                      </Box>
                    </Box>
                  </>
                )}
              </Paper>
            </Box>
          ) : null}

          {!loading && tab === 2 ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Paper elevation={0} className={classes.collectionPanel}>
                  <Box className={classes.collectionPanelHead}>
                    <Typography className={classes.workspacePanelTitle}>
                      Nova campanha de grupos
                    </Typography>
                    <Typography className={classes.workspacePanelMeta}>
                      Organize nome, conexao, grupos alvo e janela de envio sem
                      perder o contexto da operacao.
                    </Typography>
                  </Box>

                  <Box className={classes.formGrid}>
                    <TextField
                      variant="outlined"
                      size="small"
                      label="Nome"
                      value={campaignForm.name}
                      onChange={event => {
                        const value = readValue(event);
                        setCampaignForm(current => ({ ...current, name: value }));
                      }}
                    />

                    <FormControl variant="outlined" size="small">
                      <InputLabel>Conexao</InputLabel>
                      <Select
                        value={campaignForm.whatsappId}
                        onChange={event => {
                          const value = readValue(event);
                          setCampaignForm(current => ({
                            ...current,
                            whatsappId: value,
                            groupIds: []
                          }));
                        }}
                        label="Conexao"
                      >
                        {connections.map(connection => (
                          <MenuItem key={connection.id} value={connection.id}>
                            {connection.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl variant="outlined" size="small">
                      <InputLabel>Template</InputLabel>
                      <Select
                        value={campaignForm.templateId}
                        onChange={event => {
                          const value = readValue(event);
                          setCampaignForm(current => ({
                            ...current,
                            templateId: value
                          }));
                        }}
                        label="Template"
                      >
                        <MenuItem value="">Nenhum</MenuItem>
                        {templates.map(template => (
                          <MenuItem key={template.id} value={template.id}>
                            {template.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl variant="outlined" size="small">
                      <InputLabel>Tipo de conteudo</InputLabel>
                      <Select
                        value={campaignForm.messageType}
                        onChange={event => {
                          const value = readValue(event);
                          setCampaignForm(current => ({
                            ...current,
                            messageType: value,
                            mediaContent: null
                          }));
                        }}
                        label="Tipo de conteudo"
                      >
                        <MenuItem value="text">Texto</MenuItem>
                        <MenuItem value="imagem">Imagem</MenuItem>
                        <MenuItem value="video">Video</MenuItem>
                        <MenuItem value="audio">Audio</MenuItem>
                        <MenuItem value="documento">Documento</MenuItem>
                      </Select>
                    </FormControl>
                    {["imagem", "video", "audio", "documento"].includes(
                      campaignForm.messageType
                    ) ? (
                      <input
                        key={campaignFileKey}
                        type="file"
                        className={classes.fileInput}
                        onChange={event => {
                          const file = readFile(event);
                          setCampaignForm(current => ({
                            ...current,
                            mediaContent: file
                          }));
                        }}
                      />
                    ) : null}

                    <TextField
                      variant="outlined"
                      size="small"
                      label="Mensagem"
                      multiline
                      rows={4}
                      value={campaignForm.message}
                      onChange={event => {
                        const value = readValue(event);
                        setCampaignForm(current => ({ ...current, message: value }));
                      }}
                    />

                    <FormControl variant="outlined" size="small">
                      <InputLabel>Mencionar membros</InputLabel>
                      <Select
                        value={campaignForm.mentionsMode}
                        onChange={event => {
                          const value = readValue(event);
                          setCampaignForm(current => ({
                            ...current,
                            mentionsMode: value
                          }));
                        }}
                        label="Mencionar membros"
                      >
                        <MenuItem value="none">Nao mencionar</MenuItem>
                        <MenuItem value="all">Mencionar todos</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl variant="outlined" size="small">
                      <InputLabel>Grupos alvo</InputLabel>
                      <Select
                        multiple
                        value={campaignForm.groupIds}
                        onChange={event => {
                          const value = readValue(event, []) || [];
                          setCampaignForm(current => ({
                            ...current,
                            groupIds: value
                          }));
                        }}
                        label="Grupos alvo"
                        renderValue={selected => (
                          <Box className={classes.contextChips}>
                            {(selected || []).map(value => (
                              <Chip
                                key={value}
                                size="small"
                                label={
                                  campaignGroups.find(
                                    group =>
                                      Number(group.groupId) === Number(value)
                                  )?.subject || value
                                }
                                className={classes.neutralBadge}
                              />
                            ))}
                          </Box>
                        )}
                      >
                        {campaignGroups.map(group => (
                          <MenuItem key={group.groupId} value={group.groupId}>
                            {group.subject}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box className={classes.filterGrid}>
                      <TextField
                        type="number"
                        variant="outlined"
                        size="small"
                        label="Intervalo entre grupos (segundos)"
                        value={campaignForm.intervalSeconds}
                        onChange={event => {
                          const value = readValue(event);
                          setCampaignForm(current => ({
                            ...current,
                            intervalSeconds: value
                          }));
                        }}
                      />

                      <FormControl variant="outlined" size="small">
                        <InputLabel>Tipo de envio</InputLabel>
                        <Select
                          value={campaignForm.scheduleMode}
                          onChange={event => {
                            const value = readValue(event);
                            setCampaignForm(current => ({
                              ...current,
                              scheduleMode: value
                            }));
                          }}
                          label="Tipo de envio"
                        >
                          <MenuItem value="now">Enviar agora</MenuItem>
                          <MenuItem value="scheduled">Agendar envio</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    {campaignForm.scheduleMode === "scheduled" ? (
                      <Box className={classes.filterGrid}>
                        <TextField
                          type="datetime-local"
                          variant="outlined"
                          size="small"
                          label="Data e hora"
                          InputLabelProps={{ shrink: true }}
                          value={campaignForm.scheduledAt}
                          onChange={event => {
                            const value = readValue(event);
                            setCampaignForm(current => ({
                              ...current,
                              scheduledAt: value
                            }));
                          }}
                        />

                        <FormControl variant="outlined" size="small">
                          <InputLabel>Recorrencia</InputLabel>
                          <Select
                            value={campaignForm.recurrenceRule}
                            onChange={event => {
                              const value = readValue(event);
                              setCampaignForm(current => ({
                                ...current,
                                recurrenceRule: value
                              }));
                            }}
                            label="Recorrencia"
                          >
                            <MenuItem value="none">Unico</MenuItem>
                            <MenuItem value="daily">Diario</MenuItem>
                            <MenuItem value="weekly">Semanal</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    ) : null}

                    <Button
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={createCampaign}
                      className={`${classes.controlButtonBase} ${classes.controlButtonPrimary}`}
                    >
                      Criar campanha
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper elevation={0} className={classes.collectionPanel}>
                  <Box className={classes.collectionPanelHead}>
                    <Typography className={classes.workspacePanelTitle}>
                      Logs da campanha
                    </Typography>
                  </Box>

                  <Box className={classes.logList}>
                    {campaignLogs.map(log => (
                      <Box key={log.id} className={classes.logLine}>
                        <strong>[{log.type}]</strong> {log.message}
                        <br />
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </Box>
                    ))}

                    {!campaignLogs.length ? (
                      <Box className={classes.emptyState}>
                        <AccessTimeIcon className={classes.emptyIcon} />
                        <Typography variant="h6">
                          Nenhum log carregado
                        </Typography>
                        <Typography variant="body2">
                          Selecione uma campanha existente para abrir o historico
                          dos eventos.
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper elevation={0} className={classes.collectionPanel}>
                  <Box className={classes.collectionPanelHead}>
                    <Typography className={classes.workspacePanelTitle}>
                      Campanhas existentes
                    </Typography>
                  </Box>

                  <Box className={classes.collectionList}>
                    {campaigns.map(campaign => (
                      <Box key={campaign.id} className={classes.collectionRow}>
                        <Box className={classes.collectionRowHeader}>
                          <Typography className={classes.collectionRowTitle}>
                            {campaign.name}
                          </Typography>
                          <Typography className={classes.collectionRowMeta}>
                            {safeNumber(campaign.totalGroups)} grupo(s) •{" "}
                            {safeNumber(campaign.successCount)} sucesso •{" "}
                            {safeNumber(campaign.failedCount)} falha(s)
                          </Typography>
                        </Box>

                        <Box className={classes.collectionRowActions}>
                          <Chip
                            size="small"
                            label={campaign.status}
                            className={classes.statusChip}
                            style={{
                              backgroundColor: `${statusBg(campaign.status)}18`,
                              color: statusBg(campaign.status)
                            }}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            className={classes.rowAction}
                            onClick={() => campaignAction(campaign.id, "start")}
                          >
                            Iniciar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            className={classes.rowAction}
                            onClick={() => campaignAction(campaign.id, "pause")}
                          >
                            Pausar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            className={classes.rowAction}
                            onClick={() => campaignAction(campaign.id, "resume")}
                          >
                            Retomar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            className={`${classes.rowAction} ${classes.rowActionDanger}`}
                            onClick={() => campaignAction(campaign.id, "cancel")}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            className={classes.rowAction}
                            onClick={() =>
                              api
                                .get(`/group-management/campaigns/${campaign.id}/logs`)
                                .then(response =>
                                  setCampaignLogs(response.data || [])
                                )
                            }
                          >
                            Logs
                          </Button>
                        </Box>
                      </Box>
                    ))}

                    {!campaigns.length ? (
                      <Box className={classes.emptyState}>
                        <SendIcon className={classes.emptyIcon} />
                        <Typography variant="h6">
                          Nenhuma campanha criada
                        </Typography>
                        <Typography variant="body2">
                          Monte a primeira campanha para preencher a linha do
                          tempo desta operacao.
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          ) : null}

          {!loading && tab === 3
            ? renderSimpleCollection(
                "Agendamentos",
                schedules,
                "name",
                "Nenhum agendamento encontrado."
              )
            : null}

          {!loading && tab === 4 ? (
            <Paper elevation={0} className={classes.collectionPanel}>
              <Box className={classes.collectionPanelHead}>
                <Typography className={classes.workspacePanelTitle}>
                  Templates
                </Typography>
                <Typography className={classes.workspacePanelMeta}>
                  Mantenha modelos reutilizaveis para acelerar novos disparos.
                </Typography>
              </Box>

              <Box className={classes.formGrid}>
                <TextField
                  variant="outlined"
                  size="small"
                  label="Nome do template"
                  value={templateForm.name}
                  onChange={event => {
                    const value = readValue(event);
                    setTemplateForm(current => ({ ...current, name: value }));
                  }}
                />

                <FormControl variant="outlined" size="small">
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={templateForm.messageType}
                    onChange={event => {
                      const value = readValue(event);
                      setTemplateForm(current => ({
                        ...current,
                        messageType: value,
                        mediaContent: null
                      }));
                    }}
                    label="Tipo"
                  >
                    <MenuItem value="text">Texto</MenuItem>
                    <MenuItem value="imagem">Imagem</MenuItem>
                    <MenuItem value="video">Video</MenuItem>
                    <MenuItem value="audio">Audio</MenuItem>
                    <MenuItem value="documento">Documento</MenuItem>
                  </Select>
                </FormControl>

                {["imagem", "video", "audio", "documento"].includes(
                  templateForm.messageType
                ) ? (
                  <input
                    key={templateFileKey}
                    type="file"
                    className={classes.fileInput}
                    onChange={event => {
                      const file = readFile(event);
                      setTemplateForm(current => ({
                        ...current,
                        mediaContent: file
                      }));
                    }}
                  />
                ) : null}

                <TextField
                  variant="outlined"
                  size="small"
                  multiline
                  rows={3}
                  label="Mensagem"
                  value={templateForm.message}
                  onChange={event => {
                    const value = readValue(event);
                    setTemplateForm(current => ({ ...current, message: value }));
                  }}
                />

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={saveTemplate}
                  className={`${classes.controlButtonBase} ${classes.controlButtonPrimary}`}
                >
                  Salvar template
                </Button>
              </Box>

              <Box className={classes.collectionList}>
                {templates.map(template => (
                  <Box key={template.id} className={classes.collectionRow}>
                    <Box className={classes.collectionRowHeader}>
                      <Typography className={classes.collectionRowTitle}>
                        {template.name || "Sem nome"}
                      </Typography>
                      <Typography className={classes.collectionRowMeta}>
                        Tipo: {template.messageType || "text"}
                      </Typography>
                    </Box>

                    <Box className={classes.collectionRowActions}>
                      <Button
                        size="small"
                        variant="outlined"
                        className={`${classes.rowAction} ${classes.rowActionDanger}`}
                        onClick={() =>
                          api
                            .delete(`/group-management/templates/${template.id}`)
                            .then(refreshAll)
                        }
                      >
                        Excluir
                      </Button>
                    </Box>
                  </Box>
                ))}

                {!templates.length ? (
                  <Box className={classes.emptyState}>
                    <DescriptionIcon className={classes.emptyIcon} />
                    <Typography variant="h6">Nenhum template salvo</Typography>
                    <Typography variant="body2">
                      Salve um template para reaproveitar mensagens e midias com
                      menos retrabalho.
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            </Paper>
          ) : null}

          {!loading && tab === 5
            ? renderSimpleCollection(
                "Historico",
                historyLogs,
                "message",
                "Nenhum registro encontrado no historico."
              )
            : null}

          {!loading && tab === 6
            ? renderSimpleCollection(
                "Relatorios",
                reports?.campaigns || [],
                "name",
                "Nenhum relatorio disponivel."
              )
            : null}
        </Box>
      </Box>

      <Dialog
        open={dialogs.batch}
        onClose={() => setDialogs(current => ({ ...current, batch: false }))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Criar grupos em massa</DialogTitle>
        <DialogContent style={{ display: "grid", gap: 12, paddingTop: 8 }}>
          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel>Conexao</InputLabel>
            <Select
              value={batchForm.whatsappId}
              onChange={event => {
                const value = readValue(event);
                setBatchForm(current => ({ ...current, whatsappId: value }));
              }}
              label="Conexao"
            >
              {connections.map(connection => (
                <MenuItem key={connection.id} value={connection.id}>
                  {connection.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            variant="outlined"
            size="small"
            label="Nome base"
            value={batchForm.baseName}
            onChange={event => {
              const value = readValue(event);
              setBatchForm(current => ({ ...current, baseName: value }));
            }}
          />

          <TextField
            variant="outlined"
            size="small"
            type="number"
            label="Quantidade"
            value={batchForm.quantity}
            onChange={event => {
              const value = readValue(event);
              setBatchForm(current => ({ ...current, quantity: value }));
            }}
          />

          <TextField
            variant="outlined"
            size="small"
            label="Participantes iniciais"
            multiline
            rows={4}
            value={batchForm.participants}
            onChange={event => {
              const value = readValue(event);
              setBatchForm(current => ({ ...current, participants: value }));
            }}
            placeholder="Separe por virgula ou quebra de linha"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogs(current => ({ ...current, batch: false }))}>
            Cancelar
          </Button>
          <Button color="primary" variant="contained" onClick={handleBatchCreate}>
            Criar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogs.bulkMembers}
        onClose={() =>
          setDialogs(current => ({ ...current, bulkMembers: false }))
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Adicionar membros em massa</DialogTitle>
        <DialogContent style={{ display: "grid", gap: 12, paddingTop: 8 }}>
          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel>Conexao</InputLabel>
            <Select
              value={
                bulkMembersForm.whatsappId ||
                selectedGroup?.whatsappId ||
                selectedConnection
              }
              onChange={event => {
                const value = readValue(event);
                setBulkMembersForm(current => ({
                  ...current,
                  whatsappId: value,
                  groupId: ""
                }));
              }}
              label="Conexao"
            >
              {connections.map(connection => (
                <MenuItem key={connection.id} value={connection.id}>
                  {connection.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel>Selecionar grupo</InputLabel>
            <Select
              value={bulkMembersForm.groupId || selectedGroup?.groupId || ""}
              onChange={event => {
                const value = readValue(event);
                setBulkMembersForm(current => ({ ...current, groupId: value }));
              }}
              label="Selecionar grupo"
            >
              {groups
                .filter(
                  group =>
                    group.whatsappId ===
                    Number(
                      bulkMembersForm.whatsappId ||
                        selectedGroup?.whatsappId ||
                        selectedConnection
                    )
                )
                .map(group => (
                  <MenuItem key={group.groupId} value={group.groupId}>
                    {group.subject}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel>Estrategia</InputLabel>
            <Select
              value={bulkMembersForm.strategy}
              onChange={event => {
                const value = readValue(event);
                setBulkMembersForm(current => ({ ...current, strategy: value }));
              }}
              label="Estrategia"
            >
              <MenuItem value="round_robin">Distribuir entre grupos</MenuItem>
              <MenuItem value="all">Adicionar em todos os grupos</MenuItem>
            </Select>
          </FormControl>

          <TextField
            variant="outlined"
            size="small"
            label="Contatos"
            multiline
            rows={6}
            value={bulkMembersForm.members}
            onChange={event => {
              const value = readValue(event);
              setBulkMembersForm(current => ({ ...current, members: value }));
            }}
            placeholder={"5511999999999\n5511888888888"}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDialogs(current => ({ ...current, bulkMembers: false }))
            }
          >
            Cancelar
          </Button>
          <Button color="primary" variant="contained" onClick={handleBulkMembers}>
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogs.description}
        onClose={() =>
          setDialogs(current => ({ ...current, description: false }))
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Editar descricao do grupo</DialogTitle>
        <DialogContent style={{ paddingTop: 8 }}>
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            multiline
            rows={5}
            label="Descricao"
            value={description}
            onChange={event => setDescription(readValue(event))}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDialogs(current => ({ ...current, description: false }))
            }
          >
            Cancelar
          </Button>
          <Button color="primary" variant="contained" onClick={handleDescription}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogs.picture}
        onClose={() => setDialogs(current => ({ ...current, picture: false }))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Alterar foto do grupo</DialogTitle>
        <DialogContent style={{ display: "grid", gap: 12, paddingTop: 8 }}>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={event => setPictureFile(readFile(event))}
          />
          <Typography style={{ fontSize: 12, color: "#64748b" }}>
            Formatos permitidos: JPG e PNG. Tamanho recomendado ate 2 MB e
            dimensao proxima de 640x640.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDialogs(current => ({ ...current, picture: false }))}
          >
            Cancelar
          </Button>
          <Button color="primary" variant="contained" onClick={handlePicture}>
            Salvar foto
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
