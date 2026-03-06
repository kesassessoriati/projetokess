import React, { useState, useEffect, useContext } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Typography,
    IconButton,
    Button,
    Grid,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    makeStyles,
    Tabs,
    Tab,
    Box,
    CircularProgress,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import WhatshotIcon from "@material-ui/icons/Whatshot";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import StopIcon from "@material-ui/icons/Stop";
import SettingsIcon from "@material-ui/icons/Settings";
import TimelineIcon from "@material-ui/icons/Timeline";
import api from "../../services/api";
import { toast } from "react-toastify";
import format from "date-fns/format";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useSocket } from "../../context/SocketContext";

const useStyles = makeStyles((theme) => ({
    dialogPaper: {
        borderRadius: "16px",
        background: "#1E1E1E", // Dark theme
        color: "#fff",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        minWidth: "650px",
        maxWidth: "800px",
        [theme.breakpoints.down('sm')]: {
            minWidth: "95%",
            margin: "0 auto",
        },
    },
    dialogTitle: {
        background: "#111",
        padding: "20px 24px",
        borderBottom: "1px solid #2A2A2A",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        "& h2": {
            fontSize: "1.3rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontFamily: "Inter, sans-serif"
        }
    },
    closeButton: {
        color: "#999",
        transition: "all 0.2s",
        "&:hover": {
            backgroundColor: "#2A2A2A",
            color: "#fff",
        }
    },
    dialogContent: {
        padding: "24px",
        background: "#1E1E1E",
        minHeight: "400px"
    },
    inputField: {
        marginBottom: "16px",
        "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            backgroundColor: "#2A2A2A",
            color: "#fff",
            "& fieldset": { borderColor: "#333" },
            "&:hover fieldset": { borderColor: "#555" },
            "&.Mui-focused fieldset": { borderColor: "#888", borderWidth: "1px" },
        },
        "& .MuiInputLabel-root": { color: "#aaa" },
        "& .MuiInputLabel-root.Mui-focused": { color: "#fff" },
        "& .MuiSelect-icon": { color: "#aaa" }
    },
    menuPaper: {
        backgroundColor: "#2A2A2A",
        color: "#fff",
        border: "1px solid #333",
        "& .MuiMenuItem-root": {
            "&:hover": { backgroundColor: "#333" },
        }
    },
    buttonPrimary: {
        background: "linear-gradient(135deg, #f97316, #ea580c)",
        color: "white",
        borderRadius: "8px",
        padding: "10px 24px",
        textTransform: "none",
        fontWeight: 600,
        boxShadow: "0 4px 15px rgba(234, 88, 12, 0.4)",
        "&:hover": {
            background: "linear-gradient(135deg, #ea580c, #c2410c)",
            boxShadow: "0 6px 20px rgba(234, 88, 12, 0.6)",
        },
        "&:disabled": {
            background: "#333",
            color: "#888",
        }
    },
    tabRoot: {
        borderBottom: "1px solid #2A2A2A",
        marginBottom: "20px"
    },
    tab: {
        color: "#aaa",
        textTransform: "none",
        fontWeight: 500,
        "&.Mui-selected": {
            color: "#f97316"
        }
    },
    tabIndicator: {
        backgroundColor: "#f97316"
    },
    metricCard: {
        backgroundColor: "#2A2A2A",
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid #333",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
    },
    metricTitle: {
        fontSize: "0.85rem",
        color: "#aaa",
        textTransform: "uppercase"
    },
    metricValue: {
        fontSize: "1.5rem",
        fontWeight: 700,
        color: "#fff"
    },
    logsContainer: {
        backgroundColor: "#111",
        borderRadius: "8px",
        padding: "16px",
        height: "300px",
        overflowY: "auto",
        fontFamily: "monospace",
        fontSize: "0.85rem",
        border: "1px solid #2A2A2A",
        "&::-webkit-scrollbar": { width: "6px" },
        "&::-webkit-scrollbar-track": { background: "#111" },
        "&::-webkit-scrollbar-thumb": { background: "#444", borderRadius: "4px" }
    },
    logLine: {
        padding: "4px 0",
        borderBottom: "1px dashed #2A2A2A",
        color: "#ccc"
    },
    statusIndicator: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        display: "inline-block",
        marginRight: "8px"
    }
}));

