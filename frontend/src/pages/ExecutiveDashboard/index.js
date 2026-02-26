import React, { useState, useEffect, useMemo, useContext } from "react";
import {
    makeStyles,
    Typography,
    Box,
    Grid,
    Paper,
    CircularProgress,
    Divider,
    LinearProgress,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    IconButton
} from "@material-ui/core";
import {
    TrendingUp,
    AccountBalanceWallet,
    Warning,
    Psychology,
    Timeline,
    EmojiEvents,
    Timer,
    Info as InfoIcon,
    Edit,
    GetApp,
    EventAvailable
} from "@mui/icons-material";
import ReactApexChart from "react-apexcharts";
import api from "../../services/api";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";

const fCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const useStyles = makeStyles((theme) => ({
    container: {
        padding: theme.spacing(4),
        backgroundColor: "#f8fafc",
        minHeight: "100vh"
    },
    card: {
        padding: theme.spacing(3),
        borderRadius: 16,
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
    },
    title: {
        fontWeight: 900,
        color: "#0f172a",
        marginBottom: theme.spacing(4),
        letterSpacing: "-1px"
    },
    metricLabel: {
        color: "#64748b",
        fontSize: "0.8rem",
        fontWeight: 700,
        textTransform: "uppercase"
    },
    metricValue: {
        fontWeight: 900,
        fontSize: "2rem",
        color: "#1e293b",
        lineHeight: 1.2
    },
    roiBox: {
        background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        color: "#fff",
        borderRadius: 16,
        padding: theme.spacing(3)
    },
    healthBar: {
        height: 10,
        borderRadius: 5,
        backgroundColor: "#e2e8f0"
    },
    "@media print": {
        container: {
            padding: 0,
            background: "#fff",
            "& button": { display: "none" }
        },
        card: {
            boxShadow: "none !important",
            border: "1px solid #e2e8f0 !important"
        }
    }
}));

