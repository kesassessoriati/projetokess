import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
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
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import EventIcon from "@material-ui/icons/Event";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import PersonIcon from "@material-ui/icons/Person";
import BuildIcon from "@material-ui/icons/Build";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CancelIcon from "@material-ui/icons/Cancel";
import ListIcon from "@material-ui/icons/List";
import CalendarTodayIcon from "@material-ui/icons/CalendarToday";
import SyncIcon from "@material-ui/icons/Sync";
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
  listUserSchedules,
  listAppointments,
  updateAppointment,
  deleteAppointment,
  syncGoogleCalendarAppointments
} from "../../services/userScheduleService";
import useSafeApi from "../../hooks/useSafeApi";
import SafeComponent from "../../components/SafeComponent";
import toastError from "../../errors/toastError";
import ConfirmationModal from "../../components/ConfirmationModal";
import AppointmentModal from "../../components/AppointmentModal";

// react-big-calendar localizer (pt-BR)
const locales = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({
  format: dateFnsFormat,
  parse: dateFnsParse,
  startOfWeek: (date) => startOfWeek(date, { locale: ptBR }),
  getDay,
  locales,
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
  showMore: (total) => `+${total} mais`,
};

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(3),
    gap: theme.spacing(2),
    overflowY: "auto",
    ...theme.scrollbarStyles
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing(2)
  },
  titleSection: {
    display: "flex",
    flexDirection: "column"
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: theme.palette.text.primary
  },
  subtitle: {
    fontSize: 14,
    color: theme.palette.text.secondary
  },
  statsRow: {
    display: "flex",
    gap: theme.spacing(1.5),
    flexWrap: "wrap"
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1, 2),
    borderRadius: 10,
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    minWidth: 100
  },
  statValue: {
    fontWeight: 700,
    fontSize: 20
  },
  statLabel: {
    fontSize: 12,
    color: theme.palette.text.secondary
  },
  controls: {
    display: "flex",
    gap: theme.spacing(2),
    flexWrap: "wrap",
    alignItems: "center"
  },
  filters: {
    display: "flex",
    gap: theme.spacing(1.5),
    flexWrap: "wrap",
    alignItems: "center"
  },
  filterField: {
    minWidth: 140
  },
  tableContainer: {
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    flex: 1
  },
  tableHead: {
    backgroundColor: theme.palette.grey[100]
  },
  tableHeadCell: {
    fontWeight: 600
  },
  statusChip: {
    fontWeight: 600,
    fontSize: 12
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(6),
    color: theme.palette.text.secondary
  },
  appointmentInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  appointmentTitle: {
    fontWeight: 600
  },
  appointmentMeta: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
    color: theme.palette.text.secondary
  },
  actionsBox: {
    display: "flex",
    justifyContent: "center",
    gap: 4
  },
  calendarWrapper: {
    flex: 1,
    minHeight: 600,
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    padding: theme.spacing(2),
    "& .rbc-calendar": {
      height: "100%",
      minHeight: 560
    },
    "& .rbc-event": {
      borderRadius: 6,
      fontSize: 12,
      padding: "2px 6px"
    },
    "& .rbc-today": {
      backgroundColor: theme.palette.primary.light + "22"
    }
  },
  viewToggle: {
    backgroundColor: theme.palette.background.paper
  }
}));

const statusColors = {
  scheduled: { bg: "#3b82f6", label: "Agendado" },
  confirmed: { bg: "#059669", label: "Confirmado" },
  completed: { bg: "#6b7280", label: "Concluído" },
  cancelled: { bg: "#ef4444", label: "Cancelado" },
  no_show: { bg: "#f59e0b", label: "Não compareceu" }
};

const statDefs = [
  { key: "total", label: "Total", color: "#6366f1" },
  { key: "scheduled", label: "Agendados", color: "#3b82f6" },
  { key: "confirmed", label: "Confirmados", color: "#059669" },
  { key: "completed", label: "Concluídos", color: "#6b7280" },
  { key: "cancelled", label: "Cancelados", color: "#ef4444" },
  { key: "no_show", label: "Não compareceu", color: "#f59e0b" },
];

