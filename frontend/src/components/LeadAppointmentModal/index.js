import React, { useState, useEffect, useContext } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import CircularProgress from "@material-ui/core/CircularProgress";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LeadAppointmentModal = ({ open, onClose, op, onSuccess }) => {
    const { user } = useContext(AuthContext);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("Reunião de negócios para consultoria e análise estratégica.");
    const [clientEmail, setClientEmail] = useState("");
    const [organizerEmail, setOrganizerEmail] = useState("");
    const [startDatetime, setStartDatetime] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("60");
    const [scheduleId, setScheduleId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [schedules, setSchedules] = useState([]);

    // Novos campos
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
    }, [open, op, user]);

    useEffect(() => {
        if (scheduleId) {
            const schedule = schedules.find(s => String(s.id) === String(scheduleId));
            if (schedule && schedule.user && schedule.user.email) {
                setOrganizerEmail(schedule.user.email);
            }
        }
    }, [scheduleId, schedules]);

    const getCurrentLocalDatetime = () => {
        const now = new Date();
        const pad = n => String(n).padStart(2, "0");
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    };

    const loadData = async () => {
        try {
            const { data: schedulesRes } = await api.get("/user-schedules");
            const fetched = schedulesRes.schedules || [];
            setSchedules(fetched);
            const active = fetched.filter(s => s.active);
            if (active.length === 1) {
                setScheduleId(String(active[0].id));
            }
        } catch (err) {
            console.error("Erro ao carregar agendas:", err);
        }

        try {
            const { data: usersRes } = await api.get("/users/list");
            setUsers(Array.isArray(usersRes) ? usersRes : []);
        } catch (err) {
            console.error("Erro ao carregar usuários:", err);
        }
    };

    const resetForm = () => {
        setTitle(`Reunião: ${(op && op.title) || (op && op.name) || (op && op.lead && op.lead.name) || "Novo Lead"}`);
        setDescription("Reunião de negócios para consultoria e análise estratégica.");
        setClientEmail((op && op.contact && op.contact.email) || (op && op.lead && op.lead.email) || "");
        setOrganizerEmail("");
        setStartDatetime(getCurrentLocalDatetime());
        setDurationMinutes("60");
        setScheduleId("");
        // Pré-preencher nome e telefone do lead
        setLeadName(
            (op && op.lead && op.lead.name) ||
            (op && op.contact && op.contact.name) ||
            (op && op.name) ||
            (op && op.title) ||
            ""
        );
        setLeadPhone(
            (op && op.contact && op.contact.number) ||
            (op && op.lead && op.lead.phone) ||
            ""
        );
        setParticipantEmails("");
        setMeetingLink("");
        setOperationalNote("");
        setCreatedByUserId((user && user.id) ? String(user.id) : "");
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error("O Nome do evento é obrigatório");
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

            if (clientEmail || organizerEmail) {
                finalDescription += "\n\n--- INFORMAÇÕES ADICIONAIS ---";
                if (clientEmail) finalDescription += `\nE-mail do Cliente (Lead): ${clientEmail}`;
                if (organizerEmail) finalDescription += `\nE-mail do Organizador: ${organizerEmail}`;
            }

            const payload = {
                title: title.trim(),
                description: finalDescription,
                clientEmail: clientEmail ? clientEmail.trim() : null,
                organizerEmail: organizerEmail ? organizerEmail.trim() : null,
                startDatetime: startDatetime,
                durationMinutes: parseInt(durationMinutes, 10) || 60,
                status: "scheduled",
                scheduleId: parseInt(scheduleId, 10),
                contactId: (op && op.contact && op.contact.id) || null,
                clientId: null, // Lead não é CRM Client
                leadName: leadName.trim() || null,
                leadPhone: leadPhone.trim() || null,
                participantEmails: parsedParticipantEmails,
                meetingLink: meetingLink.trim() || null,
                operationalNote: operationalNote.trim() || null,
                createdByUserId: createdByUserId ? parseInt(createdByUserId, 10) : null
            };

            await api.post("/appointments", payload);

            toast.success("Compromisso criado na Agenda com sucesso!");

            if (onSuccess) {
                onSuccess();
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
            <DialogTitle>Agendar Reunião (Integração Agenda)</DialogTitle>
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

                    {/* Nome do lead (pré-preenchido) */}
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

                    {/* Telefone WhatsApp do lead (pré-preenchido) */}
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

                    {/* E-mails */}
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="E-mail do cliente (Lead)"
                            fullWidth
                            variant="outlined"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            placeholder="cliente@email.com"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="E-mail do organizador"
                            fullWidth
                            variant="outlined"
                            value={organizerEmail}
                            onChange={(e) => setOrganizerEmail(e.target.value)}
                            placeholder="seu@email.com"
                        />
                    </Grid>

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
                            helperText="Opcional — insira um link de videoconferência"
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
                                    {u.name} {u.id === (user && user.id) ? "(você)" : ""}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    {/* Agenda */}
                    <Grid item xs={12}>
                        <TextField
                            select
                            label="Agenda"
                            fullWidth
                            required
                            variant="outlined"
                            value={scheduleId}
                            onChange={(e) => setScheduleId(e.target.value)}
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
                    {submitting ? <CircularProgress size={24} /> : "Criar Evento"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LeadAppointmentModal;
