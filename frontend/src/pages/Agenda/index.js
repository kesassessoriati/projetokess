import React, { useState, useEffect, useCallback } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  makeStyles,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import ArrowForwardIcon from "@material-ui/icons/ArrowForward";
import CalendarTodayIcon from "@material-ui/icons/CalendarToday";
import CancelIcon from "@material-ui/icons/Cancel";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import EditIcon from "@material-ui/icons/Edit";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import EventIcon from "@material-ui/icons/Event";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import PersonIcon from "@material-ui/icons/Person";
import BuildIcon from "@material-ui/icons/Build";
import ListIcon from "@material-ui/icons/List";
import ListAltIcon from "@material-ui/icons/ListAlt";
import SyncIcon from "@material-ui/icons/Sync";
import AssignmentTurnedInIcon from "@material-ui/icons/AssignmentTurnedIn";
import DeleteIcon from "@material-ui/icons/Delete";
import FilterListIcon from "@material-ui/icons/FilterList";
import RefreshIcon from "@material-ui/icons/Refresh";
import TrendingUpIcon from "@material-ui/icons/TrendingUp";
import TodayIcon from "@material-ui/icons/Today";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import dateFnsFormat from "date-fns/format";
import dateFnsParse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import {
  listAppointments,
  syncGoogleCalendarAppointments,
  deleteAppointment,
  updateAppointment
} from "../../services/userScheduleService";
import ConfirmationModal from "../../components/ConfirmationModal";
import AppointmentModal from "../../components/AppointmentModal";
import toastError from "../../errors/toastError";
import useSafeApi from "../../hooks/useSafeApi";

const locales = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({
  format: dateFnsFormat,
  parse: dateFnsParse,
  startOfWeek: date => startOfWeek(date, { locale: ptBR }),
  getDay,
  locales
});

