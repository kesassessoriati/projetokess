import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    IconButton,
    makeStyles,
    Box,
    Typography,
    Tabs,
    Tab,
    Button,
    TextField,
    Avatar,
    Paper,
    Divider,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import ListAltIcon from "@material-ui/icons/ListAlt";
import EventNoteIcon from "@material-ui/icons/EventNote";
import ScheduleIcon from "@material-ui/icons/Schedule";
import MailOutlineIcon from "@material-ui/icons/MailOutline";
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import InfoIcon from "@material-ui/icons/Info";
import { toast } from "react-toastify";
import LeadModal from "../LeadModal";
import LeadChat from "../LeadChat";
import LeadAppointmentModal from "../LeadAppointmentModal";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
    dialogPaper: {
        borderRadius: 8,
        backgroundColor: "#f4f5f7",
        minHeight: "85vh",
    },
    closeButton: {
        position: "absolute",
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: theme.palette.grey[500],
        zIndex: 10,
    },
    leftPanel: {
        backgroundColor: "#ffffff",
        borderRight: "1px solid #e0e0e0",
        padding: theme.spacing(3),
        height: "100%",
        [theme.breakpoints.down("sm")]: {
            borderRight: "none",
            borderBottom: "1px solid #e0e0e0",
            height: "auto",
        },
    },
    rightPanel: {
        padding: theme.spacing(3),
        height: "100%",
        display: "flex",
        flexDirection: "column",
    },
    tabsContainer: {
        backgroundColor: "#ffffff",
        borderRadius: "8px 8px 0 0",
        border: "1px solid #e0e0e0",
        borderBottom: "none",
    },
    tabContent: {
        backgroundColor: "#ffffff",
        border: "1px solid #e0e0e0",
        borderRadius: "0 8px 8px 8px",
        padding: theme.spacing(3),
        flexGrow: 1,
        overflowY: "auto",
    },
    sectionTitle: {
        fontWeight: 700,
        color: "#303030",
        marginBottom: theme.spacing(2),
        display: "flex",
        alignItems: "center",
    },
    activityInput: {
        backgroundColor: "#fff",
        borderRadius: 4,
        "& fieldset": {
            borderColor: "#dcdcdc",
        },
    },
    actionBox: {
        display: "flex",
        gap: 8,
        marginTop: 8,
        alignItems: "center",
    },
}));

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            {...other}
            style={{ height: "100%", display: value === index ? "flex" : "none", flexDirection: "column" }}
        >
            {value === index && children}
        </div>
    );
}

