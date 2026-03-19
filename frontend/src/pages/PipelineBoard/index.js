import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import { useHistory } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useSocket } from "../../context/SocketContext";
import {
    makeStyles,
    Typography,
    Box,
    IconButton,
    Button,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Avatar,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Switch,
    FormControlLabel
} from "@material-ui/core";
import {
    Warning as WarningIcon,
    Timeline as TimelineIcon,
    FilterList as FilterListIcon,
    Schedule as ClockIcon,
    TipsAndUpdates as LightbulbIcon,
    ThumbUp as ThumbUpIcon,
    ThumbDown as ThumbDownIcon,
    Search as SearchIcon,
    People as PeopleIcon,
    Person as PersonIcon,
    Clear as ClearIcon,
    Dashboard as DashboardIcon,
    Tune as TuneIcon,
    Code as CodeIcon
} from "@mui/icons-material";
import api from "../../services/api";
import { toast } from "react-toastify";
import ImportLeadsModal from "../../components/ImportLeadsModal";
import GetAppIcon from '@material-ui/icons/GetApp';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import UniversalLeadModal from "../../components/UniversalLeadModal";
import { CrmAiFab } from "../../components/CrmAiAssistant";

const fCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const useStyles = makeStyles((theme) => ({
    container: {
        height: "calc(100vh - 48px)",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
        marginTop: 0
    },
    header: {
        padding: theme.spacing(2, 3, 1.75, 3),
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #cadecf",
        boxShadow: "0 12px 28px rgba(16, 24, 40, 0.08)",
        zIndex: 10,
        [theme.breakpoints.down("sm")]: {
            padding: theme.spacing(1.5, 1.5, 1.25, 1.5),
        }
    },
    headerTop: {
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: theme.spacing(2),
        alignItems: "center",
        [theme.breakpoints.down("md")]: {
            gridTemplateColumns: "1fr",
        }
    },
    titleWrap: {
        display: "flex",
        flexDirection: "column",
        gap: 6
    },
    titleRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap"
    },
    titleBadge: {
        padding: "5px 10px",
        borderRadius: 999,
        backgroundColor: "#e8f7ee",
        border: "1px solid #bde2ca",
        color: "#155c34",
        fontSize: "0.7rem",
        fontWeight: 800,
        letterSpacing: ".04em",
        textTransform: "uppercase"
    },
    pageTitle: {
        fontSize: "1.08rem",
        fontWeight: 800,
        color: "#163624",
        lineHeight: 1.2
    },
    pageSubtitle: {
        fontSize: "0.78rem",
        color: "#557464",
        fontWeight: 500
    },
    topRight: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        justifyContent: "flex-end",
        [theme.breakpoints.down("md")]: {
            justifyContent: "flex-start",
        }
    },
    selector: {
        minWidth: 220,
        "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            backgroundColor: "#f9fcfa",
            height: 40
        },
        "& .MuiInputLabel-outlined": {
            fontSize: "0.83rem"
        }
    },
    aiPriorityBtn: {
        height: 40,
        borderRadius: 10,
        fontWeight: 800,
        textTransform: "none",
        fontSize: "0.78rem",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "#b9d8c5",
        color: "#1b5f36",
        backgroundColor: "#f3faf6",
        "&:hover": {
            borderColor: "#7eb596",
            backgroundColor: "#e9f6ee"
        }
    },
    aiPriorityBtnActive: {
        borderColor: "#117a43",
        color: "#fff",
        background: "linear-gradient(135deg, #22a45d 0%, #15773f 100%)",
        boxShadow: "0 10px 24px rgba(23, 121, 66, 0.3)",
        "&:hover": {
            background: "linear-gradient(135deg, #1c914f 0%, #126338 100%)"
        }
    },
    filterBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        border: "1px solid #c6dfd0",
        backgroundColor: "#f4fbf7",
        color: "#205e38",
        "&:hover": {
            backgroundColor: "#e6f4ec"
        }
    },
    metricsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3,minmax(0,1fr))",
        gap: 10,
        marginTop: 12,
        [theme.breakpoints.down("sm")]: {
            gridTemplateColumns: "1fr",
        }
    },
    metricCard: {
        borderRadius: 12,
        border: "1px solid #cfe2d5",
        background: "#ffffff",
        padding: "10px 12px",
        boxShadow: "0 6px 18px rgba(16,24,40,0.07)"
    },
    metricLabel: {
        fontSize: "0.67rem",
        color: "#111111",
        letterSpacing: ".04em",
        textTransform: "uppercase",
        fontWeight: 800
    },
    metricValue: {
        marginTop: 2,
        fontSize: "1.05rem",
        fontWeight: 900,
        lineHeight: 1.2
    },
    controlBar: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid #e4efe8"
    },
    searchBox: {
        display: "flex",
        alignItems: "center",
        backgroundColor: "#f8fcf9",
        border: "1px solid #cde1d4",
        borderRadius: 11,
        padding: "6px 12px",
        gap: 8,
        minWidth: 250,
        maxWidth: 340,
        flex: 1,
        "&:focus-within": {
            border: "1px solid #1f9d55",
            backgroundColor: "#fff",
            boxShadow: "0 0 0 3px rgba(31,157,85,0.18)"
        }
    },
    searchInput: {
        border: "none",
        background: "transparent",
        outline: "none",
        fontSize: "0.84rem",
        color: "#2f4a3d",
        width: "100%",
        "&::placeholder": { color: "#7b9688" }
    },
    resultCount: {
        fontSize: "0.72rem",
        color: "#176f3e",
        fontWeight: 800,
        backgroundColor: "#eaf8ef",
        border: "1px solid #c5e2d0",
        borderRadius: 999,
        padding: "4px 10px"
    },
    crmTabs: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap"
    },
    crmTabBtn: {
        borderRadius: 10,
        border: "1px solid #c8ddcf",
        backgroundColor: "#f7fbf8",
        color: "#355645",
        textTransform: "none",
        fontWeight: 700,
        fontSize: "0.76rem",
        padding: "4px 10px",
        minHeight: 34,
        "&:hover": {
            borderColor: "#8fc9a6",
            backgroundColor: "#ecf7f0"
        }
    },
    crmTabBtnActive: {
        color: "#fff",
        borderColor: "#11723d",
        background: "linear-gradient(135deg, #22a65b 0%, #15763f 100%)",
        boxShadow: "0 10px 20px rgba(21,118,63,0.28)"
    },
    viewModeBtn: {
        borderRadius: 10,
        fontWeight: 700,
        textTransform: "none",
        fontSize: "0.78rem",
        padding: "6px 12px",
        minHeight: 36
    },
    teamBtn: {
        background: "linear-gradient(135deg, #20a35a 0%, #15793f 100%)",
        color: "#fff",
        border: "1px solid #126f3a",
        boxShadow: "0 8px 18px rgba(21,121,63,0.24)",
        "&:hover": { background: "linear-gradient(135deg, #1c904f 0%, #116438 100%)" }
    },
    personalBtn: {
        backgroundColor: "#f8fcf9",
        color: "#355746",
        border: "1px solid #cfe1d4",
        "&:hover": { backgroundColor: "#eef7f1" }
    },
    memberSelect: {
        minWidth: 190,
        "& .MuiOutlinedInput-root": { borderRadius: 10, height: 36, fontSize: "0.82rem", backgroundColor: "#fff" },
        "& .MuiInputLabel-outlined": { fontSize: "0.82rem" }
    },
    topScrollWrapper: {
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        backgroundColor: "#f5faf7",
        borderBottom: "1px solid #d8e7df",
        height: 12,
        "&::-webkit-scrollbar": { height: 8 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "#a8c8b6", borderRadius: 4 }
    },
    topScrollContent: {
        height: 1
    },
    boardArea: {
        flex: 1,
        display: "flex",
        overflowX: "auto",
        padding: theme.spacing(2),
        gap: theme.spacing(2),
        alignItems: "flex-start",
        "&::-webkit-scrollbar": { height: 10 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "#a8c8b6", borderRadius: 6 }
    },
    lane: {
        minWidth: 348,
        maxWidth: 348,
        borderRadius: 16,
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #cfe1d5",
        boxShadow: "0 10px 24px rgba(16,24,40,0.09)",
        overflow: "hidden",
        transition: "background-color 0.2s"
    },
    laneHeader: {
        padding: theme.spacing(1.75, 1.75, 1.5, 1.75),
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(1),
        borderBottom: "1px solid #e2ede6",
        minHeight: 80,
        maxHeight: 80,
        justifyContent: "space-between",
    },
    laneTitle: {
        fontWeight: 800,
        fontSize: "0.94rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "#111111"
    },
    laneTitleLeft: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        flex: 1,
        "& > span:nth-child(2)": {
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word"
        }
    },
    laneColorDot: {
        width: 10,
        height: 10,
        borderRadius: "50%",
        flexShrink: 0
    },
    laneCountBadge: {
        backgroundColor: "#e4f2e9",
        border: "1px solid #bcd8c7",
        color: "#1a5f35",
        borderRadius: 999,
        fontSize: "0.72rem",
        fontWeight: 800,
        padding: "2px 8px"
    },
    laneStats: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        fontSize: "0.74rem",
        color: "#4f6a5d",
        fontWeight: 700
    },
    laneRiskNotice: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: "0.68rem",
        backgroundColor: "#feecec",
        color: "#b42318",
        border: "1px solid #f6c0bf",
        padding: "3px 8px",
        borderRadius: 999
    },
    cardList: {
        padding: theme.spacing(1.5),
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(1.4),
        backgroundColor: "transparent",
        "&::-webkit-scrollbar": { width: 7 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "#b4cebf", borderRadius: 4 }
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: theme.spacing(1.5),
        boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
        cursor: "pointer",
        transition: "all .18s ease",
        border: "1px solid #d8e8df",
        borderLeft: props => `5px solid ${props.riskColor || "#cde1d4"}`,
        "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 14px 24px rgba(16,24,40,0.14)",
            borderColor: "#a8c8b6"
        },
        "&:focus-visible": {
            outline: "none",
            boxShadow: "0 0 0 3px rgba(31,157,85,0.25)"
        }
    },
    cardTitle: {
        fontWeight: 800,
        color: "#111111",
        lineHeight: 1.25,
        fontSize: "0.82rem"
    },
    cardContact: {
        fontSize: "0.72rem",
        color: "#111111",
        fontWeight: 700
    },
    cardMetaLine: {
        fontSize: "0.7rem",
        color: "#759082",
        marginTop: 3
    },
    cardValueRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8
    },
    cardValue: {
        fontWeight: 900,
        fontSize: "0.95rem",
        color: "#173925"
    },
    riskChip: {
        fontSize: "0.62rem",
        fontWeight: 800,
        padding: "3px 8px",
        borderRadius: 999,
        textTransform: "uppercase",
        border: "1px solid transparent"
    },
    loadMore: {
        textAlign: "center",
        padding: theme.spacing(1),
        color: "#4f6f5d",
        cursor: "pointer",
        fontSize: "0.76rem",
        fontWeight: 700,
        "&:hover": { color: "#1e7f47" }
    },
    searchHighlight: {
        backgroundColor: "#fff8e6",
        borderLeft: "4px solid #cc9c00 !important"
    },
    noResults: {
        textAlign: "center",
        padding: theme.spacing(2),
        color: "#6b8879",
        fontSize: "0.76rem",
        border: "1px dashed #cfe1d5",
        borderRadius: 10,
        backgroundColor: "#f8fcf9"
    }
}));