const calendarMessages = {
  allDay: "Dia inteiro",
  previous: "Anterior",
  next: "Próximo",
  today: "Hoje",
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Agenda",
  date: "Data",
  time: "Horário",
  event: "Compromisso",
  noEventsInRange: "Nenhum compromisso neste período.",
  showMore: total => `+${total} mais`
};

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    padding: theme.spacing(3),
    gap: theme.spacing(3),
    background:
      "radial-gradient(circle at top left, rgba(37,99,235,0.12), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    overflowY: "auto",
    overflowX: "hidden",
    ...theme.scrollbarStyles,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2)
    }
  },
  overviewShell: {
    position: "relative",
    padding: theme.spacing(3.25),
    borderRadius: 32,
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
      inset: "auto auto -120px -110px",
      width: 300,
      height: 300,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.08)"
    },
    "&:after": {
      content: '""',
      position: "absolute",
      inset: "24px -72px auto auto",
      width: 220,
      height: 220,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.06)"
    }
  },
  overviewTop: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.75fr)",
    gap: theme.spacing(2.5),
    alignItems: "stretch",
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "1fr"
    }
  },
  heroPane: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2.25)
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
    fontSize: 44,
    lineHeight: 1.02,
    letterSpacing: "-0.04em",
    fontWeight: 800,
    color: "#ffffff",
    maxWidth: 760,
    [theme.breakpoints.down("md")]: {
      fontSize: 36
    },
    [theme.breakpoints.down("sm")]: {
      fontSize: 30
    }
  },
  heroSubtitle: {
    maxWidth: 720,
    color: "rgba(219, 234, 254, 0.92)",
    fontSize: 15,
    lineHeight: 1.55
  },
  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1.5)
  },
  primaryAction: {
    borderRadius: 16,
    padding: theme.spacing(1.25, 2.4),
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "#020617",
    boxShadow: "0 16px 28px rgba(2, 6, 23, 0.38)",
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
    borderRadius: 16,
    padding: theme.spacing(1.15, 2.1),
    color: "#fff",
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
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
    gap: theme.spacing(1)
  },
  heroSupportChip: {
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    color: "#dbeafe",
    border: "1px solid rgba(255,255,255,0.12)",
    fontWeight: 700
  },
  summaryColumn: {
    display: "grid",
    gap: theme.spacing(1.5)
  },
  summaryCard: {
    position: "relative",
    padding: theme.spacing(2.25),
    borderRadius: 24,
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(14px)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)"
  },
  summaryCardPrimary: {
    minHeight: 184,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between"
  },
  summaryMiniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: theme.spacing(1.5),
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr"
    }
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "rgba(219, 234, 254, 0.86)"
  },
  summaryValue: {
    marginTop: theme.spacing(1),
    fontSize: 42,
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: "-0.05em",
    overflowWrap: "anywhere",
    [theme.breakpoints.down("sm")]: {
      fontSize: 34
    }
  },
  summaryDescription: {
    marginTop: theme.spacing(1),
    color: "rgba(226, 232, 240, 0.9)",
    lineHeight: 1.5
  },
  summaryMiniValue: {
    marginTop: theme.spacing(1),
    fontSize: 30,
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
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(2.5)
  },
  statCard: {
    padding: theme.spacing(2),
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
  contextGrid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.75fr)",
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(2.5),
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "1fr"
    }
  },
  panel: {
    padding: theme.spacing(2.25),
    borderRadius: 24,
    border: "1px solid rgba(226,232,240,0.58)",
    boxShadow: "0 16px 30px rgba(15, 23, 42, 0.12)"
  },
  filterPanel: {
    background: "rgba(255,255,255,0.97)"
  },
  quickPanel: {
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.88) 100%)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    boxShadow: "0 18px 34px rgba(15, 23, 42, 0.18)"
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(2),
    flexWrap: "wrap",
    marginBottom: theme.spacing(2)
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
    background: "linear-gradient(135deg, rgba(37,99,235,0.14), rgba(59,130,246,0.24))",
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
  quickPanelTitle: {
    color: "#ffffff"
  },
  quickPanelSubtitle: {
    color: "rgba(226,232,240,0.76)"
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
    gap: theme.spacing(1.5)
  },
  quickFactsList: {
    display: "grid",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5)
  },
  quickFactItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.25, 1.5),
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)"
  },
  quickFactLabel: {
    color: "rgba(226, 232, 240, 0.86)",
    fontSize: 13
  },
  quickFactValue: {
    fontWeight: 800,
    color: "#fff",
    textAlign: "right"
  },
  rankingBlock: {
    marginTop: theme.spacing(2)
  },
  rankingTitle: {
    fontSize: 13,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "rgba(191, 219, 254, 0.92)"
  },
  rankingList: {
    display: "grid",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  rankingItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.2, 1.4),
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)"
  },
  rankingItemLead: {
    background:
      "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.12))"
  },
  rankingLeft: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  rankingIndex: {
    minWidth: 24,
    fontSize: 13,
    fontWeight: 800,
    color: "rgba(191, 219, 254, 0.92)"
  },
  rankingName: {
    fontWeight: 700,
    color: "#ffffff"
  },
  rankingValue: {
    fontWeight: 800,
    color: "#ffffff"
  },
  contentShell: {
    padding: theme.spacing(2.5),
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
    flexWrap: "wrap"
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
    lineHeight: 1.45
  },
  viewToggle: {
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 14px 26px rgba(15, 23, 42, 0.08)",
    "& .MuiButton-root": {
      borderRadius: 0,
      padding: theme.spacing(1.1, 1.8),
      fontWeight: 700,
      textTransform: "none"
    }
  },
  summaryStrip: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2)
  },
  neutralChip: {
    borderRadius: 999,
    fontWeight: 700,
    background: "#e2e8f0",
    color: "#334155"
  },
  inlineLoader: {
    marginTop: theme.spacing(2),
    overflow: "hidden",
    borderRadius: 999
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1),
    textAlign: "center",
    minHeight: 320,
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
  tableWrap: {
    marginTop: theme.spacing(2)
  },
  tableContainer: {
    borderRadius: 22,
    border: "1px solid rgba(148,163,184,0.16)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)"
  },
  desktopTable: {
    [theme.breakpoints.down("sm")]: {
      display: "none"
    }
  },
  tableHead: {
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)"
  },
  tableHeadCell: {
    fontWeight: 800,
    color: "#334155",
    borderBottom: "1px solid rgba(148,163,184,0.16)",
    whiteSpace: "nowrap"
  },
  tableRow: {
    transition: "background-color 0.2s ease, transform 0.2s ease",
    "& td": {
      borderBottom: "1px solid rgba(226,232,240,0.9)"
    },
    "&:hover": {
      backgroundColor: "rgba(37,99,235,0.04)"
    }
  },
  upcomingEventRow: {
    "& td:first-child": {
      borderLeft: "4px solid #10b981"
    }
  },
  appointmentInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  appointmentTitleRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  appointmentTitle: {
    fontWeight: 800,
    fontSize: 15,
    color: "#0f172a"
  },
  appointmentDescription: {
    color: "#64748b",
    maxWidth: 420,
    lineHeight: 1.45
  },
  appointmentMeta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "#475569",
    fontSize: 13,
    fontWeight: 600
  },
  statusChip: {
    borderRadius: 999,
    fontWeight: 800,
    minWidth: 118
  },
  actionsBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid rgba(148,163,184,0.18)",
    "&:hover": {
      background: "#eff6ff"
    }
  },
  actionButtonPositive: {
    color: "#047857"
  },
  actionButtonNegative: {
    color: "#b91c1c"
  },
  actionButtonNeutral: {
    color: "#334155"
  },
  upcomingChip: {
    borderRadius: 999,
    background: "#dcfce7",
    color: "#047857",
    fontWeight: 800
  },
  mobileCards: {
    display: "none",
    [theme.breakpoints.down("sm")]: {
      display: "grid",
      gap: theme.spacing(1.5)
    }
  },
  mobileCard: {
    padding: theme.spacing(1.75),
    borderRadius: 20,
    border: "1px solid rgba(148,163,184,0.16)",
    boxShadow: "0 14px 24px rgba(15, 23, 42, 0.06)"
  },
  mobileCardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(1.25)
  },
  mobileMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5)
  },
  mobileMetaItem: {
    display: "grid",
    gap: 4,
    padding: theme.spacing(1),
    borderRadius: 14,
    background: "#f8fafc"
  },
  mobileMetaLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: 800,
    color: "#64748b"
  },
  mobileMetaValue: {
    fontWeight: 700,
    color: "#0f172a",
    fontSize: 13
  },
  mobileActions: {
    marginTop: theme.spacing(1.5),
    display: "flex",
    justifyContent: "flex-end"
  },
  calendarWrapper: {
    marginTop: theme.spacing(2),
    minHeight: 640,
    padding: theme.spacing(2),
    borderRadius: 24,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.95))",
    border: "1px solid rgba(148,163,184,0.16)",
    "& .rbc-calendar": {
      minHeight: 600,
      height: "100%",
      fontFamily: theme.typography.fontFamily
    },
    "& .rbc-toolbar": {
      marginBottom: theme.spacing(2),
      gap: theme.spacing(1)
    },
    "& .rbc-toolbar button": {
      borderRadius: 12,
      borderColor: "#cbd5e1",
      color: "#334155",
      fontWeight: 700
    },
    "& .rbc-toolbar button.rbc-active": {
      background: "#1d4ed8",
      color: "#fff",
      borderColor: "#1d4ed8",
      boxShadow: "0 10px 22px rgba(29,78,216,0.2)"
    },
    "& .rbc-month-view, & .rbc-time-view, & .rbc-agenda-view table": {
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid #e2e8f0"
    },
    "& .rbc-header": {
      padding: "12px 8px",
      fontWeight: 800,
      color: "#334155",
      background: "#f8fafc",
      borderBottom: "1px solid #e2e8f0"
    },
    "& .rbc-date-cell": {
      padding: "6px 8px",
      color: "#475569",
      fontWeight: 700
    },
    "& .rbc-today": {
      backgroundColor: "rgba(37,99,235,0.08)"
    },
    "& .rbc-event": {
      borderRadius: 10,
      border: "none",
      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)"
    },
    "& .rbc-off-range-bg": {
      background: "#f8fafc"
    }
  }
}));

