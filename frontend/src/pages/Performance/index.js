import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
    Box,
    Typography,
    Paper,
    Grid,
    CircularProgress,
    Tooltip,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip
} from "@material-ui/core";
import RefreshIcon from "@material-ui/icons/Refresh";
import AssessmentIcon from "@material-ui/icons/Assessment";
import MemoryIcon from "@material-ui/icons/Memory";
import RouterIcon from "@material-ui/icons/Router";
import TimerIcon from "@material-ui/icons/Timer";

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
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    ChartTooltip,
    Legend,
    Filler
);

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#f4f6f8",
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
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        height: "100%"
    },
    chartTitle: {
        fontSize: "1rem",
        fontWeight: 600,
        marginBottom: 20,
        color: "#333",
        display: "flex",
        alignItems: "center",
        gap: 10
    },
    tableContainer: {
        marginTop: 20,
        borderRadius: 12,
        overflow: "hidden"
    },
    methodChip: {
        fontWeight: 700,
        borderRadius: 4,
        height: 20,
        fontSize: "0.65rem"
    },
    severityCritical: { backgroundColor: "#f44336", color: "#fff" },
    severityHigh: { backgroundColor: "#ff9800", color: "#fff" },
    severityLow: { backgroundColor: "#4caf50", color: "#fff" }
}));

const Performance = () => {
    const classes = useStyles();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState(null);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/performance");
            setMetrics(data);
        } catch (err) {
            toastError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 30000); // 30s
        return () => clearInterval(interval);
    }, []);

    if (loading && !metrics) {
        return (
            <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    // Helper para formatar bytes
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Gráfico de Memória
    const memoryChartData = {
        labels: (metrics?.processMetrics || []).map(m => moment(m.createdAt).format("HH:mm")),
        datasets: [
            {
                label: 'Heap Used',
                data: (metrics?.processMetrics || []).map(m => (m.memoryHeapUsed / 1024 / 1024).toFixed(2)),
                borderColor: '#f44336',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                fill: true,
            },
            {
                label: 'RSS (Total)',
                data: (metrics?.processMetrics || []).map(m => (m.memoryRss / 1024 / 1024).toFixed(2)),
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: true,
            }
        ]
    };

    // Gráfico de Reqs/Min
    const rpmChartData = {
        labels: (metrics?.requestsPerMinute || []).map(m => moment(m.minute).format("HH:mm")),
        datasets: [{
            label: 'Reqs / Min',
            data: (metrics?.requestsPerMinute || []).map(m => m.count),
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };

    return (
        <Box className={classes.root}>
            <Box className={classes.header}>
                <Box>
                    <Typography variant="h5" style={{ fontWeight: 700 }}>Performance do Backend</Typography>
                    <Typography variant="body2" color="textSecondary">Monitoramento técnico de infraestrutura e rotas</Typography>
                </Box>
                <Tooltip title="Atualizar Agora">
                    <IconButton onClick={fetchMetrics} disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
                    </IconButton>
                </Tooltip>
            </Box>

            <Box className={classes.content}>
                <Grid container spacing={4}>
                    {/* Row 1: Memory & Requests */}
                    <Grid item xs={12} md={6}>
                        <Paper className={classes.card}>
                            <Typography className={classes.chartTitle}><MemoryIcon color="primary" /> Uso de Memória (MB)</Typography>
                            <Line data={memoryChartData} options={{ maintainAspectRatio: false }} height={250} />
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper className={classes.card}>
                            <Typography className={classes.chartTitle}><AssessmentIcon style={{ color: '#4caf50' }} /> Requisições por Minuto</Typography>
                            <Line data={rpmChartData} options={{ maintainAspectRatio: false }} height={250} />
                        </Paper>
                    </Grid>

                    {/* Row 2: Slow Routes Table */}
                    <Grid item xs={12}>
                        <Paper className={classes.card}>
                            <Typography className={classes.chartTitle}><TimerIcon style={{ color: '#ff9800' }} /> Top 10 Rotas mais Lentas (Média 24h)</Typography>
                            <TableContainer className={classes.tableContainer}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                                            <TableCell>Método</TableCell>
                                            <TableCell>Rota</TableCell>
                                            <TableCell align="right">Duração Média</TableCell>
                                            <TableCell align="right">Acessos</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(metrics?.avgTimeByRoute || []).map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <Chip
                                                        label={row.method}
                                                        size="small"
                                                        className={classes.methodChip}
                                                        style={{
                                                            backgroundColor: row.method === 'GET' ? '#e3f2fd' : row.method === 'POST' ? '#e8f5e9' : '#fff3e0',
                                                            color: row.method === 'GET' ? '#1976d2' : row.method === 'POST' ? '#2e7d32' : '#ef6c00'
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{row.route}</TableCell>
                                                <TableCell align="right" style={{ fontWeight: 700 }}>{parseFloat(row.avg_duration).toFixed(2)} ms</TableCell>
                                                <TableCell align="right">{row.count}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>

                    {/* Row 3: Slow Queries Stats */}
                    <Grid item xs={12} md={4}>
                        <Paper className={classes.card}>
                            <Typography className={classes.chartTitle}><RouterIcon color="action" /> Queries Lentas (24h)</Typography>
                            <Box display="flex" flexDirection="column" gap={2} mt={3}>
                                {(metrics?.slowQueriesCount || []).map((item, idx) => (
                                    <Box key={idx} display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2">{item.severity}</Typography>
                                        <Chip
                                            label={item.count}
                                            size="small"
                                            className={item.severity === 'CRITICAL' ? classes.severityCritical : item.severity === 'HIGH' ? classes.severityHigh : classes.severityLow}
                                        />
                                    </Box>
                                ))}
                                {metrics?.slowQueriesCount?.length === 0 && (
                                    <Typography variant="body2" color="textSecondary">Nenhuma query lenta detectada.</Typography>
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* CPU Stats */}
                    <Grid item xs={12} md={8}>
                        <Paper className={classes.card}>
                            <Typography className={classes.chartTitle}><TimerIcon color="primary" /> Event Loop Lag (ms)</Typography>
                            <Box height={150}>
                                <Line
                                    data={{
                                        labels: (metrics?.processMetrics || []).map(m => moment(m.createdAt).format("HH:mm")),
                                        datasets: [{
                                            label: 'Lag',
                                            data: (metrics?.processMetrics || []).map(m => m.eventLoopDelay.toFixed(3)),
                                            borderColor: '#9c27b0',
                                            backgroundColor: 'rgba(156, 39, 176, 0.1)',
                                            fill: true,
                                        }]
                                    }}
                                    options={{ maintainAspectRatio: false }}
                                />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export default Performance;