const Agenda = () => {
  const classes = useStyles();
  const location = useLocation();

  const [viewMode, setViewMode] = useState("list"); // "list" | "calendar"
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
  const { data: schedulesData, loading: loadingSchedules } = useSafeApi("/user-schedules", { manual: false });

  const appointments = appointmentData?.appointments || [];
  const schedules = schedulesData?.schedules || [];

  // Compute stats
  const stats = {
    total: appointments.length,
    scheduled: appointments.filter(a => a.status === "scheduled").length,
    confirmed: appointments.filter(a => a.status === "confirmed").length,
    completed: appointments.filter(a => a.status === "completed").length,
    cancelled: appointments.filter(a => a.status === "cancelled").length,
    no_show: appointments.filter(a => a.status === "no_show").length,
  };

  // Map to calendar events
  const calendarEvents = appointments.map((a) => ({
    title: a.title,
    start: new Date(a.startDatetime),
    end: new Date(new Date(a.startDatetime).getTime() + (a.durationMinutes || 60) * 60000),
    resource: a,
  }));

  useEffect(() => {
    if (location && location.search) {
      const queryParams = new URLSearchParams(location.search);
      const scheduleIdParam = queryParams.get("scheduleId");
      if (scheduleIdParam) {
        setFilters(prev => ({ ...prev, scheduleId: scheduleIdParam }));
      }
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

  const handleFilterChange = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
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

  const handleOpenDeleteModal = (appointment) => {
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

  const handleCalendarEventClick = (event) => {
    handleOpenModal(event.resource);
  };

  const handleCalendarSlotSelect = ({ start }) => {
    // Open new appointment modal with pre-filled start time
    setSelectedAppointment(null);
    setModalOpen(true);
  };

  const handleSyncGoogleCalendar = async () => {
    setSyncingCalendar(true);
    try {
      const result = await syncGoogleCalendarAppointments();
      const { imported, updated, errors } = result;
      if (errors && errors.length > 0) {
        toast.warning(`Sincronização com alertas: ${imported} importado(s), ${updated} atualizado(s).`);
      } else {
        toast.success(`Calendário sincronizado: ${imported} importado(s), ${updated} atualizado(s).`);
      }
      fetchAppointments();
    } catch (err) {
      toastError(err);
    } finally {
      setSyncingCalendar(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const eventStyleGetter = (event) => {
    const status = event.resource?.status || "scheduled";
    const color = statusColors[status]?.bg || "#3b82f6";
    return {
      style: {
        backgroundColor: color,
        borderColor: color,
        color: "#fff",
        borderRadius: 6
      }
    };
  };

  return (
    <Box className={classes.root}>
      {/* Header */}
      <Box className={classes.header}>
        <Box className={classes.titleSection}>
          <Typography className={classes.title}>Compromissos</Typography>
          <Typography className={classes.subtitle}>
            {appointments.length} compromisso(s) encontrado(s)
          </Typography>
        </Box>

        <Box className={classes.controls}>
          {/* View toggle */}
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
              startIcon={<CalendarTodayIcon />}
              onClick={() => setViewMode("calendar")}
            >
              Calendário
            </Button>
          </ButtonGroup>

          <Button
            variant="outlined"
            color="primary"
            startIcon={syncingCalendar ? <CircularProgress size={16} /> : <SyncIcon />}
            onClick={handleSyncGoogleCalendar}
            disabled={syncingCalendar}
          >
            {syncingCalendar ? "Sincronizando..." : "Sincronizar"}
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal()}
          >
            Novo Compromisso
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Box className={classes.statsRow}>
        {statDefs.map(({ key, label, color }) => (
          <Box key={key} className={classes.statCard}>
            <Box>
              <Typography className={classes.statValue} style={{ color }}>
                {stats[key]}
              </Typography>
              <Typography className={classes.statLabel}>{label}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Filters */}
      <Box className={classes.filters}>
        <FormControl variant="outlined" size="small" className={classes.filterField}>
          <InputLabel>Agenda</InputLabel>
          <Select
            value={filters.scheduleId}
            onChange={handleFilterChange("scheduleId")}
            label="Agenda"
          >
            <MenuItem value="">Todas</MenuItem>
            {schedules.map((schedule) => (
              <MenuItem key={schedule.id} value={schedule.id}>
                {schedule.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl variant="outlined" size="small" className={classes.filterField}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            onChange={handleFilterChange("status")}
            label="Status"
          >
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(statusColors).map(([key, { label }]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          type="date"
          label="Data Início"
          variant="outlined"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.startDate}
          onChange={handleFilterChange("startDate")}
        />

        <TextField
          type="date"
          label="Data Fim"
          variant="outlined"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.endDate}
          onChange={handleFilterChange("endDate")}
        />
      </Box>

      {/* Content */}
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
            style={{ height: "calc(100vh - 340px)", minHeight: 560 }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleCalendarEventClick}
            onSelectSlot={handleCalendarSlotSelect}
            selectable
            popup
            defaultView="month"
            views={["month", "week", "day", "agenda"]}
            formats={{
              agendaHeaderFormat: ({ start, end }) =>
                `${dateFnsFormat(start, "dd/MM/yyyy", { locale: ptBR })} – ${dateFnsFormat(end, "dd/MM/yyyy", { locale: ptBR })}`,
              dayHeaderFormat: (date) => dateFnsFormat(date, "EEEE, dd/MM/yyyy", { locale: ptBR }),
              monthHeaderFormat: (date) => dateFnsFormat(date, "MMMM yyyy", { locale: ptBR }),
              weekdayFormat: (date) => dateFnsFormat(date, "EEE", { locale: ptBR }),
              dayFormat: (date) => dateFnsFormat(date, "dd EEE", { locale: ptBR }),
              timeGutterFormat: (date) => dateFnsFormat(date, "HH:mm", { locale: ptBR }),
              eventTimeRangeFormat: ({ start, end }) =>
                `${dateFnsFormat(start, "HH:mm", { locale: ptBR })} – ${dateFnsFormat(end, "HH:mm", { locale: ptBR })}`,
            }}
            tooltipAccessor={(event) => {
              const a = event.resource;
              const status = statusColors[a.status]?.label || a.status;
              return `${event.title}\n${formatDateTime(a.startDatetime)}\nStatus: ${status}`;
            }}
          />
        </Box>
      ) : (
        <SafeComponent
          loading={false}
          error={errorAppointments}
          data={appointments}
          renderData={(records) => {
            if (records.length === 0) {
              return (
                <Box className={classes.emptyState}>
                  <EventIcon style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                  <Typography variant="h6">Nenhum compromisso encontrado</Typography>
                  <Typography variant="body2">
                    Clique em "Novo Compromisso" para agendar
                  </Typography>
                </Box>
              );
            }

            return (
              <TableContainer component={Paper} className={classes.tableContainer}>
                <Table>
                  <TableHead className={classes.tableHead}>
                    <TableRow>
                      <TableCell className={classes.tableHeadCell}>Compromisso</TableCell>
                      <TableCell className={classes.tableHeadCell}>Agenda</TableCell>
                      <TableCell className={classes.tableHeadCell}>Data/Hora</TableCell>
                      <TableCell className={classes.tableHeadCell}>Duração</TableCell>
                      <TableCell className={classes.tableHeadCell}>Serviço</TableCell>
                      <TableCell className={classes.tableHeadCell}>Status</TableCell>
                      <TableCell className={classes.tableHeadCell} align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((appointment) => (
                      <TableRow key={appointment.id} hover>
                        <TableCell>
                          <Box className={classes.appointmentInfo}>
                            <Box style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                              <Typography variant="body2" color="textSecondary">
                                {appointment.description.substring(0, 50)}
                                {appointment.description.length > 50 ? "..." : ""}
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
                              backgroundColor: statusColors[appointment.status]?.bg || "#6b7280",
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
                              <IconButton
                                size="small"
                                onClick={() => handleOpenModal(appointment)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDeleteModal(appointment)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          }}
        />
      )}

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