const statusColors = {
  scheduled: {
    bg: "#3b82f6",
    label: "Agendado",
    soft: "#dbeafe",
    text: "#1d4ed8"
  },
  confirmed: {
    bg: "#059669",
    label: "Confirmado",
    soft: "#d1fae5",
    text: "#047857"
  },
  completed: {
    bg: "#64748b",
    label: "Concluído",
    soft: "#e2e8f0",
    text: "#334155"
  },
  cancelled: {
    bg: "#ef4444",
    label: "Cancelado",
    soft: "#fee2e2",
    text: "#b91c1c"
  },
  no_show: {
    bg: "#f59e0b",
    label: "Não compareceu",
    soft: "#fef3c7",
    text: "#b45309"
  }
};

const statDefs = [
  { key: "total", label: "Total", color: "#6366f1", icon: <ListAltIcon style={{ fontSize: 28 }} /> },
  { key: "scheduled", label: "Agendados", color: "#3b82f6", icon: <EventAvailableIcon style={{ fontSize: 28 }} /> },
  { key: "confirmed", label: "Confirmados", color: "#059669", icon: <AssignmentTurnedInIcon style={{ fontSize: 28 }} /> },
  { key: "completed", label: "Concluídos", color: "#64748b", icon: <DoneAllIcon style={{ fontSize: 28 }} /> },
  { key: "cancelled", label: "Cancelados", color: "#ef4444", icon: <ErrorOutlineIcon style={{ fontSize: 28 }} /> },
  { key: "no_show", label: "Não compareceu", color: "#f59e0b", icon: <CancelIcon style={{ fontSize: 28 }} /> }
];

