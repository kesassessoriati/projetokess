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
import SafeComponent from "../../components/SafeComponent";
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
  next: "Proximo",
  today: "Hoje",
  month: "Mes",
  week: "Semana",
  day: "Dia",
  agenda: "Agenda",
  date: "Data",
  time: "Horario",
  event: "Compromisso",
  noEventsInRange: "Nenhum compromisso neste periodo.",
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
      "radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    overflowY: "auto",
    ...theme.scrollbarStyles
  },
  hero: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.8fr)",
    gap: theme.spacing(3),
    padding: theme.spacing(3.5),
    borderRadius: 28,
    color: "#fff",
    background:
      "linear-gradient(135deg, #0f172a 0%, #172554 40%, #2563eb 100%)",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
    overflow: "hidden",
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
      padding: theme.spacing(2.5)
    },
    "&:before": {
      content: '""',
      position: "absolute",
      inset: "auto -80px -140px auto",
      width: 280,
      height: 280,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.08)"
    }
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2)
  },
  pageBadge: {
    alignSelf: "flex-start",
    background: "rgba(255,255,255,0.12)",
    color: "#e2e8f0",
    border: "1px solid rgba(255,255,255,0.18)",
    fontWeight: 700,
    letterSpacing: 0.3
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 1.05,
    fontWeight: 800,
    [theme.breakpoints.down("sm")]: {
      fontSize: 28
    }
  },
  heroSubtitle: {
    maxWidth: 720,
    color: "rgba(226, 232, 240, 0.88)",
    fontSize: 15
  },
  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1.5)
  },
  primaryAction: {
    borderRadius: 14,
    padding: theme.spacing(1.2, 2.2),
    color: theme.palette.getContrastText(theme.palette.primary.main),
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: `${theme.shadows[4]}, 0 12px 28px ${theme.palette.primary.main}42`,
    transition: "transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease",
    "& .MuiButton-label": {
      fontWeight: 700
    },
    "&:hover": {
      boxShadow: `${theme.shadows[8]}, 0 18px 34px ${theme.palette.primary.main}57`,
      transform: "translateY(-2px)",
      filter: "brightness(1.04)"
    },
    "&:focus-visible": {
      boxShadow: `0 0 0 3px rgba(255,255,255,0.2), ${theme.shadows[8]}, 0 18px 34px ${theme.palette.primary.main}57`
    }
  },
  secondaryAction: {
    borderRadius: 14,
    padding: theme.spacing(1.2, 2.1),
    color: "#fff",
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  heroHighlights: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: theme.spacing(1.5),
    alignContent: "start"
  },
  highlightCard: {
    padding: theme.spacing(2),
    borderRadius: 20,
    background: "rgba(15, 23, 42, 0.24)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(14px)",
    color: theme.palette.common.white,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 36px rgba(15, 23, 42, 0.16)"
  },
  highlightLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "rgba(219, 234, 254, 0.95)",
    fontWeight: 700
  },
  highlightValue: {
    marginTop: theme.spacing(0.75),
    fontSize: 34,
    lineHeight: 1.1,
    letterSpacing: "-0.04em",
    fontWeight: 800,
    color: theme.palette.common.white,
    textShadow: "0 2px 14px rgba(15, 23, 42, 0.3)",
    overflowWrap: "anywhere",
    [theme.breakpoints.down("sm")]: {
      fontSize: 30
    }
  },
  highlightSubtext: {
    marginTop: theme.spacing(0.75),
    color: "rgba(226, 232, 240, 0.92)",
    fontWeight: 500,
    lineHeight: 1.5
  },
  highlightProgress: {
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.16)",
    "& .MuiLinearProgress-bar": {
      borderRadius: 999,
      background: "linear-gradient(90deg, rgba(255,255,255,0.88) 0%, rgba(191,219,254,1) 100%)"
    }
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: theme.spacing(2)
  },
  statCard: {
    padding: theme.spacing(2.2),
    borderRadius: 22,
    background: "#fff",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    boxShadow: "0 16px 36px rgba(15, 23, 42, 0.08)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: "0 22px 46px rgba(15, 23, 42, 0.12)"
    }
  },
  statCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(1.5)
  },
  statIconBox: {
    width: 52,
    height: 52,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16
  },
  statLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 600
  },
  statValue: {
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1
  },
  statFooter: {
    marginTop: theme.spacing(1.5),
    color: "#475569",
    fontSize: 12
  },
  controlsGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.9fr)",
    gap: theme.spacing(2),
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "1fr"
    }
  },
  filterPanel: {
    padding: theme.spacing(2.5),
    borderRadius: 24,
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(148,163,184,0.18)",
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)"
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    flexWrap: "wrap"
  },
  panelTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.2)
  },
  panelIconWrap: {
    width: 42,
    height: 42,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    background: "linear-gradient(135deg, rgba(37,99,235,0.14), rgba(59,130,246,0.24))",
    color: "#1d4ed8"
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a"
  },
  panelSubtitle: {
    fontSize: 13,
    color: "#64748b"
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: theme.spacing(1.5)
  },
  filterActions: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  quickPanel: {
    padding: theme.spacing(2.5),
    borderRadius: 24,
    background: "#0f172a",
    color: "#fff",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)"
  },
  quickList: {
    display: "grid",
    gap: theme.spacing(1.2),
    marginTop: theme.spacing(2)
  },
  quickItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.4, 1.6),
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)"
  },
  quickItemLabel: {
    color: "rgba(226, 232, 240, 0.84)"
  },
  viewToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(2),
    flexWrap: "wrap"
  },
  viewToggle: {
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
    "& .MuiButton-root": {
      borderRadius: 0,
      padding: theme.spacing(1.1, 1.8),
      fontWeight: 700,
      textTransform: "none"
    }
  },
  contentShell: {
    padding: theme.spacing(2.5),
    borderRadius: 28,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(148,163,184,0.18)",
    boxShadow: "0 20px 44px rgba(15, 23, 42, 0.08)"
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(2),
    flexWrap: "wrap",
    marginBottom: theme.spacing(2)
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a"
  },
  sectionMeta: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  neutralChip: {
    borderRadius: 999,
    fontWeight: 700,
    background: "#e2e8f0",
    color: "#334155"
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 240
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    minHeight: 320,
    borderRadius: 24,
    background: "linear-gradient(180deg, rgba(248,250,252,0.98), rgba(241,245,249,0.95))",
    border: "1px dashed rgba(148,163,184,0.5)",
    color: "#64748b",
    padding: theme.spacing(4)
  },
  tableContainer: {
    borderRadius: 20,
    border: "1px solid rgba(148,163,184,0.16)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)"
  },
  tableHead: {
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)"
  },
  tableHeadCell: {
    fontWeight: 800,
    color: "#334155",
    borderBottom: "1px solid rgba(148,163,184,0.16)"
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
    gap: 6
  },
  appointmentTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  appointmentTitle: {
    fontWeight: 700,
    color: "#0f172a"
  },
  appointmentDesc: {
    color: "#64748b",
    maxWidth: 360
  },
  appointmentMeta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "#475569",
    fontSize: 13,
    fontWeight: 500
  },
  statusChip: {
    borderRadius: 999,
    fontWeight: 700,
    minWidth: 110
  },
  actionsBox: {
    display: "flex",
    justifyContent: "center",
    gap: 4
  },
  calendarWrapper: {
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
  scheduled: { bg: "#3b82f6", label: "Agendado" },
  confirmed: { bg: "#059669", label: "Confirmado" },
  completed: { bg: "#64748b", label: "Concluido" },
  cancelled: { bg: "#ef4444", label: "Cancelado" },
  no_show: { bg: "#f59e0b", label: "Nao compareceu" }
};

