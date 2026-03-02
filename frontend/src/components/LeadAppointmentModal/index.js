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

    useEffect(() => {
        if (open) {
            loadData();
            resetForm();
        }
    }, [open, op, user]);

    const loadData = async () => {
        try {
            const { data: schedulesRes } = await api.get("/user-schedules");
            setSchedules(schedulesRes.schedules || []);
        } catch (err) {
            console.error("Erro ao carregar agendas:", err);
        }
    };

    const resetForm = () => {
        setTitle(`Reunião: ${(op && op.title) || (op && op.name) || "Novo Lead"}`);
        setDescription("Reunião de negócios para consultoria e análise estratégica.");
        setClientEmail((op && op.contact && op.contact.email) || (op && op.lead && op.lead.email) || "");
        setOrganizerEmail((user && user.email) || "");
        setStartDatetime("");
        setDurationMinutes("60");
        setScheduleId("");
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
                clientId: null // Não vincular como client_id para evitar erro de Foreign Key (pois é um Lead, não CRM Client)
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
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Agendar Reunião (Integração Agenda)</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
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

                    <Grid item xs={12}>
                        <TextField
                            label="Descrição do evento"
                            fullWidth
                            multiline
                            rows={3}
                            variant="outlined"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </Grid>

                    <Grid item xs={12} sm={12}>
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