const Agenda = () => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();

  const [viewMode, setViewMode] = useState("list");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [filters, setFilters] = useState({
    scheduleId: "",
    status: "",
    startDate: "",
    endDate: ""
  });
  const [appointmentData, setAppointmentData] = useState({ appointments: [] });
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [errorAppointments, setErrorAppointments] = useState(null);
  const [metricsByUser, setMetricsByUser] = useState([]);

  const { data: schedulesData } = useSafeApi("/user-schedules", { manual: false });

  const appointments = appointmentData?.appointments || [];
  const schedules = schedulesData?.schedules || [];

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter(item => item.status === "scheduled").length,
    confirmed: appointments.filter(item => item.status === "confirmed").length,
    completed: appointments.filter(item => item.status === "completed").length,
    cancelled: appointments.filter(item => item.status === "cancelled").length,
    no_show: appointments.filter(item => item.status === "no_show").length
  };

  const nextAppointment = [...appointments]
    .filter(
      item =>
        item.startDatetime &&
        new Date(item.startDatetime) >= new Date() &&
        item.status !== "cancelled"
    )
    .sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime))[0];

  const selectedScheduleName =
    schedules.find(item => String(item.id) === String(filters.scheduleId))?.name ||
    "Todas as agendas";

  const completionRate = stats.total
    ? Math.round(((stats.confirmed + stats.completed) / stats.total) * 100)
    : 0;

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const appointmentsToday = appointments.filter(item => {
    if (!item.startDatetime || item.status === "cancelled") return false;
    try {
      return format(parseISO(item.startDatetime), "yyyy-MM-dd") === todayKey;
    } catch (error) {
      return false;
    }
  }).length;

  const activePipelineCount = stats.scheduled + stats.confirmed;

  const calendarEvents = appointments.map(item => ({
    title: item.title,
    start: new Date(item.startDatetime),
    end: new Date(
      new Date(item.startDatetime).getTime() + (item.durationMinutes || 60) * 60000
    ),
    resource: item
  }));

  useEffect(() => {
    if (!location?.search) return;

    const queryParams = new URLSearchParams(location.search);
    const scheduleIdParam = queryParams.get("scheduleId");

    if (scheduleIdParam) {
      setFilters(prev => ({ ...prev, scheduleId: scheduleIdParam }));
    }
  }, [location]);

  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    setErrorAppointments(null);

    try {
      const params = {};
      if (filters.scheduleId) params.scheduleId = filters.scheduleId;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const data = await listAppointments(params);
      setAppointmentData(data);
      setMetricsByUser(data.metricsByUser || []);
    } catch (err) {
      setErrorAppointments(err);
      toastError(err);
    } finally {
      setLoadingAppointments(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleFilterChange = field => event => {
    setFilters(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleResetFilters = () => {
    setFilters({
      scheduleId: "",
      status: "",
      startDate: "",
      endDate: ""
    });
  };

  const handleOpenModal = (appointment = null) => {
    setSelectedAppointment(appointment);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleDelete = async () => {
    try {
      await deleteAppointment(selectedAppointment.id);
      toast.success("Compromisso excluído com sucesso");
      setConfirmModalOpen(false);
      setSelectedAppointment(null);
      fetchAppointments();
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenDeleteModal = appointment => {
    setSelectedAppointment(appointment);
    setConfirmModalOpen(true);
  };

  const handleStatusChange = async (appointment, newStatus) => {
    try {
      await updateAppointment(appointment.id, { status: newStatus });
      toast.success("Status atualizado");
      fetchAppointments();
    } catch (err) {
      toastError(err);
    }
  };

  const handleCalendarEventClick = event => {
    handleOpenModal(event.resource);
  };

  const handleCalendarSlotSelect = () => {
    setSelectedAppointment(null);
    setModalOpen(true);
  };

  const handleSyncGoogleCalendar = async () => {
    setSyncingCalendar(true);

    try {
      const result = await syncGoogleCalendarAppointments();
      const { imported, updated, errors } = result;

      if (errors?.length) {
        toast.warning(
          `Sincronização concluída com alertas: ${imported} importado(s), ${updated} atualizado(s).`
        );
      } else {
        toast.success(
          `Calendário sincronizado: ${imported} importado(s), ${updated} atualizado(s).`
        );
      }

      fetchAppointments();
    } catch (err) {
      toastError(err);
    } finally {
      setSyncingCalendar(false);
    }
  };

  const formatDateTime = dateStr => {
    if (!dateStr) return "-";

    try {
      return format(parseISO(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch (error) {
      return dateStr;
    }
  };

  const formatDuration = minutes => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const eventStyleGetter = event => {
    const status = event.resource?.status || "scheduled";
    const color = statusColors[status]?.bg || "#3b82f6";

    return {
      style: {
        backgroundColor: color,
        borderColor: color,
        color: "#fff",
        borderRadius: 10
      }
    };
  };

  const contextChips = [
    selectedScheduleName,
    filters.status ? statusColors[filters.status]?.label || filters.status : "Todos os status",
    filters.startDate || filters.endDate ? "Período personalizado" : "Sem recorte por data"
  ];

  const quickFacts = [
    { label: "Agenda em foco", value: selectedScheduleName },
    {
      label: "Filtros ativos",
      value: activeFiltersCount ? `${activeFiltersCount} aplicado(s)` : "Nenhum"
    },
    { label: "Hoje", value: `${appointmentsToday} compromisso(s)` },
    {
      label: "Próximo compromisso",
      value: nextAppointment ? formatDateTime(nextAppointment.startDatetime) : "Sem agenda"
    }
  ];

  const summaryChips = [
    `${appointments.length} item(ns)`,
    `${stats.scheduled} agendado(s)`,
    `${stats.confirmed} confirmado(s)`,
    `${appointmentsToday} hoje`
  ];

  const renderAppointmentActions = appointment => (
    <Box className={classes.actionsBox}>
      {appointment.status === "scheduled" && (
        <Tooltip title="Confirmar">
          <IconButton
            size="small"
            className={`${classes.actionButton} ${classes.actionButtonPositive}`}
            onClick={() => handleStatusChange(appointment, "confirmed")}
          >
            <CheckCircleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
        <Tooltip title="Cancelar">
          <IconButton
            size="small"
            className={`${classes.actionButton} ${classes.actionButtonNegative}`}
            onClick={() => handleStatusChange(appointment, "cancelled")}
          >
            <CancelIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Editar">
        <IconButton
          size="small"
          className={`${classes.actionButton} ${classes.actionButtonNeutral}`}
          onClick={() => handleOpenModal(appointment)}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Excluir">
        <IconButton
          size="small"
          className={`${classes.actionButton} ${classes.actionButtonNegative}`}
          onClick={() => handleOpenDeleteModal(appointment)}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const renderListView = records => (
    <Box className={classes.tableWrap}>
      <TableContainer
        component={Paper}
        className={`${classes.tableContainer} ${classes.desktopTable}`}
      >
        <Table>
          <TableHead className={classes.tableHead}>
            <TableRow>
              <TableCell className={classes.tableHeadCell}>Compromisso</TableCell>
              <TableCell className={classes.tableHeadCell}>Agenda</TableCell>
              <TableCell className={classes.tableHeadCell}>Data e hora</TableCell>
              <TableCell className={classes.tableHeadCell}>Duração</TableCell>
              <TableCell className={classes.tableHeadCell}>Serviço</TableCell>
              <TableCell className={classes.tableHeadCell}>Status</TableCell>
              <TableCell className={classes.tableHeadCell} align="center">
                Ações
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map(appointment => {
              const status = statusColors[appointment.status] || {
                bg: "#64748b",
                soft: "#e2e8f0",
                text: "#334155",
                label: appointment.status
              };
              const isUpcoming =
                appointment.status === "scheduled" &&
                new Date(appointment.startDatetime) > new Date();

              return (
                <TableRow
                  key={appointment.id}
                  className={`${classes.tableRow} ${
                    isUpcoming ? classes.upcomingEventRow : ""
                  }`}
                >
                  <TableCell>
                    <Box className={classes.appointmentInfo}>
                      <Box className={classes.appointmentTitleRow}>
                        <Typography className={classes.appointmentTitle}>
                          {appointment.title}
                        </Typography>
                        {isUpcoming && (
                          <Chip
                            size="small"
                            label="Próximo"
                            className={classes.upcomingChip}
                          />
                        )}
                        {appointment.source === "google_calendar" && (
                          <Tooltip title="Importado do Google Calendar">
                            <img
                              src="https://www.gstatic.com/images/branding/product/1x/calendar_16dp.png"
                              alt="Google Calendar"
                              style={{ width: 14, height: 14, flexShrink: 0 }}
                            />
                          </Tooltip>
                        )}
                      </Box>

                      {appointment.description && (
                        <Typography
                          variant="body2"
                          className={classes.appointmentDescription}
                        >
                          {appointment.description.substring(0, 90)}
                          {appointment.description.length > 90 ? "..." : ""}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Box className={classes.appointmentMeta}>
                      <PersonIcon fontSize="small" />
                      {appointment.schedule?.name || "-"}
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Box className={classes.appointmentMeta}>
                      <EventIcon fontSize="small" />
                      {formatDateTime(appointment.startDatetime)}
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Box className={classes.appointmentMeta}>
                      <AccessTimeIcon fontSize="small" />
                      {formatDuration(appointment.durationMinutes)}
                    </Box>
                  </TableCell>

                  <TableCell>
                    {appointment.service ? (
                      <Box className={classes.appointmentMeta}>
                        <BuildIcon fontSize="small" />
                        {appointment.service.nome}
                      </Box>
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={status.label}
                      size="small"
                      className={classes.statusChip}
                      style={{
                        backgroundColor: status.soft,
                        color: status.text
                      }}
                    />
                  </TableCell>

                  <TableCell align="center">
                    {renderAppointmentActions(appointment)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box className={classes.mobileCards}>
        {records.map(appointment => {
          const status = statusColors[appointment.status] || {
            bg: "#64748b",
            soft: "#e2e8f0",
            text: "#334155",
            label: appointment.status
          };

          return (
            <Paper key={appointment.id} elevation={0} className={classes.mobileCard}>
              <Box className={classes.mobileCardHeader}>
                <Box>
                  <Typography className={classes.appointmentTitle}>
                    {appointment.title}
                  </Typography>
                  {appointment.description && (
                    <Typography variant="body2" className={classes.appointmentDescription}>
                      {appointment.description.substring(0, 80)}
                      {appointment.description.length > 80 ? "..." : ""}
                    </Typography>
                  )}
                </Box>

                <Chip
                  size="small"
                  label={status.label}
                  className={classes.statusChip}
                  style={{
                    backgroundColor: status.soft,
                    color: status.text
                  }}
                />
              </Box>

              <Box className={classes.mobileMetaGrid}>
                <Box className={classes.mobileMetaItem}>
                  <Typography className={classes.mobileMetaLabel}>Agenda</Typography>
                  <Typography className={classes.mobileMetaValue}>
                    {appointment.schedule?.name || "-"}
                  </Typography>
                </Box>

                <Box className={classes.mobileMetaItem}>
                  <Typography className={classes.mobileMetaLabel}>Data e hora</Typography>
                  <Typography className={classes.mobileMetaValue}>
                    {formatDateTime(appointment.startDatetime)}
                  </Typography>
                </Box>

                <Box className={classes.mobileMetaItem}>
                  <Typography className={classes.mobileMetaLabel}>Duração</Typography>
                  <Typography className={classes.mobileMetaValue}>
                    {formatDuration(appointment.durationMinutes)}
                  </Typography>
                </Box>

                <Box className={classes.mobileMetaItem}>
                  <Typography className={classes.mobileMetaLabel}>Serviço</Typography>
                  <Typography className={classes.mobileMetaValue}>
                    {appointment.service?.nome || "-"}
                  </Typography>
                </Box>
              </Box>

              <Box className={classes.mobileActions}>{renderAppointmentActions(appointment)}</Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <Box className={classes.root}>
      <Box className={classes.overviewShell}>
        <Box className={classes.overviewTop}>
          <Box className={classes.heroPane}>
            <Chip className={classes.pageBadge} label="Compromissos" />

            <Box>
              <Typography className={classes.heroTitle}>
                Visual mais claro, ações mais rápidas e agenda conectada.
              </Typography>
              <Typography className={classes.heroSubtitle}>
                Gerencie compromissos com mais contraste, leitura melhor da agenda e
                navegação direta entre lista de compromissos e página de agendas.
              </Typography>
            </Box>

            <Box className={classes.heroActions}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenModal()}
                className={classes.primaryAction}
              >
                Novo Compromisso
              </Button>

              <Button
                variant="outlined"
                startIcon={
                  syncingCalendar ? (
                    <CircularProgress size={16} style={{ color: "#fff" }} />
                  ) : (
                    <SyncIcon />
                  )
                }
                onClick={handleSyncGoogleCalendar}
                disabled={syncingCalendar}
                className={classes.secondaryAction}
              >
                {syncingCalendar ? "Sincronizando..." : "Sincronizar"}
              </Button>

              <Button
                variant="outlined"
                startIcon={<CalendarTodayIcon />}
                endIcon={<ArrowForwardIcon />}
                onClick={() => history.push("/agendas")}
                className={classes.secondaryAction}
              >
                Agenda
              </Button>
            </Box>

            <Box className={classes.heroSupportRow}>
              <Chip
                className={classes.heroSupportChip}
                label={`${stats.total} item(ns) carregado(s)`}
              />
              <Chip
                className={classes.heroSupportChip}
                label={`${activePipelineCount} em andamento`}
              />
              <Chip
                className={classes.heroSupportChip}
                label={`${appointmentsToday} compromisso(s) hoje`}
              />
            </Box>
          </Box>

          <Box className={classes.summaryColumn}>
            <Paper
              elevation={0}
              className={`${classes.summaryCard} ${classes.summaryCardPrimary}`}
            >
              <Box>
                <Typography className={classes.summaryLabel}>Próximo compromisso</Typography>
                <Typography className={classes.summaryValue}>
                  {nextAppointment ? formatDateTime(nextAppointment.startDatetime) : "Sem agenda"}
                </Typography>
              </Box>

              <Typography className={classes.summaryDescription}>
                {nextAppointment
                  ? `${nextAppointment.title} • ${nextAppointment.schedule?.name || "Agenda não definida"}`
                  : "Crie um novo compromisso para começar a organizar o fluxo."}
              </Typography>
            </Paper>

            <Box className={classes.summaryMiniGrid}>
              <Paper elevation={0} className={classes.summaryCard}>
                <Typography className={classes.summaryLabel}>Saúde da operação</Typography>
                <Typography className={classes.summaryMiniValue}>
                  {completionRate}%
                </Typography>
                <Typography className={classes.summaryMiniDescription}>
                  Confirmados e concluídos em relação ao total visível.
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={completionRate}
                  className={classes.highlightProgress}
                />
              </Paper>

              <Paper elevation={0} className={classes.summaryCard}>
                <Typography className={classes.summaryLabel}>Carga do time</Typography>
                <Typography className={classes.summaryMiniValue}>
                  {activePipelineCount}
                </Typography>
                <Typography className={classes.summaryMiniDescription}>
                  Compromissos agendados e confirmados que ainda exigem ação.
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Box>

        <Box className={classes.statsRow}>
          {statDefs.map(({ key, label, color, icon }) => (
            <Paper key={key} elevation={0} className={classes.statCard}>
              <Box className={classes.statCardTop}>
                <Box>
                  <Typography className={classes.statLabel}>{label}</Typography>
                  <Typography className={classes.statValue} style={{ color }}>
                    {stats[key]}
                  </Typography>
                </Box>

                <Box
                  className={classes.statIconBox}
                  style={{ color, backgroundColor: `${color}18` }}
                >
                  {icon}
                </Box>
              </Box>

              <Divider />

              <Typography className={classes.statFooter}>
                {key === "total"
                  ? "Volume total carregado no contexto atual."
                  : "Status monitorado para melhorar a priorização do time."}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Box className={classes.contextGrid}>
          <Paper elevation={0} className={`${classes.panel} ${classes.filterPanel}`}>
            <Box className={classes.panelHeader}>
              <Box className={classes.panelTitleWrap}>
                <Box className={classes.panelIconWrap}>
                  <FilterListIcon />
                </Box>

                <Box>
                  <Typography className={classes.panelTitle}>Filtros e contexto</Typography>
                  <Typography className={classes.panelSubtitle}>
                    Refine a leitura da lista, foque o contexto certo e encontre
                    compromissos mais rápido.
                  </Typography>
                </Box>
              </Box>

              <Box className={classes.filterActions}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleResetFilters}
                >
                  Limpar
                </Button>
                <Button
                  variant="text"
                  size="small"
                  color="primary"
                  onClick={fetchAppointments}
                >
                  Atualizar
                </Button>
              </Box>
            </Box>

            <Box className={classes.contextChips}>
              {contextChips.map(item => (
                <Chip key={item} label={item} className={classes.contextChip} />
              ))}
            </Box>

            <Box className={classes.filterGrid}>
              <FormControl variant="outlined" size="small">
                <InputLabel>Agenda</InputLabel>
                <Select
                  value={filters.scheduleId}
                  onChange={handleFilterChange("scheduleId")}
                  label="Agenda"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {schedules.map(schedule => (
                    <MenuItem key={schedule.id} value={schedule.id}>
                      {schedule.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl variant="outlined" size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={handleFilterChange("status")}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {Object.entries(statusColors).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                type="date"
                label="Data inicial"
                variant="outlined"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filters.startDate}
                onChange={handleFilterChange("startDate")}
              />

              <TextField
                type="date"
                label="Data final"
                variant="outlined"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filters.endDate}
                onChange={handleFilterChange("endDate")}
              />
            </Box>
          </Paper>
          <Paper elevation={0} className={`${classes.panel} ${classes.quickPanel}`}>
            <Box className={classes.panelHeader}>
              <Box>
                <Typography className={`${classes.panelTitle} ${classes.quickPanelTitle}`}>
                  Resumo rápido
                </Typography>
                <Typography
                  className={`${classes.panelSubtitle} ${classes.quickPanelSubtitle}`}
                >
                  Leitura de operação e contexto sem sair da tela.
                </Typography>
              </Box>
            </Box>

            <Box className={classes.quickFactsList}>
              {quickFacts.map(item => (
                <Box key={item.label} className={classes.quickFactItem}>
                  <Typography className={classes.quickFactLabel}>{item.label}</Typography>
                  <Typography className={classes.quickFactValue}>{item.value}</Typography>
                </Box>
              ))}
            </Box>

            {metricsByUser.length > 1 && (
              <Box className={classes.rankingBlock}>
                <Typography className={classes.rankingTitle}>
                  Compromissos por usuário
                </Typography>

                <Box className={classes.rankingList}>
                  {metricsByUser.slice(0, 4).map((item, index) => (
                    <Box
                      key={item.userId}
                      className={`${classes.rankingItem} ${
                        index === 0 ? classes.rankingItemLead : ""
                      }`}
                    >
                      <Box className={classes.rankingLeft}>
                        <Typography className={classes.rankingIndex}>
                          #{index + 1}
                        </Typography>
                        <Typography className={classes.rankingName}>
                          {item.userName}
                        </Typography>
                      </Box>

                      <Typography className={classes.rankingValue}>{item.count}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      <Box className={classes.contentShell}>
        <Box className={classes.contentHeader}>
          <Box>
            <Typography className={classes.sectionTitle}>
              {viewMode === "calendar" ? "Visão de calendário" : "Lista de compromissos"}
            </Typography>
            <Typography className={classes.sectionDescription}>
              {appointments.length} compromisso(s) encontrado(s) no contexto atual.
            </Typography>
          </Box>

          <ButtonGroup size="small" className={classes.viewToggle} variant="outlined">
            <Button
              color={viewMode === "list" ? "primary" : "default"}
              variant={viewMode === "list" ? "contained" : "outlined"}
              startIcon={<ListIcon />}
              onClick={() => setViewMode("list")}
            >
              Lista
            </Button>
            <Button
              color={viewMode === "calendar" ? "primary" : "default"}
              variant={viewMode === "calendar" ? "contained" : "outlined"}
              startIcon={<TodayIcon />}
              onClick={() => setViewMode("calendar")}
            >
              Calendário
            </Button>
            <Button
              variant="outlined"
              startIcon={<CalendarTodayIcon />}
              onClick={() => history.push("/agendas")}
            >
              Agenda
            </Button>
          </ButtonGroup>
        </Box>

        <Box className={classes.summaryStrip}>
          {summaryChips.map(item => (
            <Chip key={item} label={item} className={classes.neutralChip} />
          ))}
        </Box>

        {loadingAppointments && appointments.length > 0 && (
          <Box className={classes.inlineLoader}>
            <LinearProgress />
          </Box>
        )}

        {loadingAppointments && appointments.length === 0 ? (
          <Box className={classes.loadingContainer}>
            <CircularProgress />
          </Box>
        ) : viewMode === "calendar" ? (
          <Box className={classes.calendarWrapper}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              culture="pt-BR"
              messages={calendarMessages}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "calc(100vh - 360px)", minHeight: 600 }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleCalendarEventClick}
              onSelectSlot={handleCalendarSlotSelect}
              selectable
              popup
              defaultView="month"
              views={["month", "week", "day", "agenda"]}
              formats={{
                agendaHeaderFormat: ({ start, end }) =>
                  `${dateFnsFormat(start, "dd/MM/yyyy", { locale: ptBR })} - ${dateFnsFormat(
                    end,
                    "dd/MM/yyyy",
                    { locale: ptBR }
                  )}`,
                dayHeaderFormat: date =>
                  dateFnsFormat(date, "EEEE, dd/MM/yyyy", { locale: ptBR }),
                monthHeaderFormat: date =>
                  dateFnsFormat(date, "MMMM yyyy", { locale: ptBR }),
                weekdayFormat: date => dateFnsFormat(date, "EEE", { locale: ptBR }),
                dayFormat: date => dateFnsFormat(date, "dd EEE", { locale: ptBR }),
                timeGutterFormat: date =>
                  dateFnsFormat(date, "HH:mm", { locale: ptBR }),
                eventTimeRangeFormat: ({ start, end }) =>
                  `${dateFnsFormat(start, "HH:mm", { locale: ptBR })} - ${dateFnsFormat(
                    end,
                    "HH:mm",
                    { locale: ptBR }
                  )}`
              }}
              tooltipAccessor={event => {
                const appointment = event.resource;
                const status = statusColors[appointment.status]?.label || appointment.status;
                return `${event.title}\n${formatDateTime(
                  appointment.startDatetime
                )}\nStatus: ${status}`;
              }}
            />
          </Box>
        ) : errorAppointments ? (
          <Box className={classes.emptyState}>
            <ErrorOutlineIcon className={classes.emptyIcon} />
            <Typography variant="h6">Não foi possível carregar os compromissos</Typography>
            <Typography variant="body2">
              Tente atualizar a tela ou revise os filtros aplicados.
            </Typography>
            <Button color="primary" variant="outlined" onClick={fetchAppointments}>
              Tentar novamente
            </Button>
          </Box>
        ) : appointments.length === 0 ? (
          <Box className={classes.emptyState}>
            <TrendingUpIcon className={classes.emptyIcon} />
            <Typography variant="h6">Nenhum compromisso encontrado</Typography>
            <Typography variant="body2">
              Ajuste os filtros ou crie um novo compromisso para iniciar a agenda.
            </Typography>
          </Box>
        ) : (
          renderListView(appointments)
        )}
      </Box>

      <AppointmentModal
        open={modalOpen}
        onClose={handleCloseModal}
        appointment={selectedAppointment}
        onSave={fetchAppointments}
        initialScheduleId={filters.scheduleId || ""}
      />

      <ConfirmationModal
        title="Excluir compromisso"
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleDelete}
      >
        Tem certeza que deseja excluir o compromisso "{selectedAppointment?.title}"?
      </ConfirmationModal>
    </Box>
  );
};

export default Agenda;
