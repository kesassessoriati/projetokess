import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
    Box,
    Typography,
    Paper,
    Grid,
    CircularProgress,
    Tooltip,
    IconButton
} from "@material-ui/core";
import RefreshIcon from "@material-ui/icons/Refresh";
import SpeedIcon from "@material-ui/icons/Speed";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import BusinessIcon from "@material-ui/icons/Business";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import moment from "moment";
import { Bar, Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    ChartTooltip,
    Legend
);

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#f0f2f5",
        ...theme.scrollbarStyles
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 32px",
        backgroundColor: "#fff",
        borderBottom: "1px solid #e0e0e0"
    },
    content: {
        padding: 32,
        flex: 1,
        overflowY: "auto"
    },
    card: {
        padding: 24,
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        transition: "transform 0.2s",
        "&:hover": {
            transform: "translateY(-4px)"
        }
    },
    cardTitle: {
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "#666",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
    },
    cardValue: {
        fontSize: "1.8rem",
        fontWeight: 700,
        color: "#1a1a1a"
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12
    },
    chartPaper: {
        padding: 24,
        borderRadius: 16,
        height: "100%",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
    }
}));

const SystemMetrics = () => {
    const classes = useStyles();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState(null);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/system-metrics");
            setMetrics(data);
        } catch (err) {
            toastError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 60000); // Auto-refresh 1min
        return () => clearInterval(interval);
    }, []);

    if (loading && !metrics) {
        return (
            <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    const responseTimeChartData = {
        labels: (metrics?.eventsByDay || []).map(d => moment(d.day).format("DD/MM")),
        datasets: [{
            label: 'Volume de Atividades',
            data: (metrics?.eventsByDay || []).map(d => d.count),
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };

    const productEventsChartData = {
        labels: (metrics?.productEventsLast30Days || []).map(e => e.name.replace('_', ' ')),
        datasets: [{
            label: 'Eventos (30 dias)',
            data: (metrics?.productEventsLast30Days || []).map(e => e.count),
            backgroundColor: [
                '#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'
            ],
            borderRadius: 8
        }]
    };

    return (
        <Box className={classes.root}>
            <Box className={classes.header}>
                <Box>
                    <Typography variant="h5" style={{ fontWeight: 700 }}>Saúde do Sistema</Typography>
                    <Typography variant="body2" color="textSecondary">Métricas reais de performance e produto</Typography>
                </Box>
                <Tooltip title="Atualizar Agora">
                    <IconButton onClick={fetchMetrics} disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
                    </IconButton>
                </Tooltip>
            </Box>

            <Box className={classes.content}>
                <Grid container spacing={4}>
                    {/* Top Cards */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper className={classes.card}>
                            <Box className={classes.iconBox} style={{ backgroundColor: "#e3f2fd" }}>
                                <SpeedIcon style={{ color: "#1976d2" }} />
                            </Box>
                            <Typography className={classes.cardTitle}>Ø Resposta API</Typography>
                            <Typography className={classes.cardValue}>{metrics?.avgResponseTime}ms</Typography>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Paper className={classes.card}>
                            <Box className={classes.iconBox} style={{ backgroundColor: "#fbe9e7" }}>
                                <ErrorOutlineIcon style={{ color: "#d84315" }} />
                            </Box>
                            <Typography className={classes.cardTitle}>Taxa de Erros (24h)</Typography>
                            <Typography className={classes.cardValue}>{metrics?.errorRate}%</Typography>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Paper className={classes.card}>
                            <Box className={classes.iconBox} style={{ backgroundColor: "#e8f5e9" }}>
                                <EventAvailableIcon style={{ color: "#2e7d32" }} />
                            </Box>
                            <Typography className={classes.cardTitle}>Eventos Totais</Typography>
                            <Typography className={classes.cardValue}>{metrics?.totalEvents}</Typography>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Paper className={classes.card}>
                            <Box className={classes.iconBox} style={{ backgroundColor: "#fff3e0" }}>
                                <BusinessIcon style={{ color: "#ef6c00" }} />
                            </Box>
                            <Typography className={classes.cardTitle}>Empresas Ativas</Typography>
                            <Typography className={classes.cardValue}>{metrics?.usageByCompany?.length || 0}</Typography>
                        </Paper>
                    </Grid>

                    {/* Charts Row 1 */}
                    <Grid item xs={12} md={7}>
                        <Paper className={classes.chartPaper}>
                            <Typography variant="h6" gutterBottom style={{ fontWeight: 600 }}>Carga do Sistema (7 dias)</Typography>
                            <Line data={responseTimeChartData} options={{ maintainAspectRatio: false }} height={300} />
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        <Paper className={classes.chartPaper}>
                            <Typography variant="h6" gutterBottom style={{ fontWeight: 600 }}>Ações de Produto (30 dias)</Typography>
                            <Bar data={productEventsChartData} options={{ maintainAspectRatio: false, indexAxis: 'y' }} height={300} />
                        </Paper>
                    </Grid>

                    {/* Top Companies Table */}
                    <Grid item xs={12}>
                        <Paper className={classes.chartPaper}>
                            <Typography variant="h6" gutterBottom style={{ fontWeight: 600 }}>Uso por Empresa (Top 10 - 24h)</Typography>
                            <Box mt={2}>
                                <Grid container spacing={2} style={{ padding: "8px 0", borderBottom: "1px solid #eee", fontWeight: 600 }}>
                                    <Grid item xs={8}>Empresa</Grid>
                                    <Grid item xs={4} style={{ textAlign: "right" }}>Total de Requisições / Eventos</Grid>
                                </Grid>
                                {(metrics?.usageByCompany || []).map((item, idx) => (
                                    <Grid container key={idx} spacing={2} style={{ padding: "12px 0", borderBottom: "1px solid #f5f5f5" }}>
                                        <Grid item xs={8}>{item.companyName}</Grid>
                                        <Grid item xs={4} style={{ textAlign: "right", fontWeight: 700 }}>{item.count}</Grid>
                                    </Grid>
                                ))}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export default SystemMetrics;
