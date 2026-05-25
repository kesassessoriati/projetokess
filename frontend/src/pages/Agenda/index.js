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
    padding: theme.spacing(2.5),
    gap: theme.spacing(2.25),
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
    gridTemplateColumns:
      "minmax(280px, 0.9fr) minmax(340px, 1.15fr) minmax(260px, 0.78fr)",
    gridTemplateAreas: '"hero team summary"',
    gap: theme.spacing(2),
    alignItems: "stretch",
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.9fr)",
      gridTemplateAreas: '"hero summary" "team team"'
    },
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
      gridTemplateAreas: '"hero" "team" "summary"'
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
      "linear-gradient(180deg, rgba(59,130,246,0.12) 0%, rgba(30,64,175,0.18) 100%)",
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
    maxWidth: 460,
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
    fontSize: 36,
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
  teamPanel: {
    gridArea: "team",
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
  teamPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.4),
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column"
    }
  },
  teamPanelTitle: {
    fontSize: 16,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#ffffff"
  },
  teamPanelSubtitle: {
    marginTop: theme.spacing(0.35),
    fontSize: 12,
    color: "rgba(219, 234, 254, 0.84)",
    lineHeight: 1.45
  },
  teamPanelSummary: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    justifyContent: "flex-end",
    [theme.breakpoints.down("sm")]: {
      justifyContent: "flex-start"
    }
  },
  teamPanelSummaryChip: {
    borderRadius: 999,
    background: "rgba(15,23,42,0.32)",
    color: "#e0f2fe",
    border: "1px solid rgba(255,255,255,0.16)",
    fontWeight: 700
  },
  teamGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: theme.spacing(1),
    alignContent: "start",
    maxHeight: 304,
    overflowY: "auto",
    paddingRight: theme.spacing(0.5),
    ...theme.scrollbarStyles,
    [theme.breakpoints.down("sm")]: {
      maxHeight: "none",
      paddingRight: 0
    }
  },
  teamCard: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1.1, 1.2),
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.42)",
    background: "rgba(15,23,42,0.22)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)"
  },
  teamCardName: {
    fontSize: 13,
    fontWeight: 800,
    color: "#ffffff",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  teamCardLabel: {
    marginTop: theme.spacing(0.3),
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "rgba(219, 234, 254, 0.74)"
  },
  teamCardCount: {
    minWidth: 42,
    textAlign: "right",
    fontSize: 24,
    lineHeight: 1,
    fontWeight: 800,
    color: "#22c55e"
  },
  teamCardCountZero: {
    color: "#f87171"
  },
  teamEmptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
    borderRadius: 18,
    border: "1px dashed rgba(255,255,255,0.18)",
    color: "rgba(219, 234, 254, 0.82)",
    textAlign: "center",
    padding: theme.spacing(2)
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
  contextGrid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(2)
  },
  panel: {
    padding: theme.spacing(2),
    borderRadius: 24,
    border: "1px solid rgba(226,232,240,0.58)",
    boxShadow: "0 16px 30px rgba(15, 23, 42, 0.12)"
  },
  filterPanel: {
    background: "rgba(255,255,255,0.97)"
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
  contextSummaryChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.5)
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: theme.spacing(1.25)
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
  neutralChip: {
    borderRadius: 999,
    fontWeight: 700,
    background: "#e2e8f0",
    color: "#334155"
  },
  statusFilterStrip: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2)
  },
  statusFilterChip: {
    borderRadius: 999,
    fontWeight: 800,
    background: "#f8fafc",
    color: "#334155",
    border: "1px solid rgba(148,163,184,0.38)",
    transition: "all 0.18s ease",
    "&:hover, &:focus": {
      background: "#eff6ff",
      color: "#1d4ed8",
      borderColor: "rgba(59,130,246,0.45)"
    }
  },
  statusFilterChipActive: {
    background: "#111827",
    color: "#fff",
    borderColor: "#111827",
    boxShadow: "0 12px 22px rgba(15, 23, 42, 0.18)",
    "&:hover, &:focus": {
      background: "#111827",
      color: "#fff",
      borderColor: "#111827"
    }
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
  appointmentMetaWrap: {
    display: "grid",
    gap: 6
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
    "& .rbc-agenda-view table tbody > tr > td": {
      verticalAlign: "top"
    },
    "& .rbc-off-range-bg": {
      background: "#f8fafc"
    }
  },
  calendarEventBody: {
    display: "grid",
    gap: 2,
    minWidth: 0
  },
  calendarEventTitle: {
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.25,
    color: "inherit",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  calendarEventCreator: {
    fontSize: 10,
    lineHeight: 1.25,
    color: "inherit",
    opacity: 0.88,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
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

const statusFilterButtons = [
  { key: "scheduled", label: "Agendados" },
  { key: "confirmed", label: "Confirmados" },
  { key: "completed", label: "Concluídos" },
  { key: "cancelled", label: "Cancelados" },
  { key: "no_show", label: "Não compareceu" }
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
    status: "scheduled",
    startDate: "",
    endDate: ""
  });
  const [appointmentData, setAppointmentData] = useState({ appointments: [] });
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [errorAppointments, setErrorAppointments] = useState(null);
  const { data: schedulesData } = useSafeApi("/user-schedules", { manual: false });

  const appointments = appointmentData?.appointments || [];
  const metricsByUser = appointmentData?.metricsByUser || [];
  const schedules = schedulesData?.schedules || [];
  const getCreatedByLabel = appointment => appointment?.createdByUser?.name || "-";
  const formatMetricCount = count => String(Number(count) || 0).padStart(2, "0");

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
  const teamScheduledTotal = metricsByUser.reduce(
    (total, item) => total + (Number(item.count) || 0),
    0
  );
  const activeCreatorsCount = metricsByUser.filter(item => Number(item.count) > 0).length;

  const calendarEvents = appointments.map(item => ({
    title: item.title,
    start: new Date(item.startDatetime),
    end: new Date(
      new Date(item.startDatetime).getTime() + (item.durationMinutes || 60) * 60000
    ),
    createdByLabel: getCreatedByLabel(item),
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

  const handleStatusFilterClick = status => {
    setFilters(prev => ({ ...prev, status }));
  };

  const handleResetFilters = () => {
    setFilters({
      scheduleId: "",
      status: "scheduled",
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

  const CalendarEventContent = ({ event }) => (
    <Box className={classes.calendarEventBody}>
      <Typography component="span" className={classes.calendarEventTitle}>
        {event.title}
      </Typography>
      <Typography component="span" className={classes.calendarEventCreator}>
        {`Agendado por: ${event.createdByLabel || "-"}`}
      </Typography>
    </Box>
  );

  const contextChips = [
    selectedScheduleName,
    filters.status ? statusColors[filters.status]?.label || filters.status : "Todos os status",
    filters.startDate || filters.endDate ? "Período personalizado" : "Sem recorte por data"
  ];

  const summaryChips = [
    `${appointments.length} item(ns)`,
    `${stats.scheduled} agendado(s)`,
    `${stats.confirmed} confirmado(s)`,
    `${appointmentsToday} hoje`,
    activeFiltersCount
      ? `${activeFiltersCount} filtro(s) ativo(s)`
      : "Nenhum filtro ativo"
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
              <TableCell className={classes.tableHeadCell}>Agendado por</TableCell>
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
                    <Box className={classes.appointmentMeta}>
                      <PersonIcon fontSize="small" />
                      {getCreatedByLabel(appointment)}
                    </Box>
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
                  <Typography variant="body2" className={classes.appointmentDescription}>
                    {`Agendado por: ${getCreatedByLabel(appointment)}`}
                  </Typography>
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

          <Paper elevation={0} className={classes.teamPanel}>
            <Box className={classes.teamPanelHeader}>
              <Box>
                <Typography className={classes.teamPanelTitle}>
                  Quantidade agendada por membros da equipe
                </Typography>
                <Typography className={classes.teamPanelSubtitle}>
                  Todos os usuários da empresa aparecem aqui, inclusive quando o total está zerado.
                </Typography>
              </Box>

              <Box className={classes.teamPanelSummary}>
                <Chip
                  className={classes.teamPanelSummaryChip}
                  label={`${metricsByUser.length} membro(s)`}
                />
                <Chip
                  className={classes.teamPanelSummaryChip}
                  label={`${teamScheduledTotal} agendamento(s)`}
                />
                <Chip
                  className={classes.teamPanelSummaryChip}
                  label={`${activeCreatorsCount} com agenda`}
                />
              </Box>
            </Box>

            {metricsByUser.length > 0 ? (
              <Box className={classes.teamGrid}>
                {metricsByUser.map(metric => (
                  <Box key={metric.userId} className={classes.teamCard}>
                    <Box style={{ minWidth: 0 }}>
                      <Typography className={classes.teamCardName}>
                        {metric.userName}
                      </Typography>
                      <Typography className={classes.teamCardLabel}>
                        compromissos visíveis
                      </Typography>
                    </Box>

                    <Typography
                      className={`${classes.teamCardCount} ${
                        metric.count === 0 ? classes.teamCardCountZero : ""
                      }`}
                    >
                      {formatMetricCount(metric.count)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box className={classes.teamEmptyState}>
                Nenhum usuário da empresa foi encontrado para compor a grade.
              </Box>
            )}
          </Paper>

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

            <Box className={classes.contextSummaryChips}>
              {summaryChips.map(item => (
                <Chip key={item} label={item} className={classes.neutralChip} />
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

        <Box className={classes.statusFilterStrip}>
          {statusFilterButtons.map(item => (
            <Chip
              key={item.key}
              label={item.label}
              clickable
              onClick={() => handleStatusFilterClick(item.key)}
              className={`${classes.statusFilterChip} ${
                filters.status === item.key ? classes.statusFilterChipActive : ""
              }`}
            />
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
              components={{
                event: CalendarEventContent,
                agenda: {
                  event: CalendarEventContent
                }
              }}
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
                )}\nAgendado por: ${getCreatedByLabel(appointment)}\nStatus: ${status}`;
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