const statDefs = [
  { key: "total", label: "Total", color: "#6366f1", icon: <ListAltIcon style={{ fontSize: 28 }} /> },
  { key: "scheduled", label: "Agendados", color: "#3b82f6", icon: <EventAvailableIcon style={{ fontSize: 28 }} /> },
  { key: "confirmed", label: "Confirmados", color: "#059669", icon: <AssignmentTurnedInIcon style={{ fontSize: 28 }} /> },
  { key: "completed", label: "Concluidos", color: "#64748b", icon: <DoneAllIcon style={{ fontSize: 28 }} /> },
  { key: "cancelled", label: "Cancelados", color: "#ef4444", icon: <ErrorOutlineIcon style={{ fontSize: 28 }} /> },
  { key: "no_show", label: "Nao compareceu", color: "#f59e0b", icon: <CancelIcon style={{ fontSize: 28 }} /> }
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
    .filter(item => item.startDatetime && new Date(item.startDatetime) >= new Date() && item.status !== "cancelled")
    .sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime))[0];

  const completionRate = stats.total
    ? Math.round(((stats.confirmed + stats.completed) / stats.total) * 100)
    : 0;

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const calendarEvents = appointments.map(item => ({
    title: item.title,
    start: new Date(item.startDatetime),
    end: new Date(new Date(item.startDatetime).getTime() + (item.durationMinutes || 60) * 60000),
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
      toast.success("Compromisso excluido com sucesso");
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
        toast.warning(`Sincronizacao concluida com alertas: ${imported} importado(s), ${updated} atualizado(s).`);
      } else {
        toast.success(`Calendario sincronizado: ${imported} importado(s), ${updated} atualizado(s).`);
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

  const quickFacts = [
    { label: "Agenda selecionada", value: schedules.find(item => String(item.id) === String(filters.scheduleId))?.name || "Todas" },
    { label: "Filtros ativos", value: activeFiltersCount || "Nenhum" },
    { label: "Proximo compromisso", value: nextAppointment ? formatDateTime(nextAppointment.startDatetime) : "Sem proximos" }
  ];

  return (
    <Box className={classes.root}>
      <Box className={classes.hero}>
        <Box className={classes.heroContent}>
          <Chip className={classes.pageBadge} label="Compromissos" />

          <Box>
            <Typography className={classes.heroTitle}>
              Visual mais claro, acoes mais rapidas e agenda conectada.
            </Typography>
            <Typography className={classes.heroSubtitle}>
              Gerencie compromissos com mais contraste, leitura melhor da agenda e navegacao direta entre lista de compromissos e pagina de agendas.
            </Typography>
          </Box>

          <Box className={classes.heroActions}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenModal()}
              className={classes.primaryAction}
            >
              Novo Compromisso
            </Button>

            <Button
              variant="outlined"
              startIcon={syncingCalendar ? <CircularProgress size={16} style={{ color: "#fff" }} /> : <SyncIcon />}
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
        </Box>

        <Box className={classes.heroHighlights}>
          <Paper elevation={0} className={classes.highlightCard}>
            <Typography className={classes.highlightLabel}>Proximo compromisso</Typography>
            <Typography className={classes.highlightValue}>
              {nextAppointment ? formatDateTime(nextAppointment.startDatetime) : "Sem agenda"}
            </Typography>
            <Typography className={classes.highlightSubtext}>
              {nextAppointment ? `${nextAppointment.title} • ${nextAppointment.schedule?.name || "Agenda nao definida"}` : "Crie um novo compromisso para comecar a organizar o fluxo."}
            </Typography>
          </Paper>

          <Paper elevation={0} className={classes.highlightCard}>
            <Typography className={classes.highlightLabel}>Saude da operacao</Typography>
            <Typography className={classes.highlightValue}>{completionRate}%</Typography>
            <Typography className={classes.highlightSubtext}>
              Confirmados + concluidos em relacao ao total de compromissos visiveis.
            </Typography>
            <Box mt={1.5}>
              <LinearProgress
                variant="determinate"
                value={completionRate}
                className={classes.highlightProgress}
              />
            </Box>
          </Paper>
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
              <Box className={classes.statIconBox} style={{ color, backgroundColor: `${color}18` }}>
                {icon}
              </Box>
            </Box>
            <Divider />
            <Typography className={classes.statFooter}>
              {key === "total" ? "Volume total carregado na tela." : "Status monitorado para melhor priorizacao do time."}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box className={classes.controlsGrid}>
        <Paper elevation={0} className={classes.filterPanel}>
          <Box className={classes.panelHeader}>
            <Box className={classes.panelTitleWrap}>
              <Box className={classes.panelIconWrap}>
                <FilterListIcon />
              </Box>
              <Box>
                <Typography className={classes.panelTitle}>Filtros e contexto</Typography>
                <Typography className={classes.panelSubtitle}>
                  Refine a leitura da lista e encontre compromissos mais rapido.
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

        <Paper elevation={0} className={classes.quickPanel}>
          <Typography className={classes.panelTitle} style={{ color: "#fff" }}>
            Leitura rapida
          </Typography>
          <Typography className={classes.panelSubtitle} style={{ color: "rgba(226,232,240,0.78)" }}>
            Indicadores para tomada de decisao sem sair da tela.
          </Typography>

          <Box className={classes.quickList}>
            {quickFacts.map(item => (
              <Box key={item.label} className={classes.quickItem}>
                <Typography className={classes.quickItemLabel}>{item.label}</Typography>
                <Typography style={{ fontWeight: 800 }}>{item.value}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      <Box className={classes.contentShell}>
        <Box className={classes.viewToolbar}>
          <Box>
            <Typography className={classes.sectionTitle}>
              {viewMode === "calendar" ? "Visao de calendario" : "Lista de compromissos"}
            </Typography>
            <Typography className={classes.panelSubtitle}>
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
              Calendario
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
                  `${dateFnsFormat(start, "dd/MM/yyyy", { locale: ptBR })} - ${dateFnsFormat(end, "dd/MM/yyyy", { locale: ptBR })}`,
                dayHeaderFormat: date => dateFnsFormat(date, "EEEE, dd/MM/yyyy", { locale: ptBR }),
                monthHeaderFormat: date => dateFnsFormat(date, "MMMM yyyy", { locale: ptBR }),
                weekdayFormat: date => dateFnsFormat(date, "EEE", { locale: ptBR }),
                dayFormat: date => dateFnsFormat(date, "dd EEE", { locale: ptBR }),
                timeGutterFormat: date => dateFnsFormat(date, "HH:mm", { locale: ptBR }),
                eventTimeRangeFormat: ({ start, end }) =>
                  `${dateFnsFormat(start, "HH:mm", { locale: ptBR })} - ${dateFnsFormat(end, "HH:mm", { locale: ptBR })}`
              }}
              tooltipAccessor={event => {
                const appointment = event.resource;
                const status = statusColors[appointment.status]?.label || appointment.status;
                return `${event.title}\n${formatDateTime(appointment.startDatetime)}\nStatus: ${status}`;
              }}
            />
          </Box>
        ) : (
          <SafeComponent
            loading={false}
            error={errorAppointments}
            data={appointments}
            renderData={records => {
              if (records.length === 0) {
                return (
                  <Box className={classes.emptyState}>
                    <TrendingUpIcon style={{ fontSize: 52, marginBottom: 14, opacity: 0.55 }} />
                    <Typography variant="h6">Nenhum compromisso encontrado</Typography>
                    <Typography variant="body2">
                      Ajuste os filtros ou crie um novo compromisso para iniciar a agenda.
                    </Typography>
                  </Box>
                );
              }

              return (
                <React.Fragment>
                  <Box className={classes.sectionHeader}>
                    <Box className={classes.sectionMeta}>
                      <Chip className={classes.neutralChip} label={`${records.length} itens`} />
                      <Chip className={classes.neutralChip} label={`${stats.scheduled} agendado(s)`} />
                      <Chip className={classes.neutralChip} label={`${stats.confirmed} confirmado(s)`} />
                    </Box>
                  </Box>

                  <TableContainer component={Paper} className={classes.tableContainer}>
                    <Table>
                      <TableHead className={classes.tableHead}>
                        <TableRow>
                          <TableCell className={classes.tableHeadCell}>Compromisso</TableCell>
                          <TableCell className={classes.tableHeadCell}>Agenda</TableCell>
                          <TableCell className={classes.tableHeadCell}>Data e hora</TableCell>
                          <TableCell className={classes.tableHeadCell}>Duracao</TableCell>
                          <TableCell className={classes.tableHeadCell}>Servico</TableCell>
                          <TableCell className={classes.tableHeadCell}>Status</TableCell>
                          <TableCell className={classes.tableHeadCell} align="center">Acoes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {records.map(appointment => {
                          const isUpcoming =
                            appointment.status === "scheduled" &&
                            new Date(appointment.startDatetime) > new Date();

                          return (
                            <TableRow
                              key={appointment.id}
                              className={`${classes.tableRow} ${isUpcoming ? classes.upcomingEventRow : ""}`}
                            >
                              <TableCell>
                                <Box className={classes.appointmentInfo}>
                                  <Box className={classes.appointmentTitleRow}>
                                    <Typography className={classes.appointmentTitle}>
                                      {appointment.title}
                                    </Typography>
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
                                    <Typography variant="body2" className={classes.appointmentDesc}>
                                      {appointment.description.substring(0, 70)}
                                      {appointment.description.length > 70 ? "..." : ""}
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
                                  label={statusColors[appointment.status]?.label || appointment.status}
                                  size="small"
                                  className={classes.statusChip}
                                  style={{
                                    backgroundColor: statusColors[appointment.status]?.bg || "#64748b",
                                    color: "#fff"
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box className={classes.actionsBox}>
                                  {appointment.status === "scheduled" && (
                                    <Tooltip title="Confirmar">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleStatusChange(appointment, "confirmed")}
                                      >
                                        <CheckCircleIcon fontSize="small" style={{ color: "#059669" }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                                    <Tooltip title="Cancelar">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleStatusChange(appointment, "cancelled")}
                                      >
                                        <CancelIcon fontSize="small" style={{ color: "#ef4444" }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <Tooltip title="Editar">
                                    <IconButton size="small" onClick={() => handleOpenModal(appointment)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Excluir">
                                    <IconButton size="small" onClick={() => handleOpenDeleteModal(appointment)}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </React.Fragment>
              );
            }}
          />
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
        title="Excluir Compromisso"
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
