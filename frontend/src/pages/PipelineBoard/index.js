import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from "react";
import { useHistory } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useSocket } from "../../context/SocketContext";
import {
    makeStyles,
    Typography,
    Box,
    Grid,
    IconButton,
    Button,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Avatar,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Switch,
    FormControlLabel,
    InputBase
} from "@material-ui/core";
import {
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
    Android as RobotIcon,
    Timeline as TimelineIcon,
    FilterList as FilterListIcon,
    Sort as SortIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Info as InfoIcon,
    AttachMoney as MoneyIcon,
    Schedule as ClockIcon,
    TipsAndUpdates as LightbulbIcon,
    ThumbUp as ThumbUpIcon,
    ThumbDown as ThumbDownIcon,
    FlashOn as FlashIcon,
    Search as SearchIcon,
    People as PeopleIcon,
    Person as PersonIcon,
    Clear as ClearIcon,
    Dashboard as DashboardIcon,
    Tune as TuneIcon,
    Code as CodeIcon
} from "@mui/icons-material";
import api from "../../services/api";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "react-toastify";
import ImportLeadsModal from "../../components/ImportLeadsModal";
import GetAppIcon from '@material-ui/icons/GetApp';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import UniversalLeadModal from "../../components/UniversalLeadModal";

const fCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const useStyles = makeStyles((theme) => ({
    container: {
        height: "calc(100vh - 48px)",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f8fafc",
        overflow: "hidden",
        marginTop: 0
    },
    header: {
        padding: theme.spacing(2, 4, 1.5, 4),
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #e2e8f0",
        zIndex: 10,
    },
    controlBar: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(1.5),
        flexWrap: "wrap",
        marginTop: theme.spacing(1.5),
        paddingTop: theme.spacing(1.5),
        borderTop: "1px solid #f1f5f9"
    },
    searchBox: {
        display: "flex",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "4px 12px",
        gap: 6,
        minWidth: 220,
        maxWidth: 300,
        "&:focus-within": {
            border: "1px solid #6366f1",
            backgroundColor: "#fff",
            boxShadow: "0 0 0 3px rgba(99,102,241,0.08)"
        }
    },
    searchInput: {
        border: "none",
        background: "transparent",
        outline: "none",
        fontSize: "0.85rem",
        color: "#334155",
        width: "100%",
        "&::placeholder": { color: "#94a3b8" }
    },
    viewModeBtn: {
        borderRadius: 10,
        fontWeight: 700,
        textTransform: "none",
        fontSize: "0.8rem",
        padding: "6px 14px",
        height: 36
    },
    teamBtn: {
        backgroundColor: "#6366f1",
        color: "#fff",
        "&:hover": { backgroundColor: "#4f46e5" }
    },
    personalBtn: {
        backgroundColor: "#fff",
        color: "#334155",
        border: "1px solid #e2e8f0",
        "&:hover": { backgroundColor: "#f8fafc" }
    },
    memberSelect: {
        minWidth: 180,
        "& .MuiOutlinedInput-root": { borderRadius: 10, height: 36, fontSize: "0.85rem" },
        "& .MuiInputLabel-outlined": { fontSize: "0.85rem" }
    },
    boardArea: {
        flex: 1,
        display: "flex",
        overflowX: "auto",
        padding: theme.spacing(3),
        paddingTop: theme.spacing(1),
        gap: theme.spacing(3),
        alignItems: "flex-start",
        "&::-webkit-scrollbar": { height: 8 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: 4 }
    },
    topScrollWrapper: {
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        backgroundColor: "#fff",
        borderBottom: "1px solid #e2e8f0",
        height: 12,
        "&::-webkit-scrollbar": { height: 8 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: 4 }
    },
    topScrollContent: {
        height: 1,
    },
    lane: {
        minWidth: 340,
        maxWidth: 340,
        backgroundColor: "#f1f5f9",
        borderRadius: 16,
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0"
    },
    laneHeader: {
        padding: theme.spacing(2.5),
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(1.5),
        borderBottom: "1px solid #e2e8f0",
        backgroundColor: props => props.color || "#fff",
        color: "#fff",
        borderRadius: "16px 16px 0 0",
        position: "relative",
        overflow: "hidden",
        "&::after": {
            content: '""',
            position: "absolute",
            top: 0,
            right: 0,
            width: 100,
            height: 100,
            background: "linear-gradient(225deg, rgba(255,255,255,0.2) 0%, transparent 60%)",
            pointerEvents: "none"
        }
    },
    laneTitle: {
        fontWeight: 800,
        fontSize: "1.1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        textShadow: "0 1px 2px rgba(0,0,0,0.1)"
    },
    laneStats: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "0.8rem",
        opacity: 0.95,
        fontWeight: 600
    },
    cardList: {
        padding: theme.spacing(1.5),
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(2),
        "&::-webkit-scrollbar": { width: 6 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: 3 }
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: theme.spacing(2),
        boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        borderLeft: props => `6px solid ${props.riskColor || "#e2e8f0"}`,
        "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }
    },
    aiIndicator: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#eff6ff",
        color: "#1d4ed8",
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: "0.7rem",
        fontWeight: 700,
        boxShadow: "inset 0 0 0 1px #dbeafe"
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        backgroundColor: "#f1f5f9",
        marginTop: 10,
        overflow: "hidden"
    },
    progressFill: {
        height: "100%",
        transition: "width 1s ease-in-out"
    },
    riskChip: {
        fontSize: "0.65rem",
        fontWeight: 800,
        padding: "2px 8px",
        borderRadius: 6,
        textTransform: "uppercase"
    },
    loadMore: {
        textAlign: "center",
        padding: theme.spacing(1),
        color: theme.palette.text.secondary,
        cursor: "pointer",
        fontSize: "0.8rem",
        "&:hover": { color: theme.palette.primary.main }
    },
    searchHighlight: {
        backgroundColor: "#fef9c3",
        borderLeft: "6px solid #eab308 !important"
    },
    noResults: {
        textAlign: "center",
        padding: theme.spacing(2),
        color: "#94a3b8",
        fontSize: "0.8rem"
    }
}));

