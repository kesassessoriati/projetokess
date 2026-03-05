import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Box,
    CircularProgress
} from "@material-ui/core";
import api from "../../services/api";
import moment from "moment";
import TimerIcon from "@material-ui/icons/Timer";

const useStyles = makeStyles(theme => ({
    tableCard: {
        background: "#ffffff",
        borderRadius: 16,
        padding: theme.spacing(3),
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
        border: "1px solid #f1f5f9",
        marginTop: theme.spacing(3),
    },
    chartTitle: {
        fontSize: "18px",
        fontWeight: 600,
        color: "#1a1a2e",
        marginBottom: theme.spacing(2)
    },
    tableHeader: {
        background: "#f8fafc",
        "& th": {
            fontWeight: 600,
            color: "#374151"
        }
    },
    tableRow: {
        "&:hover": {
            background: "#f8fafc",
        }
    }
}));

const formatTime = (seconds) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    let str = [];
    if (h > 0) str.push(`${h}h`);
    if (m > 0) str.push(`${m}m`);
    if (s > 0) str.push(`${s}s`);
    return str.join(" ");
};

const ProductivityReport = ({ dateFrom, dateTo }) => {
    const classes = useStyles();
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        fetchSessions();
    }, [dateFrom, dateTo]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/timer-sessions", {
                params: { dateFrom, dateTo }
            });
            setSessions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Box textAlign="center" my={4}><CircularProgress /></Box>;

    // Aggregations
    const timeByUser = {};
    const timeByTask = {};

    sessions.forEach(s => {
        const time = s.timeSpent || 0;
        const userName = s.user?.name || "Desconhecido";
        const taskName = s.task?.name || "Sem Tarefa";

        timeByUser[userName] = (timeByUser[userName] || 0) + time;
        timeByTask[taskName] = (timeByTask[taskName] || 0) + time;
    });

    return (
        <>
            <div className={classes.tableCard}>
                <Typography className={classes.chartTitle}>
                    <TimerIcon style={{ verticalAlign: 'middle', marginRight: 8, color: '#3b82f6' }} />
                    Tempo Total por Tarefa
                </Typography>
                <Table>
                    <TableHead className={classes.tableHeader}>
                        <TableRow>
                            <TableCell>Tarefa</TableCell>
                            <TableCell align="right">Tempo Gasto</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.entries(timeByTask).map(([task, time]) => (
                            <TableRow key={task} className={classes.tableRow}>
                                <TableCell style={{ fontWeight: 500 }}>{task}</TableCell>
                                <TableCell align="right" style={{ color: '#eb4034', fontWeight: 600 }}>{formatTime(time)}</TableCell>
                            </TableRow>
                        ))}
                        {Object.keys(timeByTask).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} align="center">Nenhuma sessão registrada no período.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className={classes.tableCard}>
                <Typography className={classes.chartTitle}>
                    <TimerIcon style={{ verticalAlign: 'middle', marginRight: 8, color: '#10b981' }} />
                    Tempo Total por Usuário
                </Typography>
                <Table>
                    <TableHead className={classes.tableHeader}>
                        <TableRow>
                            <TableCell>Usuário</TableCell>
                            <TableCell align="right">Tempo Gasto</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.entries(timeByUser).map(([user, time]) => (
                            <TableRow key={user} className={classes.tableRow}>
                                <TableCell style={{ fontWeight: 500 }}>{user}</TableCell>
                                <TableCell align="right" style={{ color: '#eb4034', fontWeight: 600 }}>{formatTime(time)}</TableCell>
                            </TableRow>
                        ))}
                        {Object.keys(timeByUser).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} align="center">Nenhuma sessão registrada no período.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className={classes.tableCard}>
                <Typography className={classes.chartTitle}>Histórico Detalhado (Recentes)</Typography>
                <Table>
                    <TableHead className={classes.tableHeader}>
                        <TableRow>
                            <TableCell>Data Formato</TableCell>
                            <TableCell>Usuário</TableCell>
                            <TableCell>Tarefa</TableCell>
                            <TableCell>Ticket (Atendimento)</TableCell>
                            <TableCell align="right">Tempo</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sessions.slice(0, 50).map((s) => (
                            <TableRow key={s.id} className={classes.tableRow}>
                                <TableCell>{moment(s.createdAt).format("DD/MM/YYYY HH:mm")}</TableCell>
                                <TableCell>{s.user?.name || "-"}</TableCell>
                                <TableCell>{s.task?.name || "-"}</TableCell>
                                <TableCell>{s.ticketId ? `#${s.ticketId}` : "-"}</TableCell>
                                <TableCell align="right" style={{ fontWeight: 600 }}>{formatTime(s.timeSpent)}</TableCell>
                            </TableRow>
                        ))}
                        {sessions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">Nenhuma sessão registrada no período.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
};

export default ProductivityReport;
