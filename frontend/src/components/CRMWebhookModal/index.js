import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Switch,
    FormControlLabel,
    CircularProgress
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(2),
    },
    textField: {
        marginBottom: theme.spacing(2),
    },
}));

const WebhookSchema = Yup.object().shape({
    eventType: Yup.string().required("Obrigatório"),
    url: Yup.string().url("URL inválida").required("Obrigatório"),
    secret: Yup.string().nullable(),
});

const CRMWebhookModal = ({ open, onClose, webhookId, onSave }) => {
    const classes = useStyles();
    const [loading, setLoading] = useState(false);
    const [webhook, setWebhook] = useState({
        eventType: "LEAD_CREATED",
        url: "",
        secret: "",
        isActive: true
    });

    useEffect(() => {
        if (open && webhookId) {
            fetchWebhook();
        } else {
            setWebhook({
                eventType: "LEAD_CREATED",
                url: "",
                secret: "",
                isActive: true
            });
        }
    }, [open, webhookId]);

    const fetchWebhook = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/crm/webhooks`);
            const found = data.find(w => w.id === webhookId);
            if (found) {
                setWebhook(found);
            }
        } catch (err) {
            toast.error("Erro ao carregar dados do webhook");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (values) => {
        try {
            if (webhookId) {
                await api.put(`/crm/webhooks/${webhookId}`, values);
                toast.success("Webhook atualizado com sucesso");
            } else {
                await api.post("/crm/webhooks", values);
                toast.success("Webhook criado com sucesso");
            }
            onSave();
            onClose();
        } catch (err) {
            toast.error("Erro ao salvar webhook");
        }
    };

    const EVENT_TYPES = [
        { value: "LEAD_CREATED", label: "Lead Criado" },
        { value: "LEAD_UPDATED", label: "Lead Atualizado" },
        { value: "LEAD_STATUS_CHANGED", label: "Status do Lead Alterado" },
        { value: "OPPORTUNITY_CREATED", label: "Oportunidade Criada" },
        { value: "OPPORTUNITY_MOVED", label: "Oportunidade Movida" },
        { value: "MEETING_SCHEDULED", label: "Reunião Agendada" },
    ];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{webhookId ? "Editar Webhook" : "Novo Webhook"}</DialogTitle>
            <Formik
                initialValues={webhook}
                enableReinitialize={true}
                validationSchema={WebhookSchema}
                onSubmit={handleSave}
            >
                {({ values, errors, touched, handleChange, isSubmitting }) => (
                    <Form>
                        <DialogContent dividers className={classes.root}>
                            <FormControl variant="outlined" fullWidth className={classes.textField}>
                                <InputLabel>Evento</InputLabel>
                                <Field
                                    as={Select}
                                    label="Evento"
                                    name="eventType"
                                    value={values.eventType}
                                    onChange={handleChange}
                                >
                                    {EVENT_TYPES.map((type) => (
                                        <MenuItem key={type.value} value={type.value}>
                                            {type.label}
                                        </MenuItem>
                                    ))}
                                </Field>
                            </FormControl>

                            <Field
                                as={TextField}
                                label="URL de Destino"
                                name="url"
                                variant="outlined"
                                fullWidth
                                error={touched.url && Boolean(errors.url)}
                                helperText={touched.url && errors.url}
                                className={classes.textField}
                            />

                            <Field
                                as={TextField}
                                label="Chave Secreta (Opcional)"
                                name="secret"
                                variant="outlined"
                                fullWidth
                                placeholder="Para assinatura de segurança"
                                className={classes.textField}
                            />

                            <FormControlLabel
                                control={
                                    <Field
                                        as={Switch}
                                        name="isActive"
                                        checked={values.isActive}
                                        onChange={handleChange}
                                        color="primary"
                                    />
                                }
                                label="Ativo"
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={onClose} color="default" disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" color="primary" variant="contained" disabled={isSubmitting}>
                                {isSubmitting ? <CircularProgress size={24} /> : "Salvar"}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
};

export default CRMWebhookModal;
