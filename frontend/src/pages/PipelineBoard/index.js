import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
    FormControlLabel
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
    FlashOn as FlashIcon
} from "@mui/icons-material";
import api from "../../services/api";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "react-toastify";

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
        padding: theme.spacing(2, 4),
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #e2e8f0",
        zIndex: 10,
    },
    boardArea: {
        flex: 1,
        display: "flex",
        overflowX: "auto",
        padding: theme.spacing(3),
        gap: theme.spacing(3),
        alignItems: "flex-start",
        "&::-webkit-scrollbar": { height: 8 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: 4 }
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
    }
}));

const IntelligentCard = ({ op, onFeedback }) => {
    const riskColor = op.prediction?.riskLevel === "HIGH" ? "#ef4444" : op.prediction?.riskLevel === "MEDIUM" ? "#f59e0b" : "#10b981";
    const probability = (op.prediction?.probability * 100).toFixed(0) || 0;
    const classes = useStyles({ riskColor });

    return (
        <Box className={classes.card} onClick={() => onFeedback(op)}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="body2" style={{ fontWeight: 700, color: "#334155" }}>{op.title}</Typography>
                {op.lastMovedBy === "AI" && (
                    <span className={classes.aiIndicator}><RobotIcon style={{ fontSize: 14 }} /> AI MOVADO</span>
                )}
            </Box>

            <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Avatar style={{ width: 28, height: 28, fontSize: 12, backgroundColor: "#6366f1" }}>{op.contact.name[0]}</Avatar>
                <Typography variant="caption" style={{ fontWeight: 600 }}>{op.contact.name}</Typography>
            </Box>

            <Typography variant="h5" style={{ fontWeight: 800, color: "#1e293b", letterSpacing: "-0.5px" }}>
                {fCurrency(op.value)}
            </Typography>

            <Box mt={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>Cenário de Fechamento</Typography>
                    <Typography variant="caption" style={{ fontWeight: 800, color: riskColor }}>{probability}%</Typography>
                </Box>
                <div className={classes.progressBar}>
                    <div className={classes.progressFill} style={{ width: `${probability}%`, backgroundColor: riskColor }} />
                </div>
            </Box>

            {op.slaStatus === "EXPIRED" && (
                <Box mt={1.5} display="flex" alignItems="center" gap={0.5} style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 800 }}>
                    <ClockIcon style={{ fontSize: 16 }} /> SLA EXPIRADO
                </Box>
            )}

            <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                <span className={classes.riskChip} style={{ backgroundColor: riskColor + '15', color: riskColor }}>
                    Risco {op.prediction?.riskLevel || "LOW"}
                </span>
                <Tooltip title="Ver Detalhes IA">
                    <IconButton size="small"><FlashIcon style={{ fontSize: 18, color: "#fbbf24" }} /></IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

const PipelineBoard = () => {
    const classes = useStyles();
    const [pipelines, setPipelines] = useState([]);
    const [selectedPipelineId, setSelectedPipelineId] = useState("");
    const [board, setBoard] = useState({ stages: [] });
    const [loading, setLoading] = useState(false);
    const [sort, setSort] = useState("CREATED_AT");

    // Filtros
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [riskFilter, setRiskFilter] = useState("");
    const [onlyAI, setOnlyAI] = useState(false);
    const [onlyExpired, setOnlyExpired] = useState(false);

    // IA Feedback
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [selectedOp, setSelectedOp] = useState(null);

    useEffect(() => {
        fetchPipelines();
    }, []);

    useEffect(() => {
        if (selectedPipelineId) {
            fetchBoard();
        }
    }, [selectedPipelineId, riskFilter, onlyAI, onlyExpired, sort]);

    const fetchPipelines = async () => {
        try {
            const { data } = await api.get("/pipelines");
            setPipelines(data);
            if (data.length > 0) setSelectedPipelineId(data[0].id);
        } catch (e) { }
    };

    const fetchBoard = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/pipelines/${selectedPipelineId}/board`, {
                params: { riskLevel: riskFilter, onlyAI, onlyExpired, sort }
            });
            setBoard(data);
        } catch (err) {
            toast.error("Impossível conectar ao serviço de inteligência");
        } finally {
            setLoading(false);
        }
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

    const totals = useMemo(() => {
        return (board.stages || []).reduce((acc, stage) => {
            acc.totalValue += stage.totalValue;
            acc.forecastValue += stage.forecastValue;
            acc.highRiskCount += stage.highRiskCount;
            return acc;
        }, { totalValue: 0, forecastValue: 0, highRiskCount: 0 });
    }, [board]);

    return (
        <Box className={classes.container}>
            <header className={classes.header}>
                <Grid container alignItems="center">
                    <Grid item xs={12} md={4}>
                        <Typography variant="h4" style={{ fontWeight: 900, color: "#0f172a", letterSpacing: "-1px" }}>Experience Lab</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Chip label="AI POWERED" size="small" style={{ backgroundColor: "#000", color: "#fff", fontWeight: 900, fontSize: "0.6rem" }} />
                            <Typography variant="caption" color="textSecondary">Pipeline Engine v2.5</Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={8}>
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
            </header>

            <Box className={classes.boardArea}>
                {loading && <CircularProgress style={{ margin: "auto" }} color="primary" />}

                {!loading && (board.stages || []).map(stage => (
                    <Box key={stage.id} className={classes.lane}>
                        <div className={classes.laneHeader} style={{ backgroundColor: stage.color || "#475569" }}>
                            <div className={classes.laneTitle}>
                                {stage.name}
                                <span style={{ backgroundColor: "rgba(0,0,0,0.2)", padding: "2px 10px", borderRadius: 10, fontSize: "0.8rem" }}>{stage.opportunitiesCount}</span>
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
                            {stage.opportunities.map(op => (
                                <IntelligentCard
                                    key={op.id}
                                    op={op}
                                    onFeedback={(o) => { setSelectedOp(o); setFeedbackOpen(true); }}
                                />
                            ))}
                            {stage.hasMore && (
                                <Typography className={classes.loadMore}>Carregar mais...</Typography>
                            )}
                        </div>
                    </Box>
                ))}
            </Box>

            {/* Modal de Detalhes e Feedback da IA */}
            <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} maxWidth="xs" fullWidth PaperProps={{ style: { borderRadius: 20 } }}>
                <DialogTitle style={{ fontWeight: 900 }}>Inteligência de Vendas</DialogTitle>
                <DialogContent>
                    {selectedOp && (
                        <Box>
                            <Typography variant="body2" paragraph style={{ backgroundColor: "#f8fafc", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                                <LightbulbIcon style={{ fontSize: 16, color: "#6366f1", marginBottom: -3, marginRight: 4 }} />
                                <strong>Análise do Sistema:</strong> {selectedOp.prediction?.explanation || "Aguardando processamento heurístico..."}
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
        </Box>
    );
};

export default PipelineBoard;