const IntelligentCard = ({ op, onClick, highlight }) => {
    const riskColor = (op.prediction && op.prediction.riskLevel === "HIGH") ? "#ef4444" : (op.prediction && op.prediction.riskLevel === "MEDIUM") ? "#f59e0b" : "#10b981";
    const probability = (op.prediction && (op.prediction.probability * 100).toFixed(0)) || 0;
    const classes = useStyles({ riskColor });

    return (
        <Box className={`${classes.card} ${highlight ? classes.searchHighlight : ""}`} onClick={() => onClick(op)}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Typography variant="body2" style={{ fontWeight: 700, color: "#334155", lineHeight: 1.2 }}>
                    {op.title}
                </Typography>
                {(op.prediction && op.prediction.riskLevel === "HIGH") && (
                    <Tooltip title="Alto Risco">
                        <WarningIcon style={{ fontSize: 16, color: riskColor }} />
                    </Tooltip>
                )}
            </Box>

            <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="caption" style={{ fontWeight: 600, color: "#64748b" }}>
                    {(op.contact && op.contact.name) || (op.lead && op.lead.name) || "Sem contato"}
                </Typography>
            </Box>

            {op.lead && op.lead.companyName && (
                <Typography variant="caption" style={{ color: "#94a3b8", display: "block", marginBottom: 4 }}>
                    🏢 {op.lead.companyName}
                </Typography>
            )}

            <Typography variant="subtitle2" style={{ fontWeight: 800, color: "#1e293b" }}>
                {fCurrency(op.value)}
            </Typography>

            <Box mt={1} display="flex" justifyContent="space-between" alignItems="center">
                <span className={classes.riskChip} style={{ backgroundColor: riskColor + '15', color: riskColor }}>
                    Win: {probability}%
                </span>
                {op.slaStatus === "EXPIRED" && (
                    <Box display="flex" alignItems="center" gap={0.5} style={{ color: "#ef4444", fontSize: "0.65rem", fontWeight: 800 }}>
                        <ClockIcon style={{ fontSize: 14 }} /> SLA EXP.
                    </Box>
                )}
            </Box>
        </Box>
    );
};