const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box>{children}</Box>}
        </div>
    );
};

const WhatsAppWarmupModal = ({ open, onClose }) => {
    const classes = useStyles();
    const { user } = useContext(AuthContext);
    const { on } = useSocket();
    const [tab, setTab] = useState(0);
    const [whatsapps, setWhatsapps] = useState([]);
    const [selectedWhatsapp, setSelectedWhatsapp] = useState("");
    const [loading, setLoading] = useState(false);

    const [config, setConfig] = useState({
        isActive: false,
        messagesPerDay: 50,
        minInterval: 1, // minutes
        maxInterval: 5, // minutes
        startTime: "09:00",
        endTime: "21:00",
        maxInteractionsPerHour: 10
    });

    const [metrics, setMetrics] = useState({
        healthScore: "good", // good, medium, bad
        status: "stopped",
        messagesSentToday: 0,
        simulatedMessages: 0,
        avgResponseTime: "0"
    });

    const [logs, setLogs] = useState([]);

    useEffect(() => {
        if (open) {
            fetchWhatsapps();
        }
    }, [open]);

    useEffect(() => {
        if (selectedWhatsapp) {
            fetchConfig(selectedWhatsapp);
            fetchLogs(selectedWhatsapp);
        }
    }, [selectedWhatsapp]);

    // Real-time log updates via socket
    useEffect(() => {
        if (!open || !user?.companyId) return;
        const eventName = `company-${user.companyId}-warmup-log`;
        const cleanup = on(eventName, (data) => {
            if (data.action === "create" && data.log) {
                setLogs(prev => [data.log, ...prev].slice(0, 50));
            }
        });
        return cleanup;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, user?.companyId]);

    const fetchWhatsapps = async () => {
        try {
            const { data } = await api.get("/whatsapp/?session=0");
            setWhatsapps(data);
            if (data.length > 0 && !selectedWhatsapp) {
                setSelectedWhatsapp(data[0].id);
            }
        } catch (err) {
            toast.error("Erro ao carregar conexões WhatsApp");
        }
    };

    const fetchConfig = async (whatsappId) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/whatsapp-warmup/${whatsappId}`);
            if (data) {
                setConfig({
                    isActive: data.isActive,
                    messagesPerDay: data.messagesPerDay || 50,
                    minInterval: data.minInterval || 1,
                    maxInterval: data.maxInterval || 5,
                    startTime: data.startTime || "09:00",
                    endTime: data.endTime || "21:00",
                    maxInteractionsPerHour: data.maxInteractionsPerHour || 10
                });
                setMetrics({
                    healthScore: data.healthScore || "good",
                    status: data.isActive ? "running" : "stopped",
                    messagesSentToday: data.messagesSentToday || 0,
                    simulatedMessages: data.simulatedMessages || 0,
                    avgResponseTime: data.avgResponseTime || "0"
                });
            } else {
                // Reset defaults
                setConfig({
                    isActive: false,
                    messagesPerDay: 50,
                    minInterval: 1,
                    maxInterval: 5,
                    startTime: "09:00",
                    endTime: "21:00",
                    maxInteractionsPerHour: 10
                });
            }
        } catch (err) {
            console.log(err);
        }
        setLoading(false);
    };

    const fetchLogs = async (whatsappId) => {
        try {
            const { data } = await api.get(`/whatsapp-warmup/${whatsappId}/logs`);
            setLogs(data || []);
        } catch (err) {
            console.log(err);
        }
    };

    const handleSaveConfig = async () => {
        if (!selectedWhatsapp) return;
        setLoading(true);
        try {
            await api.post(`/whatsapp-warmup/${selectedWhatsapp}`, config);
            toast.success("Configuração salva com sucesso");

            // Update metrics status if changed
            setMetrics(prev => ({
                ...prev,
                status: config.isActive ? "running" : "stopped"
            }));
        } catch (err) {
            toast.error("Erro ao salvar configuração");
        }
        setLoading(false);
    };

    const handleToggleState = async () => {
        const nextState = !config.isActive;
        setConfig(prev => ({ ...prev, isActive: nextState }));
        // Automatically save string toggle
        try {
            await api.post(`/whatsapp-warmup/${selectedWhatsapp}`, { ...config, isActive: nextState });
            if (nextState) toast.success("Aquecimento iniciado!");
            else toast.info("Aquecimento pausado.");
            setMetrics(prev => ({ ...prev, status: nextState ? "running" : "stopped" }));
        } catch (err) {
            toast.error("Erro ao alterar status");
            setConfig(prev => ({ ...prev, isActive: !nextState })); // rollback
        }
    };

    const NUMBER_FIELDS = ["messagesPerDay", "minInterval", "maxInterval", "maxInteractionsPerHour"];
    const handleChangeConfig = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: NUMBER_FIELDS.includes(name) ? parseInt(value, 10) || 0 : value }));
    };

    const getHealthColor = (score) => {
        if (score === "good") return "#22c55e"; // Green
        if (score === "medium") return "#eab308"; // Yellow
        return "#ef4444"; // Red
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            classes={{ paper: classes.dialogPaper }}
        >
            <DialogTitle className={classes.dialogTitle} disableTypography>
                <Typography variant="h2">
                    <WhatshotIcon style={{ color: "#f97316" }} />
                    Aquecimento WhatsApp
                </Typography>
                <IconButton className={classes.closeButton} onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent className={classes.dialogContent}>
                <Grid container spacing={3}>
                    {/* Top section: Select WhatsApp & Status */}
                    <Grid item xs={12} md={8}>
                        <FormControl variant="outlined" fullWidth className={classes.inputField}>
                            <InputLabel id="whatsapp-select-label">Número Conectado</InputLabel>
                            <Select
                                labelId="whatsapp-select-label"
                                value={selectedWhatsapp}
                                onChange={(e) => setSelectedWhatsapp(e.target.value)}
                                label="Número Conectado"
                                MenuProps={{ classes: { paper: classes.menuPaper } }}
                            >
                                {whatsapps.map((wa) => (
                                    <MenuItem key={wa.id} value={wa.id}>
                                        {wa.name} ({wa.number})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '16px' }}>
                        <Button
                            className={classes.buttonPrimary}
                            onClick={handleToggleState}
                            disabled={!selectedWhatsapp || loading}
                            style={{
                                background: config.isActive ? "linear-gradient(135deg, #ef4444, #b91c1c)" : undefined
                            }}
                            startIcon={config.isActive ? <StopIcon /> : <PlayArrowIcon />}
                        >
                            {config.isActive ? "Parar Aquecimento" : "Iniciar Aquecimento"}
                        </Button>
                    </Grid>
                </Grid>

                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    className={classes.tabRoot}
                    classes={{ indicator: classes.tabIndicator }}
                >
                    <Tab label="Dashboard" className={classes.tab} icon={<TimelineIcon style={{ marginBottom: 0, marginRight: 8 }} />} style={{ flexDirection: 'row' }} />
                    <Tab label="Configuração" className={classes.tab} icon={<SettingsIcon style={{ marginBottom: 0, marginRight: 8 }} />} style={{ flexDirection: 'row' }} />
                </Tabs>

                {/* Dashboard Tab */}
                <TabPanel value={tab} index={0}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <div className={classes.metricCard}>
                                <Typography className={classes.metricTitle}>Score de Saúde</Typography>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span className={classes.statusIndicator} style={{ backgroundColor: getHealthColor(metrics.healthScore) }} />
                                    <Typography className={classes.metricValue}>
                                        {metrics.healthScore === "good" ? "Saudável" : metrics.healthScore === "medium" ? "Médio Risco" : "Alto Risco"}
                                    </Typography>
                                </div>
                            </div>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <div className={classes.metricCard}>
                                <Typography className={classes.metricTitle}>Status</Typography>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span className={classes.statusIndicator} style={{ backgroundColor: metrics.status === 'running' ? '#22c55e' : '#aaa' }} />
                                    <Typography className={classes.metricValue}>
                                        {metrics.status === "running" ? "Rodando" : "Parado"}
                                    </Typography>
                                </div>
                            </div>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <div className={classes.metricCard}>
                                <Typography className={classes.metricTitle}>Mensagens Hoje</Typography>
                                <Typography className={classes.metricValue}>{metrics.messagesSentToday}</Typography>
                            </div>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="h6" style={{ margin: "16px 0 8px", fontSize: "1rem" }}>
                                Logs de Execução em Tempo Real
                            </Typography>
                            <div className={classes.logsContainer}>
                                {logs.length === 0 ? (
                                    <div style={{ color: "#777", textAlign: "center", padding: "20px" }}>
                                        Nenhum log registrado para este número nas últimas 24 horas.
                                    </div>
                                ) : (
                                    logs.map((log, idx) => (
                                        <div key={idx} className={classes.logLine}>
                                            <span style={{ color: "#aaa" }}>[{format(new Date(log.createdAt), "dd/MM HH:mm:ss")}]</span>{" "}
                                            <span style={{ color: "#f97316" }}>[{log.type}]</span>{" "}
                                            {log.message}
                                        </div>
                                    ))
                                )}
                            </div>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Configurations Tab */}
                <TabPanel value={tab} index={1}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Volume de mensagens / dia"
                                name="messagesPerDay"
                                type="number"
                                value={config.messagesPerDay}
                                onChange={handleChangeConfig}
                                fullWidth
                                variant="outlined"
                                className={classes.inputField}
                                helperText="Quantas interações tentar fazer por dia"
                                FormHelperTextProps={{ style: { color: "#777" } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Máx Interações / hora"
                                name="maxInteractionsPerHour"
                                type="number"
                                value={config.maxInteractionsPerHour}
                                onChange={handleChangeConfig}
                                fullWidth
                                variant="outlined"
                                className={classes.inputField}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Intervalo mínimo (minutos)"
                                name="minInterval"
                                type="number"
                                value={config.minInterval}
                                onChange={handleChangeConfig}
                                fullWidth
                                variant="outlined"
                                className={classes.inputField}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Intervalo máximo (minutos)"
                                name="maxInterval"
                                type="number"
                                value={config.maxInterval}
                                onChange={handleChangeConfig}
                                fullWidth
                                variant="outlined"
                                className={classes.inputField}
                                helperText="O bot vai sortear os envios entre esses dois intervalos."
                                FormHelperTextProps={{ style: { color: "#777" } }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Horário de Início"
                                name="startTime"
                                type="time"
                                value={config.startTime}
                                onChange={handleChangeConfig}
                                fullWidth
                                variant="outlined"
                                className={classes.inputField}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Horário de Término"
                                name="endTime"
                                type="time"
                                value={config.endTime}
                                onChange={handleChangeConfig}
                                fullWidth
                                variant="outlined"
                                className={classes.inputField}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid item xs={12} style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                            <Button
                                variant="contained"
                                className={classes.buttonPrimary}
                                onClick={handleSaveConfig}
                                disabled={loading || !selectedWhatsapp}
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : "Salvar Configuração"}
                            </Button>
                        </Grid>
                    </Grid>
                </TabPanel>

            </DialogContent>
        </Dialog>
    );
}

export default WhatsAppWarmupModal;