const UniversalLeadModal = ({ open, onClose, op, leadId, onSuccess }) => {
    const classes = useStyles();
    const [tabValue, setTabValue] = useState(0);
    const [activityText, setActivityText] = useState("");
    const [noteText, setNoteText] = useState("");
    const [activityType, setActivityType] = useState("LIGACAO");
    const [leadAppointmentOpen, setLeadAppointmentOpen] = useState(false);
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    useEffect(() => {
        if (open && op?.id && (tabValue === 1 || tabValue === 2)) {
            fetchActivities();
        }
    }, [open, op?.id, tabValue]);

    const fetchActivities = async () => {
        try {
            setLoadingActivities(true);
            const { data } = await api.get(`/opportunities/${op.id}/events`);
            setActivities(data);
        } catch (err) {
            toast.error("Erro ao carregar atividades");
        } finally {
            setLoadingActivities(false);
        }
    };

    if (!op && !leadId && open && false) {
        return null; // bloqueio removido para permitir a criação de um Novo Lead
    }

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleSaveActivity = async () => {
        if (!activityText.trim()) return;
        if (!op?.id) {
            toast.error("Salve a oportunidade primeiro para registrar atividades.");
            return;
        }

        try {
            await api.post(`/opportunities/${op.id}/events`, {
                type: activityType,
                metadata: { text: activityText }
            });
            toast.success("Atividade registrada");
            setActivityText("");
            fetchActivities();
        } catch (err) {
            toast.error("Erro ao salvar atividade");
        }
    };

    const handleSaveNote = async () => {
        if (!noteText.trim()) return;
        if (!op?.id) {
            toast.error("Salve a oportunidade primeiro para adicionar anotações.");
            return;
        }

        try {
            await api.post(`/opportunities/${op.id}/events`, {
                type: "ANOTACAO",
                metadata: { text: noteText }
            });
            toast.success("Anotação adicionada");
            setNoteText("");
            fetchActivities();
        } catch (err) {
            toast.error("Erro ao salvar anotação");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ className: classes.dialogPaper }}>
            <IconButton onClick={onClose} className={classes.closeButton}>
                <CloseIcon />
            </IconButton>
            <Box display="flex" flexDirection={{ xs: "column", md: "row" }} height="100%">

                {/* LEFT PANEL - DETALHES DO LEAD / OPORTUNIDADE */}
                <Box width={{ xs: "100%", md: "30%" }} className={classes.leftPanel}>
                    <Box display="flex" alignItems="center" mb={3}>
                        <Avatar style={{ width: 48, height: 48, marginRight: 16, backgroundColor: "#10b981" }}>
                            {op?.contact?.name?.[0] || op?.lead?.name?.[0] || "L"}
                        </Avatar>
                        <Box>
                            <Typography variant="h6" style={{ fontWeight: 800, lineHeight: 1.1 }}>
                                {op?.title || op?.name || op?.lead?.name || "Novo Lead"}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                {op?.contact?.name || op?.lead?.name || "Sem contato associado"}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider style={{ my: 2 }} />

                    <Box mt={2} mb={2}>
                        <Typography variant="subtitle2" color="textSecondary" style={{ fontWeight: 600 }}>VALOR DA OPORTUNIDADE</Typography>
                        <Typography variant="h5" style={{ fontWeight: 800, color: "#1e293b" }}>
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(op?.value || 0)}
                        </Typography>
                    </Box>

                    <Divider style={{ my: 2 }} />

                    <Box mt={2}>
                        <Typography variant="subtitle2" color="textSecondary" style={{ fontWeight: 600, marginBottom: 8 }}>INFORMAÇÕES ADICIONAIS</Typography>
                        <Typography variant="body2"><strong>Status:</strong> {op?.status || "Novo"}</Typography>
                        <Typography variant="body2"><strong>Risco IA:</strong> {op?.prediction?.riskLevel || "N/A"}</Typography>
                        <Typography variant="body2"><strong>Criado em:</strong> {op?.createdAt ? new Date(op.createdAt).toLocaleDateString() : "-"}</Typography>
                    </Box>
                </Box>

                {/* RIGHT PANEL - ABAS DE AÇÃO (ESTILO PIPEDRIVE) */}
                <Box width={{ xs: "100%", md: "70%" }} className={classes.rightPanel}>
                    <Paper className={classes.tabsContainer} elevation={0}>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            indicatorColor="primary"
                            textColor="primary"
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            <Tab icon={<InfoIcon fontSize="small" />} label="Informações" style={{ minWidth: 100 }} />
                            <Tab icon={<ListAltIcon fontSize="small" />} label="Atividade" style={{ minWidth: 100 }} />
                            <Tab icon={<EventNoteIcon fontSize="small" />} label="Anotações" style={{ minWidth: 100 }} />
                            <Tab icon={<ScheduleIcon fontSize="small" />} label="Agendador" style={{ minWidth: 100 }} />
                            <Tab icon={<MailOutlineIcon fontSize="small" />} label="E-mail" style={{ minWidth: 100 }} />
                            <Tab icon={<ChatBubbleOutlineIcon fontSize="small" />} label="Chat" style={{ minWidth: 100 }} />
                            <Tab icon={<AttachFileIcon fontSize="small" />} label="Arquivos" style={{ minWidth: 100 }} />
                        </Tabs>
                    </Paper>

                    <Paper className={classes.tabContent} elevation={0}>

                        {/* Informações: Formulário completo usando LeadModal (isEmbedded) */}
                        <TabPanel value={tabValue} index={0}>
                            <LeadModal
                                open={true}
                                onClose={onClose}
                                leadId={leadId || op?.leadId || null}
                                contactId={op?.contact?.id || null}
                                onSuccess={onSuccess}
                                isEmbedded={true}
                                opId={op?.id || null}
                            />
                        </TabPanel>

                        {/* Atividade / Ligações */}
                        <TabPanel value={tabValue} index={1}>
                            <Typography className={classes.sectionTitle}>
                                <ListAltIcon style={{ marginRight: 8 }} /> Registro de Atividades e Ligações
                            </Typography>
                            <Box mb={3} p={2} style={{ border: "1px solid #e0e0e0", borderRadius: 8, backgroundColor: "#fafafa" }}>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    placeholder="Ex: Ligou 2 vezes, não atendeu. / Apresentação realizada..."
                                    size="small"
                                    className={classes.activityInput}
                                    value={activityText}
                                    onChange={(e) => setActivityText(e.target.value)}
                                />
                                <Box className={classes.actionBox}>
                                    <Button
                                        variant={activityType === "LIGACAO" ? "contained" : "outlined"}
                                        color={activityType === "LIGACAO" ? "primary" : "default"}
                                        size="small"
                                        style={{ textTransform: "none", boxShadow: "none" }}
                                        onClick={() => setActivityType("LIGACAO")}
                                    >
                                        📱 Ligação
                                    </Button>
                                    <Button
                                        variant={activityType === "REUNIAO" ? "contained" : "outlined"}
                                        color={activityType === "REUNIAO" ? "primary" : "default"}
                                        size="small"
                                        style={{ textTransform: "none", boxShadow: "none" }}
                                        onClick={() => setActivityType("REUNIAO")}
                                    >
                                        👥 Reunião
                                    </Button>
                                    <Button
                                        variant={activityType === "TAREFA" ? "contained" : "outlined"}
                                        color={activityType === "TAREFA" ? "primary" : "default"}
                                        size="small"
                                        style={{ textTransform: "none", boxShadow: "none" }}
                                        onClick={() => setActivityType("TAREFA")}
                                    >
                                        🎯 Tarefa
                                    </Button>
                                    <Box flexGrow={1} />
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        style={{ textTransform: "none", backgroundColor: "#10b981", boxShadow: "none" }}
                                        onClick={handleSaveActivity}
                                    >
                                        Salvar
                                    </Button>
                                </Box>
                            </Box>

                            <Typography variant="subtitle2" style={{ fontWeight: 600, color: "#999", marginBottom: 8 }}>HISTÓRICO</Typography>
                            <Box style={{ borderLeft: "2px solid #e0e0e0", paddingLeft: 16 }}>
                                {loadingActivities ? (
                                    <Typography variant="body2" color="textSecondary">Carregando atividades...</Typography>
                                ) : activities.filter(a => a.type !== "ANOTACAO").length > 0 ? (
                                    activities.filter(a => a.type !== "ANOTACAO").map(act => (
                                        <Box key={act.id} mb={2}>
                                            <Typography variant="caption" color="textSecondary">
                                                {new Date(act.createdAt).toLocaleString()} • {act.type}
                                            </Typography>
                                            <Typography variant="body2" style={{ fontWeight: 500, marginTop: 4 }}>
                                                {act.metadata?.text || "-"}
                                            </Typography>
                                        </Box>
                                    ))
                                ) : (
                                    <Typography variant="body2" style={{ fontWeight: 600 }}>Nenhuma atividade registrada ainda.</Typography>
                                )}
                            </Box>
                        </TabPanel>

                        {/* Anotações Gerais */}
                        <TabPanel value={tabValue} index={2}>
                            <Typography className={classes.sectionTitle}>
                                <EventNoteIcon style={{ marginRight: 8 }} /> Anotações
                            </Typography>
                            <TextField
                                fullWidth
                                variant="outlined"
                                placeholder="Comece a digitar uma anotação..."
                                multiline
                                rows={4}
                                style={{ backgroundColor: "#fef3c7" }}
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                            />
                            <Box display="flex" justifyContent="flex-end" mt={1} mb={3}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    style={{ backgroundColor: "#f59e0b", color: "white", boxShadow: "none", textTransform: "none" }}
                                    onClick={handleSaveNote}
                                >
                                    Adicionar anotação
                                </Button>
                            </Box>

                            <Typography variant="subtitle2" style={{ fontWeight: 600, color: "#999", marginBottom: 8 }}>MURAL DE ANOTAÇÕES</Typography>
                            <Box>
                                {loadingActivities ? (
                                    <Typography variant="body2" color="textSecondary">Carregando anotações...</Typography>
                                ) : activities.filter(a => a.type === "ANOTACAO").length > 0 ? (
                                    activities.filter(a => a.type === "ANOTACAO").map(note => (
                                        <Box key={note.id} mb={2} p={2} style={{ backgroundColor: "#fef9c3", borderRadius: 8, border: "1px solid #fde047" }}>
                                            <Typography variant="caption" color="textSecondary">
                                                {new Date(note.createdAt).toLocaleString()}
                                            </Typography>
                                            <Typography variant="body2" style={{ fontWeight: 500, marginTop: 4, whiteSpace: "pre-wrap" }}>
                                                {note.metadata?.text || "-"}
                                            </Typography>
                                        </Box>
                                    ))
                                ) : (
                                    <Typography variant="body2" style={{ fontWeight: 600, color: "#777" }}>Nenhuma anotação registrada ainda.</Typography>
                                )}
                            </Box>
                        </TabPanel>

                        {/* Agendador */}
                        <TabPanel value={tabValue} index={3}>
                            <Typography className={classes.sectionTitle}>
                                <ScheduleIcon style={{ marginRight: 8 }} /> Agendador de Reunião
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mb={2} style={{ marginBottom: "16px" }}>
                                Marque reuniões e eventos para esta oportunidade. A integração com a Agenda estará vinculada a este painel e sincronizada via Google Calendar.
                            </Typography>
                            <Button
                                variant="outlined"
                                color="primary"
                                style={{ textTransform: "none", alignSelf: "flex-start" }}
                                onClick={() => setLeadAppointmentOpen(true)}
                            >
                                + Propor horários (Agenda)
                            </Button>
                        </TabPanel>

                        {/* E-mail */}
                        <TabPanel value={tabValue} index={4}>
                            <Typography className={classes.sectionTitle}>
                                <MailOutlineIcon style={{ marginRight: 8 }} /> Envios de E-mail (Beta)
                            </Typography>
                            <Box style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 16 }}>
                                <TextField fullWidth variant="outlined" size="small" placeholder="Para: lead@exemplo.com" style={{ marginBottom: 8 }} />
                                <TextField fullWidth variant="outlined" size="small" placeholder="Assunto: Proposta Comercial" style={{ marginBottom: 8 }} />
                                <TextField fullWidth variant="outlined" size="small" multiline rows={4} placeholder="Digite seu email..." style={{ marginBottom: 8 }} />
                                <Button variant="contained" color="primary" size="small" style={{ textTransform: "none", boxShadow: "none" }}>Enviar E-mail</Button>
                            </Box>
                        </TabPanel>

                        {/* Chat (Simulacao) */}
                        <TabPanel value={tabValue} index={5}>
                            <Box height="500px">
                                <LeadChat leadId={leadId || op?.leadId || op?.id || null} />
                            </Box>
                        </TabPanel>

                        {/* Arquivos */}
                        <TabPanel value={tabValue} index={6}>
                            <Typography className={classes.sectionTitle}>
                                <AttachFileIcon style={{ marginRight: 8 }} /> Anexar Arquivos
                            </Typography>
                            <Box display="flex" alignItems="center" justifyContent="center" style={{ border: "2px dashed #ccc", padding: 32, borderRadius: 8, backgroundColor: "#fafafa", cursor: "pointer" }}>
                                <Typography variant="body2" color="textSecondary">Arraste arquivos para cá ou clique para anexar documentos, PDF, Faturas, etc.</Typography>
                            </Box>
                        </TabPanel>

                    </Paper>
                </Box>
            </Box>

            <LeadAppointmentModal
                open={leadAppointmentOpen}
                onClose={() => setLeadAppointmentOpen(false)}
                op={op}
            />

        </Dialog>
    );
};

export default UniversalLeadModal;