const PipelineBoard = () => {
    const classes = useStyles();
    const history = useHistory();
    const { user } = useContext(AuthContext);
    const socketContext = useSocket();
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
                    const leadName = (op.lead && op.lead.name || "").toLowerCase();
                    const contactName = (op.contact && op.contact.name || "").toLowerCase();
                    const companyName = (op.lead && op.lead.companyName || "").toLowerCase();
                    const cnpj = (op.lead && op.lead.cnpj || "").toLowerCase();
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
                <Grid container alignItems="center">
                    <Grid item xs={12}>
                        <Box display="flex" justifyContent="flex-end" alignItems="center" gap={3}>
                            <FormControl variant="outlined" size="small" style={{ minWidth: 220 }}>
                                <InputLabel>Funil de Vendas</InputLabel>
                                <Select value={selectedPipelineId} onChange={(e) => setSelectedPipelineId(e.target.value)} label="Funil de Vendas">
                                    {pipelines.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                                </Select>
                            </FormControl>

                            <Box display="flex" gap={1}>
                                <Button
                                    startIcon={<TimelineIcon />}
                                    variant={sort === "AI_PRIORITY" ? "contained" : "outlined"}
                                    style={{ borderRadius: 10, fontWeight: 700, backgroundColor: sort === "AI_PRIORITY" ? "#6366f1" : "transparent" }}
                                    color="primary"
                                    onClick={() => setSort(s => s === "AI_PRIORITY" ? "CREATED_AT" : "AI_PRIORITY")}
                                >
                                    Prioridade IA
                                </Button>
                                <IconButton onClick={() => setFilterModalOpen(true)}><FilterListIcon /></IconButton>
                            </Box>

                            <Divider orientation="vertical" flexItem style={{ margin: "0 10px" }} />

                            <Box display="flex" gap={4}>
                                <Box>
                                    <Typography variant="caption" display="block" color="textSecondary" style={{ fontWeight: 600 }}>REUNIÕES AGENDADAS</Typography>
                                    <Typography variant="h6" style={{ fontWeight: 900, color: "#8b5cf6", lineHeight: 1 }}>{board.pipeline?.scheduledMeetingsCount || 0}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" display="block" color="textSecondary" style={{ fontWeight: 600 }}>TOTAL FORECAST</Typography>
                                    <Typography variant="h6" style={{ fontWeight: 900, color: "#10b981", lineHeight: 1 }}>{fCurrency(totals.forecastValue)}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" display="block" color="textSecondary" style={{ fontWeight: 600 }}>ALERTA DE RISCO</Typography>
                                    <Typography variant="h6" style={{ fontWeight: 900, color: "#ef4444", lineHeight: 1 }}>{totals.highRiskCount}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>

                {/* Barra de controles: busca + filtros de usuário (admin) */}
                <div className={classes.controlBar}>
                    {/* Campo de busca */}
                    <div className={classes.searchBox}>
                        <SearchIcon style={{ fontSize: 16, color: "#94a3b8", flexShrink: 0 }} />
                        <input
                            className={classes.searchInput}
                            placeholder="Buscar lead, empresa, CNPJ..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                        {searchText && (
                            <IconButton size="small" onClick={() => setSearchText("")} style={{ padding: 2 }}>
                                <ClearIcon style={{ fontSize: 14, color: "#94a3b8" }} />
                            </IconButton>
                        )}
                    </div>

                    {searchText && searchResultCount !== null && (
                        <Typography variant="caption" style={{ color: "#6366f1", fontWeight: 700 }}>
                            {searchResultCount} resultado{searchResultCount !== 1 ? "s" : ""}
                        </Typography>
                    )}

                    {/* Sub-ferramentas CRM */}
                    <Divider orientation="vertical" flexItem style={{ margin: "0 4px", height: 28, alignSelf: "center" }} />
                    <Tooltip title="Dashboard Executivo">
                        <Button
                            size="small"
                            startIcon={<DashboardIcon style={{ fontSize: 15 }} />}
                            onClick={() => history.push("/executive-dashboard")}
                            style={{ fontSize: "0.75rem", textTransform: "none", color: "#475569", padding: "2px 8px" }}
                        >
                            Dashboard
                        </Button>
                    </Tooltip>
                    <Tooltip title="Configuração de Funil">
                        <Button
                            size="small"
                            startIcon={<TuneIcon style={{ fontSize: 15 }} />}
                            onClick={() => history.push("/pipeline-config")}
                            style={{ fontSize: "0.75rem", textTransform: "none", color: "#475569", padding: "2px 8px" }}
                        >
                            Config. Funil
                        </Button>
                    </Tooltip>
                    <Tooltip title="Webhooks CRM">
                        <Button
                            size="small"
                            startIcon={<CodeIcon style={{ fontSize: 15 }} />}
                            onClick={() => history.push("/crm-webhooks")}
                            style={{ fontSize: "0.75rem", textTransform: "none", color: "#475569", padding: "2px 8px" }}
                        >
                            Webhooks
                        </Button>
                    </Tooltip>
                    <Tooltip title="Automações do Kanban">
                        <Button
                            size="small"
                            startIcon={<TimelineIcon style={{ fontSize: 15 }} />}
                            onClick={() => history.push("/kanban-automations")}
                            style={{ fontSize: "0.75rem", textTransform: "none", color: "#475569", padding: "2px 8px" }}
                        >
                            Automações
                        </Button>
                    </Tooltip>

                    {/* Filtros de equipe — apenas admin */}
                    {isAdmin && (
                        <>
                            <Divider orientation="vertical" flexItem style={{ margin: "0 4px", height: 28, alignSelf: "center" }} />

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
                                    {viewMode === "team" ? "Kanban Equipe" : "Kanban Pessoal"}
                                </Button>
                            </Tooltip>

                            {viewMode === "team" && (
                                <FormControl variant="outlined" size="small" className={classes.memberSelect}>
                                    <InputLabel style={{ fontSize: "0.85rem" }}>Membro da Equipe</InputLabel>
                                    <Select
                                        value={selectedOwnerUserId}
                                        onChange={(e) => setSelectedOwnerUserId(e.target.value)}
                                        label="Membro da Equipe"
                                    >
                                        <MenuItem value=""><em>Toda a equipe</em></MenuItem>
                                        {teamUsers.map(u => (
                                            <MenuItem key={u.id} value={u.id}>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Avatar style={{ width: 20, height: 20, fontSize: "0.65rem", backgroundColor: "#6366f1" }}>
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

                    {!loading && (filteredBoard.stages || []).map(stage => (
                        <Droppable key={stage.id} droppableId={String(stage.id)}>
                            {(provided) => (
                                <Box className={classes.lane} ref={provided.innerRef} {...provided.droppableProps}>
                                    <div className={classes.laneHeader} style={{ backgroundColor: stage.color || "#475569" }}>
                                        <div className={classes.laneTitle}>
                                            <Box display="flex" alignItems="center">
                                                {stage.name} <span style={{ fontSize: "0.7rem", opacity: 0.8, marginLeft: 6 }}>| ID: {stage.id}</span>
                                                <span style={{ backgroundColor: "rgba(0,0,0,0.2)", padding: "2px 10px", borderRadius: 10, fontSize: "0.8rem", marginLeft: 8 }}>
                                                    {searchText ? stage.opportunities.length : stage.opportunitiesCount}
                                                </span>
                                            </Box>
                                            <Tooltip title="Importar Leads para este estágio">
                                                <IconButton size="small" onClick={() => handleOpenImport(stage.id)} style={{ color: "rgba(255,255,255,0.7)" }}>
                                                    <GetAppIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </div>
                                        <div className={classes.laneStats}>
                                            <span>Real: {fCurrency(stage.totalValue)}</span>
                                            <span style={{ color: "#4ade80" }}>{fCurrency(stage.forecastValue)}</span>
                                        </div>
                                        {stage.highRiskCount > 0 && (
                                            <Box display="flex" alignItems="center" gap={0.5} style={{ fontSize: "0.7rem", backgroundColor: "rgba(239, 68, 68, 0.4)", backdropFilter: "blur(4px)", padding: "4px 8px", borderRadius: 8, marginTop: 4 }}>
                                                <WarningIcon style={{ fontSize: 12 }} /> {stage.highRiskCount} leads críticos
                                            </Box>
                                        )}
                                    </div>

                                    <div className={classes.cardList}>
                                        {stage.opportunities.length === 0 && searchText && (
                                            <Typography className={classes.noResults}>Nenhum resultado</Typography>
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
            <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} maxWidth="xs" fullWidth PaperProps={{ style: { borderRadius: 20 } }}>
                <DialogTitle style={{ fontWeight: 900 }}>Inteligência de Vendas</DialogTitle>
                <DialogContent>
                    {selectedOp && (
                        <Box>
                            <Typography variant="body2" paragraph style={{ backgroundColor: "#f8fafc", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                                <LightbulbIcon style={{ fontSize: 16, color: "#6366f1", marginBottom: -3, marginRight: 4 }} />
                                <strong>Análise do Sistema:</strong> {(selectedOp.prediction && selectedOp.prediction.explanation) || "Aguardando processamento heurístico..."}
                            </Typography>

                            <Box mt={3} p={2} style={{ backgroundColor: "#eff6ff", borderRadius: 12 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>Essa sugestão foi útil?</Typography>
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
            <Dialog open={filterModalOpen} onClose={() => setFilterModalOpen(false)}>
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
                            control={<Switch checked={onlyAI} onChange={(e) => setOnlyAI(e.target.checked)} color="primary" />}
                            label="Apenas movidos por IA"
                        />

                        <FormControlLabel
                            control={<Switch checked={onlyExpired} onChange={(e) => setOnlyExpired(e.target.checked)} color="primary" />}
                            label="Apenas SLA Vencido"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setRiskFilter(""); setOnlyAI(false); setOnlyExpired(false); setSort("CREATED_AT"); }}>Limpar</Button>
                    <Button onClick={() => setFilterModalOpen(false)} color="primary" variant="contained">Aplicar</Button>
                </DialogActions>
            </Dialog>

            <ImportLeadsModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                defaultPipelineId={selectedPipelineId}
                stageId={selectedStageToImport}
                onSuccess={handleImportSuccess}
            />
        </Box>
    );
};

export default PipelineBoard;
