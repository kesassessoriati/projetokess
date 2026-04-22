import React, { useState, useEffect, useContext } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import Box from "@material-ui/core/Box";
import VideoCallIcon from "@material-ui/icons/VideoCall";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import PersonIcon from "@material-ui/icons/Person";
import GroupIcon from "@material-ui/icons/Group";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AppointmentModal = (props) => {
  const { open, onClose, appointment, onSave, initialScheduleId, userServices, userConfig, existingAppointments, leadContext } = props;

  const { user } = useContext(AuthContext);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [startDatetime, setStartDatetime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [status, setStatus] = useState("scheduled");
  const [scheduleId, setScheduleId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [services, setServices] = useState([]);

  // New fields
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [participantEmails, setParticipantEmails] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [operationalNote, setOperationalNote] = useState("");
  const [createdByUserId, setCreatedByUserId] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (open) {
      loadData();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (open && appointment) {
      setTitle(appointment.title || "");
      setDescription(appointment.description || "");
      setDurationMinutes(String(appointment.durationMinutes || 60));
      setStatus(appointment.status || "scheduled");
      setScheduleId(String(appointment.scheduleId || ""));
      setServiceId(appointment.serviceId ? String(appointment.serviceId) : "");
      setLeadName(appointment.leadName || "");
      setLeadPhone(appointment.leadPhone || "");
      setMeetingLink(appointment.googleMeetLink || appointment.meetingLink || "");
      setOperationalNote(appointment.operationalNote || "");
      setCreatedByUserId(appointment.createdByUserId ? String(appointment.createdByUserId) : "");
      // For participantEmails: use appointment.participantEmails if available, otherwise participants
      const emailsArr = appointment.participantEmails || appointment.participants || [];
      setParticipantEmails(Array.isArray(emailsArr) ? emailsArr.join(", ") : "");

      if (appointment.startDatetime) {
        try {
          const date = new Date(appointment.startDatetime);
          const formatted = date.toISOString().slice(0, 16);
          setStartDatetime(formatted);
        } catch (e) {
          setStartDatetime("");
        }
      }
    }
  }, [open, appointment]);

  useEffect(() => {
    if (open && !appointment && initialScheduleId) {
      setScheduleId(String(initialScheduleId));
    }
  }, [open, appointment, initialScheduleId]);

  const loadData = async () => {
    try {
      const { data: schedulesRes } = await api.get("/user-schedules");
      setSchedules(schedulesRes.schedules || []);
    } catch (err) {
      console.error("Erro ao carregar agendas:", err);
    }

    try {
      const { data: usersRes } = await api.get("/users/list");
      setUsers(Array.isArray(usersRes) ? usersRes : []);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    }

    // Se userServices foi passado, usar apenas esses serviços
    if (userServices && userServices.length > 0) {
      setServices(userServices);
    } else {
      try {
        const { data: servicesRes } = await api.get("/servicos");
        setServices(servicesRes.servicos || servicesRes || []);
      } catch (err) {
        console.error("Erro ao carregar serviços:", err);
      }
    }
  };

  const resetForm = () => {
    if (!appointment) {
      setTitle("");
      setDescription("");
      setClientEmail(leadContext?.email || "");
      setStartDatetime("");
      setDurationMinutes("60");
      setStatus("scheduled");
      setScheduleId(initialScheduleId ? String(initialScheduleId) : "");
      setServiceId("");
      setLeadName(leadContext?.name || "");
      setLeadPhone(leadContext?.phone || "");
      setParticipantEmails("");
      setMeetingLink("");
      setOperationalNote("");
      setCreatedByUserId(user?.id ? String(user.id) : "");
    }
  };

  const validateSchedule = () => {
    if (!startDatetime) return null;

    const start = new Date(startDatetime);
    const duration = parseInt(durationMinutes, 10) || 60;
    const end = new Date(start.getTime() + duration * 60000);

    // Se temos configurações do usuário, validar
    if (userConfig) {
      const dayOfWeek = start.getDay();
      const workDaysArray = (userConfig.workDays || "0,1,2,3,4,5,6").split(",").map(d => parseInt(d.trim(), 10));
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

      // Validar dia de trabalho
      if (!workDaysArray.includes(dayOfWeek)) {
        return `O profissional não trabalha neste dia (${dayNames[dayOfWeek]}). Dias: ${workDaysArray.map(d => dayNames[d]).join(", ")}`;
      }

      // Validar horário de trabalho
      const startTime = start.toTimeString().substring(0, 5);
      const endTime = end.toTimeString().substring(0, 5);
      const userStartWork = userConfig.startWork || "00:00";
      const userEndWork = userConfig.endWork || "23:59";

      if (startTime < userStartWork || endTime > userEndWork) {
        return `Horário fora do expediente do profissional (${userStartWork} - ${userEndWork})`;
      }

      // Validar horário de almoço
      if (userConfig.lunchStart && userConfig.lunchEnd) {
        const lunchStartParts = userConfig.lunchStart.split(":");
        const lunchEndParts = userConfig.lunchEnd.split(":");
        const lunchStartMinutes = parseInt(lunchStartParts[0], 10) * 60 + parseInt(lunchStartParts[1], 10);
        const lunchEndMinutes = parseInt(lunchEndParts[0], 10) * 60 + parseInt(lunchEndParts[1], 10);

        const appointmentStartMinutes = start.getHours() * 60 + start.getMinutes();
        const appointmentEndMinutes = end.getHours() * 60 + end.getMinutes();

        const overlapsLunch = (
          (appointmentStartMinutes >= lunchStartMinutes && appointmentStartMinutes < lunchEndMinutes) ||
          (appointmentEndMinutes > lunchStartMinutes && appointmentEndMinutes <= lunchEndMinutes) ||
          (appointmentStartMinutes <= lunchStartMinutes && appointmentEndMinutes >= lunchEndMinutes)
        );

        if (overlapsLunch) {
          return `Conflito com horário de almoço (${userConfig.lunchStart} - ${userConfig.lunchEnd})`;
        }
      }
    }

    // Validar conflito com compromissos existentes
    if (existingAppointments && existingAppointments.length > 0) {
      const newStart = start.getTime();
      const newEnd = end.getTime();

      for (const existing of existingAppointments) {
        // Ignorar o próprio compromisso em edição
        if (appointment && existing.id === appointment.id) continue;
        // Ignorar cancelados
        if (existing.status === "cancelled" || existing.status === "no_show") continue;

        const existingStart = new Date(existing.startDatetime).getTime();
        const existingEnd = existingStart + existing.durationMinutes * 60000;

        if (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        ) {
          const existingTime = new Date(existing.startDatetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          return `Conflito com "${existing.title}" às ${existingTime}`;
        }
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!startDatetime) {
      toast.error("Data/hora de início é obrigatória");
      return;
    }
    if (!scheduleId) {
      toast.error("Selecione uma agenda");
      return;
    }

    // Validar agendamento
    const validationError = validateSchedule();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Validar e parsear participantEmails
    let parsedParticipantEmails = [];
    if (participantEmails.trim()) {
      const emailList = participantEmails.split(",").map(e => e.trim()).filter(Boolean);
      const invalidEmails = emailList.filter(e => !EMAIL_REGEX.test(e));
      if (invalidEmails.length > 0) {
        toast.error(`E-mails inválidos: ${invalidEmails.join(", ")}`);
        return;
      }
      parsedParticipantEmails = emailList;
    }

    setSubmitting(true);

    try {
      let finalDescription = description.trim();

      if (!appointment) {
        if (clientEmail) {
          finalDescription += "\n\n--- INFORMAÇÕES ADICIONAIS ---";
          finalDescription += `\nE-mail do Cliente (Lead): ${clientEmail}`;
        }
      }

      const payload = {
        title: title.trim(),
        description: finalDescription || null,
        clientEmail: clientEmail ? clientEmail.trim() : null,
        startDatetime: startDatetime,
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        status: status,
        scheduleId: parseInt(scheduleId, 10),
        serviceId: serviceId ? parseInt(serviceId, 10) : null,
        leadName: leadName.trim() || null,
        leadPhone: leadPhone.trim() || null,
        participantEmails: parsedParticipantEmails,
        meetingLink: meetingLink.trim() || null,
        operationalNote: operationalNote.trim() || null,
        createdByUserId: createdByUserId ? parseInt(createdByUserId, 10) : null
      };

      if (appointment && appointment.id) {
        await api.put("/appointments/" + appointment.id, payload);
        toast.success("Compromisso atualizado com sucesso");
      } else {
        await api.post("/appointments", payload);
        toast.success("Compromisso criado com sucesso");
      }

      if (onSave) {
        onSave();
      }
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const activeSchedules = schedules.filter(s => s.active);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {appointment ? "Editar Compromisso" : "Novo Compromisso"}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Nome do evento */}
          <Grid item xs={12}>
            <TextField
              label="Nome do evento"
              fullWidth
              required
              variant="outlined"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Grid>

          {/* Nome do lead */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nome do lead"
              fullWidth
              variant="outlined"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              placeholder="Nome do lead ou cliente"
            />
          </Grid>

          {/* Telefone WhatsApp do lead */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Telefone WhatsApp do lead"
              fullWidth
              variant="outlined"
              value={leadPhone}
              onChange={(e) => setLeadPhone(e.target.value)}
              placeholder="5511999999999"
            />
          </Grid>

          {/* E-mails (apenas para novo compromisso) */}
          {!appointment && (
            <>
              <Grid item xs={12}>
                <TextField
                  label="E-mail do cliente (Lead)"
                  fullWidth
                  variant="outlined"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="cliente@email.com"
                />
              </Grid>
            </>
          )}

          {/* Descrição do evento */}
          <Grid item xs={12}>
            <TextField
              label="Descrição do evento"
              fullWidth
              multiline
              rows={5}
              variant="outlined"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Grid>

          {/* Participantes (e-mails separados por vírgula) */}
          <Grid item xs={12}>
            <TextField
              label="Participantes (e-mails separados por vírgula)"
              fullWidth
              variant="outlined"
              value={participantEmails}
              onChange={(e) => setParticipantEmails(e.target.value)}
              placeholder="email1@exemplo.com, email2@exemplo.com"
              helperText="Separe múltiplos e-mails com vírgula"
            />
          </Grid>

          {/* Link da Reunião */}
          <Grid item xs={12}>
            <TextField
              label="Link da Reunião"
              fullWidth
              variant="outlined"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              helperText={appointment && appointment.googleMeetLink ? "Link gerado pelo Google Meet já preenchido" : "Opcional — insira um link de videoconferência"}
            />
          </Grid>

          {/* Nota Operacional */}
          <Grid item xs={12}>
            <TextField
              label="Nota Operacional"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={operationalNote}
              onChange={(e) => setOperationalNote(e.target.value)}
              placeholder="Anotações internas, instruções para o atendimento..."
            />
          </Grid>

          {/* Criado por / Responsável */}
          <Grid item xs={12}>
            <TextField
              select
              label="Criado por / Responsável"
              fullWidth
              variant="outlined"
              value={createdByUserId}
              onChange={(e) => setCreatedByUserId(e.target.value)}
              helperText="Usuário que criou ou é responsável por este compromisso"
            >
              <MenuItem value="">
                <em>Selecione um usuário</em>
              </MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={String(u.id)}>
                  {u.name} {u.id === user?.id ? "(você)" : ""}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Agenda / Serviço */}
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Agenda"
              fullWidth
              required
              variant="outlined"
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
              disabled={Boolean(appointment)}
            >
              <MenuItem value="">
                <em>Selecione uma agenda</em>
              </MenuItem>
              {activeSchedules.map((schedule) => (
                <MenuItem key={schedule.id} value={String(schedule.id)}>
                  {schedule.name} {schedule.user ? "(" + schedule.user.name + ")" : ""}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Serviço (opcional)"
              fullWidth
              variant="outlined"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <MenuItem value="">
                <em>Nenhum</em>
              </MenuItem>
              {services.map((service) => (
                <MenuItem key={service.id} value={String(service.id)}>
                  {service.nome} - R$ {Number(service.valorOriginal || 0).toFixed(2)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Data/Hora / Duração */}
          <Grid item xs={12} sm={6}>
            <TextField
              type="datetime-local"
              label="Data/Hora de Início"
              fullWidth
              required
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={startDatetime}
              onChange={(e) => setStartDatetime(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              type="number"
              label="Duração (minutos)"
              fullWidth
              required
              variant="outlined"
              inputProps={{ min: 1 }}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              helperText="Ex: 60 = 1 hora"
            />
          </Grid>

          {/* Status (edit mode only) */}
          {appointment && (
            <Grid item xs={12}>
              <TextField
                select
                label="Status"
                fullWidth
                variant="outlined"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="scheduled">Agendado</MenuItem>
                <MenuItem value="confirmed">Confirmado</MenuItem>
                <MenuItem value="completed">Concluído</MenuItem>
                <MenuItem value="cancelled">Cancelado</MenuItem>
                <MenuItem value="no_show">Não compareceu</MenuItem>
              </TextField>
            </Grid>
          )}

          {/* Google Meet info section (kept exactly as-is) */}
          {appointment && (appointment.googleMeetLink || appointment.organizerEmail || appointment.organizerName || (appointment.participants && appointment.participants.length > 0)) && (
            <>
              <Grid item xs={12}>
                <Divider style={{ margin: "4px 0 12px" }} />
                <Typography variant="subtitle2" style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase", color: "#555", marginBottom: 12 }}>
                  Informações do Agendamento
                </Typography>
              </Grid>

              {appointment.googleMeetLink && (
                <Grid item xs={12}>
                  <Box
                    style={{
                      background: "linear-gradient(135deg, #1a73e8 0%, #0d5cbf 100%)",
                      borderRadius: 10,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      marginBottom: 4,
                      boxShadow: "0 2px 8px rgba(26,115,232,0.25)"
                    }}
                  >
                    <VideoCallIcon style={{ color: "#fff", fontSize: 32, flexShrink: 0 }} />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Typography style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                        Google Meet
                      </Typography>
                      <Typography
                        component="a"
                        href={appointment.googleMeetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "rgba(255,255,255,0.85)",
                          fontSize: 12,
                          wordBreak: "break-all",
                          display: "block",
                          textDecoration: "none"
                        }}
                      >
                        {appointment.googleMeetLink}
                      </Typography>
                    </Box>
                    <Button
                      component="a"
                      href={appointment.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      size="small"
                      endIcon={<OpenInNewIcon style={{ fontSize: 14 }} />}
                      style={{
                        background: "#fff",
                        color: "#1a73e8",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        boxShadow: "none",
                        textTransform: "none",
                        fontSize: 13
                      }}
                    >
                      Entrar
                    </Button>
                  </Box>
                </Grid>
              )}

              {(appointment.organizerName || appointment.organizerEmail) && (
                <Grid item xs={12} sm={appointment.participants && appointment.participants.length > 0 ? 6 : 12}>
                  <Box style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 4px" }}>
                    <PersonIcon style={{ color: "#888", fontSize: 18, marginTop: 2, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="caption" style={{ color: "#999", fontWeight: 600, display: "block" }}>Organizador</Typography>
                      <Typography variant="body2" style={{ fontWeight: 500 }}>
                        {appointment.organizerName || ""}
                      </Typography>
                      {appointment.organizerEmail && (
                        <Typography variant="caption" style={{ color: "#666" }}>
                          {appointment.organizerEmail}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
              )}

              {appointment.participants && appointment.participants.length > 0 && (
                <Grid item xs={12} sm={appointment.organizerName || appointment.organizerEmail ? 6 : 12}>
                  <Box style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 4px" }}>
                    <GroupIcon style={{ color: "#888", fontSize: 18, marginTop: 2, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="caption" style={{ color: "#999", fontWeight: 600, display: "block" }}>
                        Participantes ({appointment.participants.length})
                      </Typography>
                      {appointment.participants.map((email, idx) => (
                        <Typography key={idx} variant="body2" style={{ fontWeight: 500 }}>{email}</Typography>
                      ))}
                    </Box>
                  </Box>
                </Grid>
              )}

              {appointment.googleEventId && (
                <Grid item xs={12}>
                  <Typography variant="caption" style={{ color: "#bbb", fontSize: 11, wordBreak: "break-all", display: "block", paddingLeft: 4 }}>
                    ID Google: {appointment.googleEventId}
                  </Typography>
                </Grid>
              )}
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={submitting}
        >
          {submitting ? <CircularProgress size={24} /> : appointment ? "Salvar" : "Criar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentModal;