const ExecutiveDashboard = () => {
    const classes = useStyles();
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [goalModalOpen, setGoalModalOpen] = useState(false);
    const [newGoal, setNewGoal] = useState("");

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await api.get("/executive/dashboard");
            setData(response.data);
        } catch (e) {
            toast.error("Erro ao carregar dados estratégicos");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGoal = async () => {
        try {
            const key = user.profile === "admin" ? "executive_goal" : `executive_goal_${user.id}`;
            await api.put(`/settings/${key}`, { value: newGoal.replace(/\D/g, "") });
            toast.success("Meta atualizada com sucesso!");
            setGoalModalOpen(false);
            setLoading(true);
            fetchDashboard();
        } catch (err) {
            toast.error("Erro ao salvar a meta.");
        }
    };

    const revenueChart = useMemo(() => {
        if (!data) return {};
        return {
            series: [
                { name: "Realizado", data: [data.revenue.real] },
                { name: "Previsão IA", data: [data.revenue.forecast] }
            ],
            options: {
                chart: { type: 'bar', stacked: true, toolbar: { show: false } },
                plotOptions: { bar: { horizontal: false, columnWidth: '50%', borderRadius: 8 } },
                xaxis: { categories: ['Receita Mensal'], labels: { show: false } },
                colors: ['#6366f1', '#fbbf24'],
                dataLabels: { enabled: false }
            }
        };
    }, [data]);

    if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="100vh"><CircularProgress /></Box>;
    if (!data) return <Box display="flex" justifyContent="center" alignItems="center" height="100vh"><Typography>Não foi possível carregar os dados. Verifique a conexão ou se há dados no Pipeline.</Typography></Box>;

    return (
        <Box className={classes.container}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h3" className={classes.title} style={{ marginBottom: 0 }}>Revenue Intelligence Hub</Typography>
                <Button variant="contained" color="primary" startIcon={<GetApp />} onClick={() => window.print()}>
                    Exportar PDF
                </Button>
            </Box>

            <Grid container spacing={4}>
                {/* Bloco 1 - Receita */}
                <Grid item xs={12} md={3}>
                    <Paper className={classes.card}>
                        <Box>
                            <Typography className={classes.metricLabel}>Receita Real (WON)</Typography>
                            <Typography className={classes.metricValue}>{fCurrency(data.revenue.real)}</Typography>
                        </Box>
                        <Box mt={2} color="#10b981" display="flex" alignItems="center" gap={1}>
                            <EmojiEvents fontSize="small" />
                            <Typography variant="caption" style={{ fontWeight: 700 }}>Em direção à meta</Typography>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Paper className={classes.card}>
                        <Box>
                            <Typography className={classes.metricLabel}>Previsão IA (30 Dias)</Typography>
                            <Typography className={classes.metricValue} style={{ color: "#6366f1" }}>{fCurrency(data.revenue.forecast)}</Typography>
                        </Box>
                        <Box mt={2}>
                            <LinearProgress variant="determinate" value={Math.min(100, (data.revenue.real / data.revenue.target) * 100)} style={{ borderRadius: 4, height: 6 }} />
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Paper className={classes.card}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                                <Typography className={classes.metricLabel}>Gap p/ Meta</Typography>
                                <Typography className={classes.metricValue} style={{ color: "#ef4444" }}>{fCurrency(data.revenue.gap)}</Typography>
                            </Box>
                            <IconButton size="small" onClick={() => { setNewGoal(data.revenue.target); setGoalModalOpen(true); }}>
                                <Edit fontSize="small" color="primary" />
                            </IconButton>
                        </Box>
                        <Typography variant="caption" color="textSecondary">Meta: {fCurrency(data.revenue.target)}</Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Box className={classes.roiBox}>
                        <Typography variant="subtitle2" style={{ fontWeight: 800, opacity: 0.8 }}>ROI DA INTELIGÊNCIA</Typography>
                        <Typography variant="h4" style={{ fontWeight: 900, marginTop: 8 }}>+{data.aiRoi.estimatedEfficiencyGain.toFixed(1)}%</Typography>
                        <Typography variant="caption" style={{ opacity: 0.7 }}>Aumento de eficiência operacional detectado pela IA</Typography>
                    </Box>
                </Grid>

                {/* Bloco de Leads Gerados/Reuniões */}
                <Grid item xs={12} md={3}>
                    <Paper className={classes.card} style={{ alignItems: "center", textAlign: "center" }}>
                        <EventAvailable style={{ fontSize: 40, color: "#8b5cf6" }} />
                        <Typography variant="h4" style={{ fontWeight: 900, margin: "10px 0" }}>{data.leads.scheduledToday}</Typography>
                        <Typography className={classes.metricLabel}>Reuniões Hoje</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Paper className={classes.card} style={{ alignItems: "center", textAlign: "center" }}>
                        <EventAvailable style={{ fontSize: 40, color: "#10b981" }} />
                        <Typography variant="h4" style={{ fontWeight: 900, margin: "10px 0" }}>{data.leads.totalScheduled}</Typography>
                        <Typography className={classes.metricLabel}>Total de Reuniões</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Paper className={classes.card} style={{ alignItems: "center", textAlign: "center" }}>
                        <Timeline style={{ fontSize: 40, color: "#3b82f6" }} />
                        <Typography variant="h4" style={{ fontWeight: 900, margin: "10px 0" }}>{data.leads.totalGenerated}</Typography>
                        <Typography className={classes.metricLabel}>Total de Leads Gerados</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Paper className={classes.card} style={{ alignItems: "center", textAlign: "center" }}>
                        <TrendingUp style={{ fontSize: 40, color: "#f59e0b" }} />
                        <Typography variant="h4" style={{ fontWeight: 900, margin: "10px 0" }}>{data.leads.totalConverted}</Typography>
                        <Typography className={classes.metricLabel}>Leads Convertidos</Typography>
                    </Paper>
                </Grid>

                {/* Bloco 2 - Gráficos e Saúde */}
                <Grid item xs={12} md={8}>
                    <Paper className={classes.card} style={{ height: 400 }}>
                        <Typography variant="h6" style={{ fontWeight: 800, marginBottom: 20 }}>Forecast de Receita por Vendedor (IA-Weighted)</Typography>
                        <Box flex={1}>
                            {data.performance.sellerRanking.length > 0 ? (
                                <ReactApexChart
                                    options={{
                                        chart: { type: 'bar' },
                                        plotOptions: { bar: { horizontal: true, borderRadius: 10 } },
                                        colors: ['#6366f1'],
                                        xaxis: { categories: data.performance.sellerRanking.map(s => s.sellerName) }
                                    }}
                                    series={[{ name: "Forecast", data: data.performance.sellerRanking.map(s => s.forecast) }]}
                                    type="bar"
                                    height="100%"
                                />
                            ) : <Typography>Sem dados suficientes para ranking.</Typography>}
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper className={classes.card}>
                        <Typography variant="h6" style={{ fontWeight: 800, marginBottom: 20 }}>Saúde do Pipeline</Typography>
                        <Box display="flex" flexDirection="column" gap={3}>
                            {data.pipelineHealth.map(pipe => (
                                <Box key={pipe.id}>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="subtitle2" style={{ fontWeight: 700 }}>{pipe.name}</Typography>
                                        <Typography variant="subtitle2" style={{ fontWeight: 900 }}>{pipe.score}/100</Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={pipe.score}
                                        className={classes.healthBar}
                                        style={{
                                            backgroundColor: "#f1f5f9",
                                            "& .MuiLinearProgress-bar": { backgroundColor: pipe.score > 70 ? "#10b981" : pipe.score > 40 ? "#fbbf24" : "#ef4444" }
                                        }}
                                    />
                                </Box>
                            ))}
                            {data.pipelineHealth.length === 0 && <Typography variant="caption">Nenhum pipeline ativo.</Typography>}
                        </Box>

                        <Box mt={4} p={2} style={{ backgroundColor: "#fff7ed", borderRadius: 12, border: "1px solid #ffedd5" }}>
                            <Typography variant="caption" color="textSecondary" style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 4 }}>
                                <Warning fontSize="inherit" style={{ color: "#f97316" }} /> ALERTAS EXECUTIVOS
                            </Typography>
                            <Box mt={1}>
                                <Typography variant="body2" style={{ fontWeight: 600 }}>{data.risks.highRiskCount} leads com alto risco de perda detectados.</Typography>
                                <Typography variant="body2" style={{ fontWeight: 600 }}>Taxa de SLA expirado em {data.risks.slaExpiredRate.toFixed(1)}%.</Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>

                {/* Bloco 3 - KPIs Operacionais */}
                <Grid item xs={12} md={4}>
                    <Paper className={classes.card} style={{ alignItems: "center", textAlign: "center" }}>
                        <Timer style={{ fontSize: 40, color: "#6366f1" }} />
                        <Typography variant="h4" style={{ fontWeight: 900, margin: "10px 0" }}>{data.performance.avgSalesCycle.toFixed(1)} Dias</Typography>
                        <Typography className={classes.metricLabel}>Ciclo Médio de Fechamento</Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper className={classes.card} style={{ alignItems: "center", textAlign: "center" }}>
                        <Psychology style={{ fontSize: 40, color: "#10b981" }} />
                        <Typography variant="h4" style={{ fontWeight: 900, margin: "10px 0" }}>{data.aiRoi.accuracyRate.toFixed(1)}%</Typography>
                        <Typography className={classes.metricLabel}>Precisão da IA (Feedback Humano)</Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper className={classes.card} style={{ alignItems: "center", textAlign: "center" }}>
                        <Timeline style={{ fontSize: 40, color: "#f59e0b" }} />
                        <Typography variant="h4" style={{ fontWeight: 900, margin: "10px 0" }}>{data.performance.winRate.toFixed(1)}%</Typography>
                        <Typography className={classes.metricLabel}>Taxa de Conversão Real (Win Rate)</Typography>
                    </Paper>
                </Grid>

            </Grid>

            {/* Modal de Editar Meta */}
            <Dialog open={goalModalOpen} onClose={() => setGoalModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ajustar Meta</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
                        {user.profile === "admin" ? "Defina a meta geral do negócio. Todos os usuários visualizarão essa meta, a menos que uma meta individual (gap) seja definida pra eles." : "Defina sua meta individual (gap) para não depender da meta global."}
                    </Typography>
                    <TextField
                        label="Valor da Meta (R$)"
                        fullWidth
                        variant="outlined"
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        type="number"
                        placeholder="Ex: 1000000"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setGoalModalOpen(false)} color="default">
                        Cancelar
                    </Button>
                    <Button onClick={handleSaveGoal} color="primary" variant="contained">
                        Salvar Meta
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default ExecutiveDashboard;