const IntelligentCard = ({ op, onClick, highlight }) => {
    const riskColor = (op.prediction && op.prediction.riskLevel === "HIGH") ? "#ef4444" : (op.prediction && op.prediction.riskLevel === "MEDIUM") ? "#f59e0b" : "#10b981";
    const probability = (op.prediction && (op.prediction.probability * 100).toFixed(0)) || 0;
    const cardColor = op.lead?.cardColor || op.lead?.card_color || null;
    const activeColor = cardColor && cardColor !== "#FFFFFF" ? cardColor : riskColor;
    const classes = useStyles({ riskColor: activeColor });

    return (
        <Box className={`${classes.card} ${highlight ? classes.searchHighlight : ""}`} onClick={() => onClick(op)} tabIndex={0}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Typography className={classes.cardTitle}>
                    {op.title}
                </Typography>
                {(op.prediction && op.prediction.riskLevel === "HIGH") && (
                    <Tooltip title="Alto Risco">
                        <WarningIcon style={{ fontSize: 16, color: riskColor }} />
                    </Tooltip>
                )}
            </Box>

            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography className={classes.cardContact}>
                    {(op.contact && op.contact.name) || (op.lead && op.lead.name) || "Sem contato"}
                </Typography>
            </Box>

            {op.lead && op.lead.companyName && (
                <Typography className={classes.cardMetaLine}>
                    Empresa: {op.lead.companyName}
                </Typography>
            )}

            <Box className={classes.cardValueRow} mt={1.1}>
                <Typography className={classes.cardValue}>
                    {fCurrency(op.value)}
                </Typography>
                <span className={classes.riskChip} style={{ backgroundColor: riskColor + "14", color: riskColor, borderColor: riskColor + "44" }}>
                    Win: {probability}%
                </span>
            </Box>
            {op.slaStatus === "EXPIRED" && (
                <Box mt={0.7} display="flex" alignItems="center" gap={0.5} style={{ color: "#b42318", fontSize: "0.65rem", fontWeight: 800 }}>
                    <ClockIcon style={{ fontSize: 13 }} /> SLA vencido
                </Box>
            )}
        </Box>
    );
};

