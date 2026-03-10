import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Container,
    Grid,
    Paper,
    TextField,
    Typography,
    Switch,
    FormControlLabel,
    CircularProgress
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import MailOutlineIcon from "@mui/icons-material/MailOutline";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
    root: {
        padding: theme.spacing(3),
    },
    paper: {
        padding: theme.spacing(4),
        borderRadius: theme.spacing(2),
    },
    header: {
        marginBottom: theme.spacing(3),
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(2),
    },
    btnSave: {
        marginTop: theme.spacing(3),
        padding: theme.spacing(1.5, 4),
        borderRadius: 8,
        textTransform: "none",
        fontWeight: 600,
    }
}));

const Smtp = () => {
    const classes = useStyles();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const [settings, setSettings] = useState({
        host: "",
        port: 587,
        user: "",
        password: "",
        secure: false,
        senderName: "",
        senderEmail: ""
    });

    useEffect(() => {
        fetchSmtp();
    }, []);

    const fetchSmtp = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/smtp");
            if (data) {
                setSettings({
                    ...data,
                    password: "" // Don't show password (backend doesn't send it anyway)
                });
            }
        } catch (err) {
            toastError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post("/smtp", settings);
            toast.success("Configurações SMTP salvas com sucesso!");
            // After save, we clear password locally to signal it's handled
            setSettings(prev => ({ ...prev, password: "" }));
        } catch (err) {
            toastError(err);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleTestSmtp = async () => {
        const emailDestino = prompt("Digite o e-mail de destino para o teste:");
        if (!emailDestino) return;
        
        setTesting(true);
        try {
            await api.post("/smtp/test", { emailDestino });
            toast.success("SMTP configurado com sucesso");
        } catch (err) {
            toastError(err);
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md" className={classes.root}>
            <Paper className={classes.paper} elevation={2}>
                <div className={classes.header}>
                    <MailOutlineIcon color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="h5" style={{ fontWeight: 700 }}>Configuração SMTP</Typography>
                </div>

                <Typography variant="body2" color="textSecondary" style={{ marginBottom: 24 }}>
                    Configure o servidor de e-mail da sua empresa para habilitar o envio de e-mails diretamente pelo painel do Lead.
                    Compatível com Gmail, Outlook e outros provedores SMTP.
                </Typography>

                <form onSubmit={handleSave}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={8}>
                            <TextField
                                fullWidth
                                label="Host do Servidor"
                                name="host"
                                placeholder="smtp.gmail.com"
                                variant="outlined"
                                value={settings.host}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Porta"
                                name="port"
                                type="number"
                                placeholder="587"
                                variant="outlined"
                                value={settings.port}
                                onChange={handleChange}
                                required
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Usuário / E-mail de Login"
                                name="user"
                                variant="outlined"
                                value={settings.user}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Senha"
                                name="password"
                                type="password"
                                placeholder={settings.host ? "••••••••" : "Digite a senha"}
                                variant="outlined"
                                value={settings.password}
                                onChange={handleChange}
                                helperText="Deixe em branco se não quiser alterar"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Nome do Remetente"
                                name="senderName"
                                placeholder="Time de Vendas"
                                variant="outlined"
                                value={settings.senderName}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="E-mail do Remetente"
                                name="senderEmail"
                                placeholder="vendas@empresa.com"
                                variant="outlined"
                                value={settings.senderEmail}
                                onChange={handleChange}
                                required
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.secure}
                                        onChange={handleChange}
                                        name="secure"
                                        color="primary"
                                    />
                                }
                                label="Usar SSL/TLS (Criptografia Segura)"
                            />
                        </Grid>
                    </Grid>

                    <Box display="flex" justifyContent="flex-end" style={{ gap: "10px" }}>
                        <Button
                            className={classes.btnSave}
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={saving || testing}
                        >
                            {saving ? <CircularProgress size={24} color="inherit" /> : "Salvar Configurações"}
                        </Button>
                        <Button
                            className={classes.btnSave}
                            onClick={handleTestSmtp}
                            variant="contained"
                            style={{ backgroundColor: "#00d4ff", color: "#fff" }}
                            disabled={saving || testing}
                        >
                            {testing ? <CircularProgress size={24} color="inherit" /> : "Testar SMTP"}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
};

export default Smtp;
