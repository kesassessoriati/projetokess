import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Dialog,
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
import FiberManualRecordIcon from "@material-ui/icons/FiberManualRecord";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import InfoIcon from "@material-ui/icons/Info";
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CheckBoxOutlineBlankIcon from "@material-ui/icons/CheckBoxOutlineBlank";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import { toast } from "react-toastify";
import LeadModal from "../LeadModal";
import ConfirmationModal from "../ConfirmationModal";
import LeadWhatsAppChat from "../LeadWhatsAppChat";
import LeadAppointmentModal from "../LeadAppointmentModal";
import LeadEmailComponent from "../LeadEmailComponent";
import LeadAttachmentsTab from "../LeadAttachmentsTab";
import LeadTasksTab from "../LeadTasksTab";
import LeadCallRecordingsTab from "../LeadCallRecordingsTab";
import LeadMeetingsTab from "../LeadMeetingsTab";
import WebphoneWorkspace from "../WebphoneWorkspace";
import api from "../../services/api";
import { useWebphone } from "../../context/WebphoneContext";

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
    secondaryMenu: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(1),
        padding: theme.spacing(1.25, 2, 1.5),
        borderTop: "1px solid #eef2f7",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        flexWrap: "wrap",
    },
    secondaryMenuButton: {
        textTransform: "none",
        borderRadius: 999,
        fontWeight: 800,
        padding: theme.spacing(0.75, 1.5),
        border: "1px solid #d7e3dc",
        color: "#475569",
        backgroundColor: "#ffffff",
    },
    secondaryMenuButtonActive: {
        backgroundColor: "#111827",
        color: "#ffffff",
        borderColor: "#111827",
        "&:hover": {
            backgroundColor: "#0f172a",
        },
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
    miniWebphoneWrap: {
        marginTop: theme.spacing(3),
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
    const { syncLeadModalState } = useWebphone();
    const opportunityValue =
        op && Number(op.value || 0) === 0 && op.lead?.purchaseValue != null
            ? Number(op.lead.purchaseValue)
            : Number((op && op.value) || 0);
    const resolvedLeadId = leadId || (op && (op.leadId || op.lead?.id)) || null;
    const resolvedOpportunityId = (op && op.id) || null;
    const [tabValue, setTabValue] = useState(0);
    const [showRecordings, setShowRecordings] = useState(false);
    const [showMeetings, setShowMeetings] = useState(false);
    const [activityText, setActivityText] = useState("");
    const [noteText, setNoteText] = useState("");
    const [activityType] = useState("ATIVIDADE");
    const [leadAppointmentOpen, setLeadAppointmentOpen] = useState(false);
    const [activities, setActivities] = useState([]);
    const [cardColor, setCardColor] = useState(null);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [editingNote, setEditingNote] = useState(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState(null);
    const syncLeadModalStateRef = useRef(syncLeadModalState);

    useEffect(() => {
        if (!open) {
            setEditingActivity(null);
            setEditingNote(null);
            setActivityText("");
            setNoteText("");
            setActivityToDelete(null);
            setConfirmDeleteOpen(false);
            setShowRecordings(false);
            setShowMeetings(false);
        }
    }, [open]);

    useEffect(() => {
        syncLeadModalStateRef.current = syncLeadModalState;
    }, [syncLeadModalState]);

    useEffect(() => {
        syncLeadModalStateRef.current(open);

        return () => {
            syncLeadModalStateRef.current(false);
        };
    }, [open]);

    useEffect(() => {
        if (op && op.lead) {
            setCardColor(op.lead.cardColor || op.lead.card_color || "#FFFFFF");
        } else if (!leadId) {
            setCardColor(null);
        }
    }, [leadId, op]);

    const handleCardColorChange = async (e) => {
        const newColor = e.target.value;
        setCardColor(newColor);
        const lId = resolvedLeadId;
        if (!lId) return;

        try {
            await api.put(`/crm/leads/${lId}`, { cardColor: newColor });
            // Atualiza o op localmente se necessário? 
            // PipelineBoard irá atualizar via socket quando o lead for atualizado pelo backend.
        } catch (err) {
            toast.error("Erro ao salvar cor do card");
        }
    };

    const fetchActivities = useCallback(async () => {
        if (!resolvedOpportunityId) {
            setActivities([]);
            return;
        }

        try {
            setLoadingActivities(true);
            const { data } = await api.get(`/opportunities/${resolvedOpportunityId}/events`);
            setActivities(data);
        } catch (err) {
            toast.error("Erro ao carregar atividades");
        } finally {
            setLoadingActivities(false);
        }
    }, [resolvedOpportunityId]);

    useEffect(() => {
        if (open && resolvedOpportunityId && (tabValue === 1 || tabValue === 3 || tabValue === 5)) {
            fetchActivities();
        }
    }, [fetchActivities, open, resolvedOpportunityId, tabValue]);

    if (!op && !leadId && open && false) {
        return null; // bloqueio removido para permitir a criação de um Novo Lead
    }

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleSaveActivity = async () => {
        if (!activityText.trim()) return;
        if (!op || !op.id) {
            toast.error("Salve a oportunidade primeiro para registrar atividades.");
            return;
        }

        try {
            if (editingActivity) {
                await api.put(`/opportunities/events/${editingActivity.id}`, {
                    metadata: { text: activityText }
                });
                toast.success("Atividade atualizada");
                setEditingActivity(null);
            } else {
                await api.post(`/opportunities/${op.id}/events`, {
                    type: activityType,
                    metadata: { text: activityText }
                });
                toast.success("Atividade registrada");
            }
            setActivityText("");
            fetchActivities();
        } catch (err) {
            toast.error("Erro ao salvar atividade");
        }
    };

    const handleEditActivity = (activity) => {
        setEditingActivity(activity);
        setActivityText(activity.metadata?.text || "");
    };

    const handleCancelEditActivity = () => {
        setEditingActivity(null);
        setActivityText("");
    };

    const handleSaveNote = async () => {
        if (!noteText.trim()) return;
        if (!op || !op.id) {
            toast.error("Salve a oportunidade primeiro para adicionar anotações.");
            return;
        }

        try {
            if (editingNote) {
                await api.put(`/opportunities/events/${editingNote.id}`, {
                    metadata: { text: noteText }
                });
                toast.success("Anotação atualizada");
                setEditingNote(null);
            } else {
                await api.post(`/opportunities/${op.id}/events`, {
                    type: "ANOTACAO",
                    metadata: { text: noteText }
                });
                toast.success("Anotação adicionada");
            }
            setNoteText("");
            fetchActivities();
        } catch (err) {
            toast.error("Erro ao salvar anotação");
        }
    };

    const handleEditNote = (note) => {
        setEditingNote(note);
        setNoteText(note.metadata?.text || "");
    };

    const handleCancelEditNote = () => {
        setEditingNote(null);
        setNoteText("");
    };

    const handleDeleteActivity = async () => {
        if (!activityToDelete) return;

        try {
            await api.delete(`/opportunities/events/${activityToDelete.id}`);
            toast.success("Item removido");
            if (editingActivity && editingActivity.id === activityToDelete.id) {
                setEditingActivity(null);
                setActivityText("");
            }
            if (editingNote && editingNote.id === activityToDelete.id) {
                setEditingNote(null);
                setNoteText("");
            }
            setActivityToDelete(null);
            setConfirmDeleteOpen(false);
            fetchActivities();
        } catch (err) {
            toast.error("Erro ao remover item");
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
                            {(op && op.contact && op.contact.name && op.contact.name[0]) || (op && op.lead && op.lead.name && op.lead.name[0]) || "L"}
                        </Avatar>
                        <Box>
                            <Typography variant="h6" style={{ fontWeight: 800, lineHeight: 1.1 }}>
                                {(op && op.title) || (op && op.name) || (op && op.lead && op.lead.name) || "Novo Lead"}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                {(op && op.contact && op.contact.name) || (op && op.lead && op.lead.name) || "Sem contato associado"}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider style={{ my: 2 }} />

                    <Box mt={2} mb={2}>
                        <Typography variant="subtitle2" color="textSecondary" style={{ fontWeight: 600 }}>VALOR DA OPORTUNIDADE</Typography>
                        <Typography variant="h5" style={{ fontWeight: 800, color: "#1e293b" }}>
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(opportunityValue || 0)}
                        </Typography>
                    </Box>

                    <Divider style={{ my: 2 }} />

                    <Box mt={2}>
                        <Typography variant="subtitle2" color="textSecondary" style={{ fontWeight: 600, marginBottom: 8 }}>INFORMAÇÕES ADICIONAIS</Typography>
                        <Typography variant="body2"><strong>Status:</strong> {(op && op.status) || "Novo"}</Typography>
                        <Typography variant="body2"><strong>Risco IA:</strong> {(op && op.prediction && op.prediction.riskLevel) || "N/A"}</Typography>
                        <Typography variant="body2"><strong>Criado em:</strong> {(op && op.createdAt) ? new Date(op.createdAt).toLocaleDateString() : "-"}</Typography>
                    </Box>

                    {op && op.id && (
                        <Box mt={3} display="flex" flexDirection="column" style={{ gap: 8 }}>
                            {op.status === "OPEN" ? (
                                <>
                                    <Button
                                        variant="contained"
                                        style={{ backgroundColor: "#10b981", color: "#fff", fontWeight: "bold" }}
                                        onClick={async () => {
                                            try {
                                                await api.put(`/opportunities/${op.id}`, { status: "WON" });
                                                toast.success("Oportunidade marcada como GANHA! 🎉");
                                                if (onSuccess) onSuccess();
                                                onClose();
                                            } catch (err) {
                                                toast.error("Erro ao fechar negócio.");
                                            }
                                        }}
                                    >
                                        Marcar como GANHO
                                    </Button>
                                    <Button
                                        variant="contained"
                                        style={{ backgroundColor: "#ef4444", color: "#fff", fontWeight: "bold" }}
                                        onClick={async () => {
                                            try {
                                                await api.put(`/opportunities/${op.id}`, { status: "LOST" });
                                                toast.success("Oportunidade marcada como PERDIDA.");
                                                if (onSuccess) onSuccess();
                                                onClose();
                                            } catch (err) {
                                                toast.error("Erro ao fechar negócio.");
                                            }
                                        }}
                                    >
                                        Marcar como PERDIDO
                                    </Button>
                                    <Typography variant="caption" color="textSecondary" style={{ textAlign: "center", marginTop: 4 }}>
                                        Isso fará com que o card saia do Kanban aberto.
                                    </Typography>
                                </>
                            ) : (
                                <Box p={2} style={{ backgroundColor: op.status === "WON" ? "#d1fae5" : "#fee2e2", borderRadius: 8, textAlign: "center" }}>
                                    <Typography variant="subtitle2" style={{ color: op.status === "WON" ? "#065f46" : "#991b1b", fontWeight: "bold" }}>
                                        NEGÓCIO FECHADO ({op.status === "WON" ? "GANHO 🎉" : "PERDIDO 😢"})
                                    </Typography>
                                    <Button size="small" variant="text" style={{ marginTop: 8 }} onClick={async () => {
                                        try {
                                            await api.put(`/opportunities/${op.id}`, { status: "OPEN" });
                                            toast.success("Oportunidade reaberta!");
                                            if (onSuccess) onSuccess();
                                            onClose();
                                        } catch (err) { }
                                    }}>
                                        Reabrir Negócio
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    )}

                    <Box mt={3}>
                        <Typography variant="subtitle2" color="textSecondary" style={{ fontWeight: 600, marginBottom: 8 }}>COR DO CARD</Typography>
                        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                backgroundColor: cardColor || "#FFFFFF",
                                border: "1px solid #e0e0e0",
                                cursor: "pointer",
                                position: "relative",
                                overflow: "hidden",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                            }}>
                                <input
                                    type="color"
                                    value={cardColor || "#FFFFFF"}
                                    onChange={handleCardColorChange}
                                    style={{
                                        position: "absolute",
                                        top: -5,
                                        left: -5,
                                        width: 50,
                                        height: 50,
                                        cursor: "pointer",
                                        opacity: 0
                                    }}
                                />
                            </div>
                            <Typography variant="body2" style={{ fontWeight: 700, color: "#475569" }}>{(cardColor || "#FFFFFF").toUpperCase()}</Typography>
                        </Box>
                    </Box>

                    <Box className={classes.miniWebphoneWrap}>
                        <WebphoneWorkspace compact />
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
                            <Tab icon={<CheckBoxOutlineBlankIcon fontSize="small" />} label="Tarefas" style={{ minWidth: 100 }} />
                            <Tab icon={<EventNoteIcon fontSize="small" />} label="Anotações" style={{ minWidth: 100 }} />
                            <Tab icon={<ScheduleIcon fontSize="small" />} label="Agendador" style={{ minWidth: 100 }} />
                            <Tab icon={<MailOutlineIcon fontSize="small" />} label="E-mail" style={{ minWidth: 100 }} />
                            <Tab icon={<ChatBubbleOutlineIcon fontSize="small" />} label="Chat" style={{ minWidth: 100 }} />
                            <Tab icon={<AttachFileIcon fontSize="small" />} label="Arquivos" style={{ minWidth: 100 }} />
                        </Tabs>
                        <Box className={classes.secondaryMenu}>
                            <Button
                                className={`${classes.secondaryMenuButton} ${showRecordings ? classes.secondaryMenuButtonActive : ""}`}
                                startIcon={<FiberManualRecordIcon fontSize="small" />}
                                onClick={() => { setShowRecordings(v => !v); setShowMeetings(false); }}
                            >
                                Gravacoes
                            </Button>
                            <Button
                                className={`${classes.secondaryMenuButton} ${showMeetings ? classes.secondaryMenuButtonActive : ""}`}
                                startIcon={<VideoLibraryIcon fontSize="small" />}
                                onClick={() => { setShowMeetings(v => !v); setShowRecordings(false); }}
                            >
                                Reuniões
                            </Button>
                        </Box>
                    </Paper>

                    <Paper className={classes.tabContent} elevation={0}>
                        {showMeetings ? (
                            <LeadMeetingsTab
                                leadId={resolvedLeadId}
                                opportunityId={resolvedOpportunityId}
                            />
                        ) : showRecordings ? (
                            <LeadCallRecordingsTab
                                leadId={resolvedLeadId}
                                opportunityId={resolvedOpportunityId}
                            />
                        ) : (
                            <>

                        {/* Informações: Formulário completo usando LeadModal (isEmbedded) */}
                        <TabPanel value={tabValue} index={0}>
                            <LeadModal
                                open={true}
                                onClose={onClose}
                                leadId={resolvedLeadId}
                                contactId={(op && op.contact && op.contact.id) || null}
                                onSuccess={onSuccess}
                                isEmbedded={true}
                                opId={(op && op.id) || null}
                                cardColor={cardColor}
                                leadData={
                                    (op && op.lead)
                                        ? { ...op.lead, pipelineId: op.pipelineId, stageId: op.stageId }
                                        : null
                                }
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
                                    <Box flexGrow={1} />
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        style={{ textTransform: "none", backgroundColor: "#10b981", boxShadow: "none" }}
                                        onClick={handleSaveActivity}
                                    >
                                        {editingActivity ? "Atualizar" : "Salvar"}
                                    </Button>
                                    {editingActivity && (
                                        <Button
                                            size="small"
                                            style={{ textTransform: "none" }}
                                            onClick={handleCancelEditActivity}
                                        >
                                            Cancelar
                                        </Button>
                                    )}
                                </Box>
                            </Box>

                            <Typography variant="subtitle2" style={{ fontWeight: 600, color: "#999", marginBottom: 8 }}>HISTÓRICO</Typography>
                            <Box style={{ borderLeft: "2px solid #e0e0e0", paddingLeft: 16 }}>
                                {loadingActivities ? (
                                    <Typography variant="body2" color="textSecondary">Carregando atividades...</Typography>
                                ) : activities.filter(a => a.type !== "ANOTACAO").length > 0 ? (
                                    activities.filter(a => a.type !== "ANOTACAO").map(act => (
                                        <Box key={act.id} mb={2} display="flex" justifyContent="space-between" alignItems="flex-start">
                                            <Box>
                                                <Typography variant="caption" color="textSecondary">
                                                    {new Date(act.createdAt).toLocaleString()} • {act.type}
                                                </Typography>
                                                <Typography variant="body2" style={{ fontWeight: 500, marginTop: 4 }}>
                                                    {act.metadata?.text ? act.metadata.text : act.type === "MOVED" ? "Estágio alterado no funil" : "-"}
                                                </Typography>
                                            </Box>
                                            {act.type !== "MOVED" && (
                                                <Box display="flex">
                                                    <IconButton size="small" onClick={() => handleEditActivity(act)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => { setActivityToDelete(act); setConfirmDeleteOpen(true); }}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </Box>
                                    ))
                                ) : (
                                    <Typography variant="body2" style={{ fontWeight: 600 }}>Nenhuma atividade registrada ainda.</Typography>
                                )}
                            </Box>
                        </TabPanel>

                        {/* Tarefas */}
                        <TabPanel value={tabValue} index={2}>
                            <LeadTasksTab
                                leadId={resolvedLeadId}
                                op={op}
                            />
                        </TabPanel>

                        {/* Anotações Gerais */}
                        <TabPanel value={tabValue} index={3}>
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
                                        {editingNote ? "Atualizar anotação" : "Adicionar anotação"}
                                    </Button>
                                    {editingNote && (
                                        <Button
                                            size="small"
                                            style={{ textTransform: "none" }}
                                            onClick={handleCancelEditNote}
                                        >
                                            Cancelar
                                        </Button>
                                    )}
                                </Box>

                            <Typography variant="subtitle2" style={{ fontWeight: 600, color: "#999", marginBottom: 8 }}>MURAL DE ANOTAÇÕES</Typography>
                            <Box>
                                {loadingActivities ? (
                                    <Typography variant="body2" color="textSecondary">Carregando anotações...</Typography>
                                ) : activities.filter(a => a.type === "ANOTACAO").length > 0 ? (
                                    activities.filter(a => a.type === "ANOTACAO").map(note => (
                                        <Box key={note.id} mb={2} p={2} style={{ backgroundColor: "#fef9c3", borderRadius: 8, border: "1px solid #fde047" }} display="flex" justifyContent="space-between" alignItems="flex-start">
                                            <Box flexGrow={1}>
                                                <Typography variant="caption" color="textSecondary">
                                                    {new Date(note.createdAt).toLocaleString()}
                                                </Typography>
                                                <Typography variant="body2" style={{ fontWeight: 500, marginTop: 4, whiteSpace: "pre-wrap" }}>
                                                    {note.metadata?.text || "-"}
                                                </Typography>
                                            </Box>
                                            <Box display="flex">
                                                <IconButton size="small" onClick={() => handleEditNote(note)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => { setActivityToDelete(note); setConfirmDeleteOpen(true); }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                    ))
                                ) : (
                                    <Typography variant="body2" style={{ fontWeight: 600, color: "#777" }}>Nenhuma anotação registrada ainda.</Typography>
                                )}
                            </Box>
                        </TabPanel>

                        {/* Agendador */}
                        <TabPanel value={tabValue} index={4}>
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
                        <TabPanel value={tabValue} index={5}>
                            <Typography className={classes.sectionTitle}>
                                <MailOutlineIcon style={{ marginRight: 8 }} /> Comunicação por E-mail
                            </Typography>
                            <LeadEmailComponent
                                op={op}
                                lead={(op && (op.contact || op.lead)) || {}}
                                onEmailSent={fetchActivities}
                            />
                        </TabPanel>

                        {/* Chat (Simulacao) */}
                        <TabPanel value={tabValue} index={6}>
                            <Box height="500px">
                                <LeadWhatsAppChat
                                    leadId={resolvedLeadId || resolvedOpportunityId}
                                    op={op}
                                    onBackToInfo={() => setTabValue(0)}
                                />
                            </Box>
                        </TabPanel>

                        {/* Arquivos */}
                        <TabPanel value={tabValue} index={7}>
                            <LeadAttachmentsTab
                                leadId={resolvedLeadId || resolvedOpportunityId}
                                op={op}
                            />
                        </TabPanel>

                            </>
                        )}
                    </Paper>
                </Box>
            </Box>

            <LeadAppointmentModal
                open={leadAppointmentOpen}
                onClose={() => setLeadAppointmentOpen(false)}
                op={op}
            />

            <ConfirmationModal
                title="Confirmar Exclusão"
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={handleDeleteActivity}
            >
                Tem certeza que deseja remover este item? Esta ação não pode ser desfeita.
            </ConfirmationModal>

        </Dialog>
    );
};

export default UniversalLeadModal;