const PipelineBoard = () => {
    const classes = useStyles();
    const history = useHistory();
    const { user } = useContext(AuthContext);
    const isAdmin = user && user.profile === "admin";

    const [pipelines, setPipelines] = useState([]);
    const [selectedPipelineId, setSelectedPipelineId] = useState("");
    const [board, setBoard] = useState({ stages: [] });
    const [loading, setLoading] = useState(false);
    const [sort, setSort] = useState("CREATED_AT");

    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedStageToImport, setSelectedStageToImport] = useState(null);
    const [universalModalOpen, setUniversalModalOpen] = useState(false);

    // Filtros existentes
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [riskFilter, setRiskFilter] = useState("");
    const [onlyAI, setOnlyAI] = useState(false);
    const [onlyExpired, setOnlyExpired] = useState(false);

    // NOVO: Busca client-side
    const [searchText, setSearchText] = useState("");

    // NOVO: Filtros de usuário (admin only)
    // viewMode: "team" = vê todos; "personal" = vê apenas próprios leads
    const [viewMode, setViewMode] = useState("team");
    const [selectedOwnerUserId, setSelectedOwnerUserId] = useState("");
    const [teamUsers, setTeamUsers] = useState([]);

    // IA Feedback
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [selectedOp, setSelectedOp] = useState(null);

    const topScrollRef = useRef(null);
    const boardScrollRef = useRef(null);

    const syncScroll = (source, target) => {
        if (target.current && source.current) {
            target.current.scrollLeft = source.current.scrollLeft;
        }
    };

    useEffect(() => {
        fetchPipelines();
        if (isAdmin) fetchTeamUsers();
    }, []);

    const { socket } = useSocket();

    useEffect(() => {
        if (selectedPipelineId) {
            fetchBoard();
        }

        if (!user || !user.companyId || !socket) return;

        const onEvent = () => fetchBoard();

        const oppEv = `company-${user.companyId}-opportunity`;
        const leadEv = `company-${user.companyId}-lead`;

        socket.on(oppEv, onEvent);
        socket.on(leadEv, onEvent);

        return () => {
            socket.off(oppEv, onEvent);
            socket.off(leadEv, onEvent);
        };
    }, [selectedPipelineId, riskFilter, onlyAI, onlyExpired, sort, viewMode, selectedOwnerUserId, user, socket]);

    const fetchPipelines = async () => {
        try {
            const { data } = await api.get("/pipelines");
            setPipelines(data);
            if (data.length > 0) setSelectedPipelineId(data[0].id);
        } catch (e) { }
    };

    const fetchTeamUsers = async () => {
        try {
            const { data } = await api.get("/users/");
            setTeamUsers(data.users || []);
        } catch (e) { }
    };

    const fetchBoard = async () => {
        setLoading(true);
        try {
            const params = { riskLevel: riskFilter, onlyAI, onlyExpired, sort };

            if (isAdmin) {
                if (viewMode === "personal") {
                    params.viewMode = "personal";
                } else if (selectedOwnerUserId) {
                    params.ownerUserId = selectedOwnerUserId;
                } else {
                    params.viewMode = "team";
                }
            }

            const { data } = await api.get(`/pipelines/${selectedPipelineId}/board`, { params });

            // Deduplicação global por ID em cada estágio
            if (data && data.stages) {
                data.stages = data.stages.map(stage => {
                    const uniqueCards = Array.from(
                        new Map((stage.opportunities || []).map(c => [c.id, c])).values()
                    );
                    return { ...stage, opportunities: uniqueCards };
                });
            }

            setBoard(data);
        } catch (err) {
            toast.error("Impossível conectar ao serviço de inteligência");
        } finally {
            setLoading(false);
        }
    };

    // Filtro client-side por busca
    const filteredBoard = useMemo(() => {
        if (!searchText.trim()) return board;
        const q = searchText.toLowerCase().trim();
        return {
            ...board,
            stages: (board.stages || []).map(stage => ({
                ...stage,
                opportunities: (stage.opportunities || []).filter(op => {
                    const title = (op.title || "").toLowerCase();
                    const leadName = (op.lead?.name || "").toLowerCase();
                    const contactName = (op.contact?.name || "").toLowerCase();
                    const companyName = (op.lead?.companyName || "").toLowerCase();
                    const cnpj = (op.lead?.cnpj || "").toLowerCase();
                    return title.includes(q) || leadName.includes(q) || contactName.includes(q) || companyName.includes(q) || cnpj.includes(q);
                })
            }))
        };
    }, [board, searchText]);

    const handleOpenImport = (stageId = "") => {
        setSelectedStageToImport(stageId);
        setImportModalOpen(true);
    };

    const handleImportSuccess = () => {
        fetchBoard();
    };

    const handleAiFeedback = async (feedback) => {
        try {
            await api.post(`/opportunities/${selectedOp.id}/feedback`, {
                suggestedStageId: selectedOp.aiSuggestedStageId,
                actualStageId: selectedOp.stageId,
                feedback
            });
            toast.success("Obrigado! A IA está aprendendo com você.");
            setFeedbackOpen(false);
        } catch (e) {
            toast.error("Erro ao enviar feedback");
        }
    };

    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const sourceStageId = parseInt(source.droppableId);
        const destStageId = parseInt(destination.droppableId);

        // Deep clone safe for optimistic UI
        const newBoard = {
            ...board,
            stages: board.stages.map(stage => ({
                ...stage,
                opportunities: [...stage.opportunities]
            }))
        };
        let draggedOp, sourceStageIdx, destStageIdx;

        newBoard.stages.forEach((stage, idx) => {
            if (stage.id === sourceStageId) sourceStageIdx = idx;
            if (stage.id === destStageId) destStageIdx = idx;
        });

        if (sourceStageIdx !== undefined) {
            draggedOp = newBoard.stages[sourceStageIdx].opportunities.find(op => op.id === parseInt(draggableId));
            if (draggedOp) {
                newBoard.stages[sourceStageIdx].opportunities.splice(source.index, 1);
            }
        }

        if (draggedOp && destStageIdx !== undefined) {
            newBoard.stages[destStageIdx].opportunities = newBoard.stages[destStageIdx].opportunities.filter(o => o.id !== draggedOp.id);
            newBoard.stages[destStageIdx].opportunities.splice(destination.index, 0, draggedOp);
            setBoard(newBoard);
        }

        try {
            await api.post(`/opportunities/${draggableId}/move`, { toStageId: destStageId });
        } catch (err) {
            toast.error("Erro ao mover card.");
            fetchBoard(); // Revert
        }
    };

    const totals = useMemo(() => {
        return (board.stages || []).reduce((acc, stage) => {
            acc.totalValue += stage.totalValue;
            acc.forecastValue += stage.forecastValue;
            acc.highRiskCount += stage.highRiskCount;
            return acc;
        }, { totalValue: 0, forecastValue: 0, highRiskCount: 0 });
    }, [board]);

    const searchResultCount = useMemo(() => {
        if (!searchText.trim()) return null;
        return (filteredBoard.stages || []).reduce((acc, s) => acc + s.opportunities.length, 0);
    }, [filteredBoard, searchText]);

    return (
        <Box className={classes.container}>
            <header className={classes.header}>
                <div className={classes.headerTop}>
                    <div className={classes.titleWrap}>
                        <div className={classes.titleRow}>
                            <span className={classes.titleBadge}>CRM Kanban</span>
                        </div>
                    </div>

                    <div className={classes.topRight}>
                        <FormControl variant="outlined" size="small" className={classes.selector}>
                            <InputLabel>Funil de Vendas</InputLabel>
                            <Select value={selectedPipelineId} onChange={(e) => setSelectedPipelineId(e.target.value)} label="Funil de Vendas">
                                {pipelines.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <Button
                            startIcon={<TimelineIcon />}
                            className={`${classes.aiPriorityBtn} ${sort === "AI_PRIORITY" ? classes.aiPriorityBtnActive : ""}`}
                            onClick={() => setSort((s) => s === "AI_PRIORITY" ? "CREATED_AT" : "AI_PRIORITY")}
                        >
                            Prioridade IA
                        </Button>
                        <IconButton className={classes.filterBtn} onClick={() => setFilterModalOpen(true)}>
                            <FilterListIcon />
                        </IconButton>
                    </div>
                </div>

                <div className={classes.metricsGrid}>
                    <div className={classes.metricCard}>
                        <Typography className={classes.metricLabel}>Reuniões agendadas</Typography>
                        <Typography className={classes.metricValue} style={{ color: "#166534" }}>
                            {board.pipeline?.scheduledMeetingsCount || 0}
                        </Typography>
                    </div>
                    <div className={classes.metricCard}>
                        <Typography className={classes.metricLabel}>Forecast total</Typography>
                        <Typography className={classes.metricValue} style={{ color: "#0f8f4b" }}>
                            {fCurrency(totals.forecastValue)}
                        </Typography>
                    </div>
                    <div className={classes.metricCard}>
                        <Typography className={classes.metricLabel}>Alertas de risco</Typography>
                        <Typography className={classes.metricValue} style={{ color: "#b42318" }}>
                            {totals.highRiskCount}
                        </Typography>
                    </div>
                </div>

                <div className={classes.controlBar}>
                    <div className={classes.searchBox}>
                        <SearchIcon style={{ fontSize: 16, color: "#7b9688", flexShrink: 0 }} />
                        <input
                            className={classes.searchInput}
                            placeholder="Buscar lead, contato, empresa ou CNPJ..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                        {searchText && (
                            <IconButton size="small" onClick={() => setSearchText("")} style={{ padding: 2 }}>
                                <ClearIcon style={{ fontSize: 14, color: "#7b9688" }} />
                            </IconButton>
                        )}
                    </div>

                    {searchText && searchResultCount !== null && (
                        <span className={classes.resultCount}>
                            {searchResultCount} resultado{searchResultCount !== 1 ? "s" : ""}
                        </span>
                    )}

                    <div className={classes.crmTabs}>
                        <Tooltip title="Dashboard Executivo">
                            <Button
                                size="small"
                                className={classes.crmTabBtn}
                                startIcon={<DashboardIcon style={{ fontSize: 15 }} />}
                                onClick={() => history.push({ pathname: "/executive-dashboard", state: { from: history.location.pathname } })}
                            >
                                Dashboard
                            </Button>
                        </Tooltip>
                        <Tooltip title="Configuração de Funil">
                            <Button
                                size="small"
                                className={classes.crmTabBtn}
                                startIcon={<TuneIcon style={{ fontSize: 15 }} />}
                                onClick={() => history.push({ pathname: "/pipeline-config", state: { from: history.location.pathname } })}
                            >
                                Config. Funil
                            </Button>
                        </Tooltip>
                        <Tooltip title="Webhooks CRM">
                            <Button
                                size="small"
                                className={classes.crmTabBtn}
                                startIcon={<CodeIcon style={{ fontSize: 15 }} />}
                                onClick={() => history.push({ pathname: "/crm-webhooks", state: { from: history.location.pathname } })}
                            >
                                Webhooks
                            </Button>
                        </Tooltip>
                        <Tooltip title="Automações do Kanban">
                            <Button
                                size="small"
                                className={classes.crmTabBtn}
                                startIcon={<TimelineIcon style={{ fontSize: 15 }} />}
                                onClick={() => history.push({ pathname: "/kanban-automations", state: { from: history.location.pathname } })}
                            >
                                Automações
                            </Button>
                        </Tooltip>
                        <Tooltip title="Chat Agendamento">
                            <Button
                                size="small"
                                className={classes.crmTabBtn}
                                startIcon={<ClockIcon style={{ fontSize: 15 }} />}
                                onClick={() => history.push({ pathname: "/lembretes", state: { from: history.location.pathname } })}
                            >
                                Chat Agendamento
                            </Button>
                        </Tooltip>
                        <Tooltip title="Gerenciamento de Tarefas">
                            <Button
                                size="small"
                                className={classes.crmTabBtn}
                                startIcon={<DashboardIcon style={{ fontSize: 15 }} />}
                                onClick={() => history.push({ pathname: "/crm/tasks", state: { from: history.location.pathname } })}
                            >
                                Tarefas
                            </Button>
                        </Tooltip>
                        <Button
                            size="small"
                            className={`${classes.crmTabBtn} ${classes.crmTabBtnActive}`}
                            startIcon={viewMode === "team" ? <PeopleIcon style={{ fontSize: 15 }} /> : <PersonIcon style={{ fontSize: 15 }} />}
                        >
                            {viewMode === "team" ? "Kanban Equipe" : "Kanban Pessoal"}
                        </Button>
                    </div>

                    {/* Filtros de equipe — apenas admin */}
                    {isAdmin && (
                        <>
                            <Tooltip title={viewMode === "team" ? "Visualizando toda a equipe" : "Visualizando apenas seus leads"}>
                                <Button
                                    size="small"
                                    className={`${classes.viewModeBtn} ${viewMode === "team" ? classes.teamBtn : classes.personalBtn}`}
                                    startIcon={viewMode === "team" ? <PeopleIcon style={{ fontSize: 16 }} /> : <PersonIcon style={{ fontSize: 16 }} />}
                                    onClick={() => {
                                        setViewMode(v => v === "team" ? "personal" : "team");
                                        setSelectedOwnerUserId("");
                                    }}
                                >
                                    {viewMode === "team" ? "Equipe" : "Pessoal"}
                                </Button>
                            </Tooltip>

                            {viewMode === "team" && (
                                <FormControl variant="outlined" size="small" className={classes.memberSelect}>
                                    <InputLabel>Membro da Equipe</InputLabel>
                                    <Select
                                        value={selectedOwnerUserId}
                                        onChange={(e) => setSelectedOwnerUserId(e.target.value)}
                                        label="Membro da Equipe"
                                    >
                                        <MenuItem value=""><em>Toda a equipe</em></MenuItem>
                                        {teamUsers.map(u => (
                                            <MenuItem key={u.id} value={u.id}>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Avatar style={{ width: 20, height: 20, fontSize: "0.65rem", backgroundColor: "#1f9d55" }}>
                                                        {u.name ? u.name[0].toUpperCase() : "?"}
                                                    </Avatar>
                                                    {u.name}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        </>
                    )}
                </div>
            </header>

            <div
                className={classes.topScrollWrapper}
                ref={topScrollRef}
                onScroll={() => syncScroll(topScrollRef, boardScrollRef)}
            >
                <div
                    className={classes.topScrollContent}
                    style={{ width: (board.stages?.length || 0) * 364 + 48 }}
                />
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                <Box
                    className={classes.boardArea}
                    ref={boardScrollRef}
                    onScroll={() => syncScroll(boardScrollRef, topScrollRef)}
                >
                    {loading && <CircularProgress style={{ margin: "auto" }} color="primary" />}

                    {!loading && (filteredBoard.stages || []).map((stage) => (
                        <Droppable key={stage.id} droppableId={String(stage.id)}>
                            {(provided) => (
                                <Box 
                                    className={`${classes.lane} kanban-column`} 
                                    ref={provided.innerRef} 
                                    {...provided.droppableProps}
                                    style={{
                                        backgroundColor: (stage.color || "#1f9d55") + "10",
                                        borderTop: `4px solid ${stage.color || "#1f9d55"}`
                                    }}
                                >
                                    <div className={`${classes.laneHeader} kanban-column-header`}>
                                        <div className={classes.laneTitle}>
                                            <div className={classes.laneTitleLeft}>
                                                <span className={classes.laneColorDot} style={{ backgroundColor: stage.color || "#1f9d55" }} />
                                                <span>{stage.name}</span>
                                                <span style={{ fontSize: "0.68rem", color: "#5f7b6d" }}>ID {stage.id}</span>
                                                <span className={classes.laneCountBadge}>
                                                    {searchText ? stage.opportunities.length : stage.opportunitiesCount}
                                                </span>
                                            </div>
                                            <Tooltip title="Importar Leads para este estágio">
                                                <IconButton size="small" onClick={() => handleOpenImport(stage.id)} style={{ color: "#2f6b49" }}>
                                                    <GetAppIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </div>
                                        <div className={classes.laneStats}>
                                            <span>Real: {fCurrency(stage.totalValue)}</span>
                                            <span style={{ color: "#117a43", fontWeight: 800 }}>Forecast: {fCurrency(stage.forecastValue)}</span>
                                        </div>
                                        {stage.highRiskCount > 0 && (
                                            <Box className={classes.laneRiskNotice}>
                                                <WarningIcon style={{ fontSize: 12 }} /> {stage.highRiskCount} leads críticos
                                            </Box>
                                        )}
                                    </div>

                                    <div className={classes.cardList}>
                                        {stage.opportunities.length === 0 && (
                                            <Typography className={classes.noResults}>
                                                {searchText ? "Nenhum resultado nesta etapa" : "Sem cards nesta etapa"}
                                            </Typography>
                                        )}
                                        {stage.opportunities.map((op, index) => (
                                            <Draggable key={op.id} draggableId={String(op.id)} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                            marginBottom: 16,
                                                            opacity: snapshot.isDragging ? 0.8 : 1
                                                        }}
                                                    >
                                                        <IntelligentCard
                                                            op={op}
                                                            highlight={!!searchText.trim()}
                                                            onClick={(o) => { setSelectedOp(o); setUniversalModalOpen(true); }}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                        {stage.hasMore && !searchText && (
                                            <Typography className={classes.loadMore}>Carregar mais...</Typography>
                                        )}
                                    </div>
                                </Box>
                            )}
                        </Droppable>
                    ))}
                </Box>
            </DragDropContext>

            {/* Universal Lead Modal */}
            <UniversalLeadModal
                open={universalModalOpen}
                onClose={() => setUniversalModalOpen(false)}
                op={selectedOp}
                onSuccess={fetchBoard}
            />

            {/* Modal de Detalhes e Feedback da IA */}
            <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} maxWidth="xs" fullWidth PaperProps={{ style: { borderRadius: 20, border: "1px solid #cee1d5" } }}>
                <DialogTitle style={{ fontWeight: 900 }}>Inteligência de Vendas</DialogTitle>
                <DialogContent>
                    {selectedOp && (
                        <Box>
                            <Typography variant="body2" paragraph style={{ backgroundColor: "#f8fcf9", padding: 16, borderRadius: 12, border: "1px solid #d5e6db" }}>
                                <LightbulbIcon style={{ fontSize: 16, color: "#1f9d55", marginBottom: -3, marginRight: 4 }} />
                                <strong>Análise do Sistema:</strong> {(selectedOp.prediction && selectedOp.prediction.explanation) || "Aguardando processamento heurístico..."}
                            </Typography>

                            <Box mt={3} p={2} style={{ backgroundColor: "#eaf8ef", borderRadius: 12, border: "1px solid #cde2d4" }}>
                                <Typography variant="subtitle2" style={{ color: "#1c5f36", fontWeight: 700 }} gutterBottom>Essa sugestão foi útil?</Typography>
                                <Box display="flex" gap={1} mt={1}>
                                    <Button fullWidth variant="contained" style={{ backgroundColor: "#10b981", color: "#fff" }} startIcon={<ThumbUpIcon />} onClick={() => handleAiFeedback("AGREE")}>Sim</Button>
                                    <Button fullWidth variant="contained" style={{ backgroundColor: "#ef4444", color: "#fff" }} startIcon={<ThumbDownIcon />} onClick={() => handleAiFeedback("DISAGREE")}>Não</Button>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFeedbackOpen(false)} color="primary">Fechar</Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Filtros */}
            <Dialog open={filterModalOpen} onClose={() => setFilterModalOpen(false)} PaperProps={{ style: { borderRadius: 16, border: "1px solid #cee1d5" } }}>
                <DialogTitle>Filtros Avançados</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={3} mt={1} minWidth={300}>
                        <FormControl fullWidth variant="outlined">
                            <InputLabel>Nível de Risco</InputLabel>
                            <Select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} label="Nível de Risco">
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="LOW">Baixo</MenuItem>
                                <MenuItem value="MEDIUM">Médio</MenuItem>
                                <MenuItem value="HIGH">Alto</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={<Switch checked={onlyAI} onChange={(e) => setOnlyAI(e.target.checked)} style={{ color: "#1f9d55" }} />}
                            label="Apenas movidos por IA"
                        />

                        <FormControlLabel
                            control={<Switch checked={onlyExpired} onChange={(e) => setOnlyExpired(e.target.checked)} style={{ color: "#1f9d55" }} />}
                            label="Apenas SLA Vencido"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setRiskFilter(""); setOnlyAI(false); setOnlyExpired(false); setSort("CREATED_AT"); }}>Limpar</Button>
                    <Button onClick={() => setFilterModalOpen(false)} variant="contained" style={{ backgroundColor: "#1f9d55", color: "#fff" }}>Aplicar</Button>
                </DialogActions>
            </Dialog>

            <ImportLeadsModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                defaultPipelineId={selectedPipelineId}
                stageId={selectedStageToImport}
                onSuccess={handleImportSuccess}
            />

            {/* CRM AI Assistant FAB */}
            <CrmAiFab onNewLead={() => { setSelectedOp(null); setUniversalModalOpen(true); }} />
        </Box>
    );
};

export default PipelineBoard;
