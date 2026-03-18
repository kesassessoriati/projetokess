import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    makeStyles,
    Typography,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Select,
    MenuItem as SelectItem,
    FormControl,
    Tooltip
} from "@material-ui/core";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import StopIcon from "@material-ui/icons/Stop";
import SettingsIcon from "@material-ui/icons/Settings";
import DeleteIcon from "@material-ui/icons/Delete";
import AddIcon from "@material-ui/icons/Add";
import MinimizeIcon from "@material-ui/icons/Remove";
import MaximizeIcon from "@material-ui/icons/OpenInBrowser";
import api from "../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles(() => ({
    sidebarWidget: {
        backgroundColor: "rgba(0,0,0,0.2)",
        color: "#fff",
        borderRadius: 8,
        overflow: "hidden",
        transition: "all 0.2s ease",
        userSelect: "none",
        margin: "8px 8px 4px",
        width: "calc(100% - 16px)",
        boxSizing: "border-box",
    },
    // ── Collapsed sidebar (icon-only) view ─────────────────────────
    collapsedView: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 4px",
        cursor: "pointer",
        backgroundColor: "rgba(0,0,0,0.2)",
        borderRadius: 8,
        margin: "4px auto",
        width: 52,
        gap: 2,
    },
    // ── Minimized bar ──────────────────────────────────────────────
    minimizedBar: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        cursor: "pointer",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
    },
    miniTime: {
        fontFamily: "monospace",
        fontSize: 14,
        fontWeight: "bold",
        color: "#3b82f6",
        letterSpacing: 1,
    },
    miniTask: {
        flex: 1,
        fontSize: 11,
        color: "#a1a1aa",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    miniDot: {
        width: 7,
        height: 7,
        borderRadius: "50%",
        backgroundColor: "#22c55e",
        flexShrink: 0,
    },
    miniDotPaused: {
        backgroundColor: "#eab308",
    },
    miniDotIdle: {
        backgroundColor: "#4b5563",
    },
    // ── Expanded widget ────────────────────────────────────────────
    expanded: {
        width: "100%",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 10px 4px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
    },
    headerLabel: {
        fontSize: 10,
        color: "#6b7280",
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    body: {
        padding: "8px 10px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
    },
    taskSelect: {
        width: "100%",
    },
    timerDisplay: {
        fontFamily: "monospace",
        fontSize: 26,
        fontWeight: "bold",
        letterSpacing: 2,
        color: "#3b82f6",
        margin: "4px 0",
    },
    controls: {
        display: "flex",
        justifyContent: "center",
        gap: 4,
        width: "100%",
    },
    iconBtn: {
        padding: 6,
        color: "#a1a1aa",
        "&:hover": {
            color: "#fff",
            backgroundColor: "rgba(255,255,255,0.1)",
        },
    },
    playBtn: { color: "#22c55e" },
    pauseBtn: { color: "#eab308" },
    stopBtn: { color: "#ef4444" },
    miniBtn: { color: "#6b7280", padding: 4 },
}));

const playBeep = (freq = 440, duration = 200, vol = 100) => {
    try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.value = freq;
        oscillator.type = "sine";
        gain.gain.value = vol / 100;
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + duration * 0.001);
    } catch (e) {
        console.error("Audio playback not supported or blocked", e);
    }
};

const LS_STATE = (uid) => `timer_state_${uid}`;
const LS_MINI = "timer_minimized";

const ProductivityTimer = ({ userId, collapsed }) => {
    const classes = useStyles();

    const [minimized, setMinimized] = useState(
        () => localStorage.getItem(LS_MINI) === "true"
    );

    const [tasks, setTasks] = useState([]);
    const [selectedTaskId, setSelectedTaskId] = useState("");
    const [timeLeft, setTimeLeft] = useState(10 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [defaultGlobalTime] = useState(10);

    const [newTaskName, setNewTaskName] = useState("");
    const [newTaskTime, setNewTaskTime] = useState(10);

    const timerRef = useRef(null);
    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;

    // ── Persist minimize state ─────────────────────────────────────
    useEffect(() => {
        localStorage.setItem(LS_MINI, minimized ? "true" : "false");
    }, [minimized]);

    // ── Load timer state on mount ──────────────────────────────────
    useEffect(() => {
        fetchTasks();
        loadState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchTasks = async () => {
        try {
            const { data } = await api.get("/timer-tasks");
            setTasks(data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadState = () => {
        const raw = localStorage.getItem(LS_STATE(userId));
        if (!raw) return;
        try {
            const state = JSON.parse(raw);
            setSelectedTaskId(state.selectedTaskId || "");
            setIsActive(state.isActive || false);
            setIsPaused(state.isPaused || false);
            setSessionId(state.sessionId || null);

            if (state.isActive && !state.isPaused && state.lastTick) {
                // Restore real elapsed time
                const elapsed = Math.floor((Date.now() - state.lastTick) / 1000);
                const restored = Math.max(0, (state.timeLeft || 0) - elapsed);
                setTimeLeft(restored);
                if (restored === 0) {
                    handleComplete(state.sessionId);
                }
            } else {
                setTimeLeft(state.timeLeft || 10 * 60);
            }
        } catch (e) {
            console.error("Error loading timer state", e);
        }
    };

    const saveState = useCallback(() => {
        const state = {
            selectedTaskId,
            timeLeft,
            isActive,
            isPaused,
            sessionId,
            lastTick: Date.now(),
        };
        localStorage.setItem(LS_STATE(userId), JSON.stringify(state));
    }, [selectedTaskId, timeLeft, isActive, isPaused, sessionId, userId]);

    // Save on every state change
    useEffect(() => {
        saveState();
    }, [saveState]);

    // Save every second while running (keeps lastTick fresh for accurate restore)
    useEffect(() => {
        if (isActive && !isPaused) {
            const tickSaver = setInterval(saveState, 1000);
            return () => clearInterval(tickSaver);
        }
    }, [isActive, isPaused, saveState]);

    // ── Timer tick ─────────────────────────────────────────────────
    useEffect(() => {
        if (isActive && !isPaused && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleComplete(sessionId);
                        return 0;
                    }
                    if (prev === 31) playBeep(200, 100, 50);
                    if (prev <= 11 && prev > 1) playBeep(440, 150, 70);
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, isPaused, sessionId]);

    // ── Timer actions ──────────────────────────────────────────────
    const handleStart = async () => {
        if (!selectedTaskId) {
            toast.warning("Selecione uma tarefa para iniciar o cronômetro.");
            return;
        }
        if (!isActive && !isPaused) {
            try {
                const { data } = await api.post("/timer-sessions", {
                    taskId: selectedTaskId,
                    status: "active",
                });
                setSessionId(data.id);
            } catch (err) {
                console.error(err);
                toast.error("Erro ao iniciar sessão de tarefa.");
                return;
            }
        } else if (isPaused && sessionId) {
            try {
                await api.put(`/timer-sessions/${sessionId}`, { status: "active" });
            } catch (e) { /* non-critical */ }
        }
        setIsActive(true);
        setIsPaused(false);
    };

    const handlePause = async () => {
        setIsPaused(true);
        if (sessionId) {
            try {
                const task = tasksRef.current.find((t) => t.id === selectedTaskId);
                const timeSpent = (task?.defaultTime * 60 || defaultGlobalTime * 60) - timeLeft;
                await api.put(`/timer-sessions/${sessionId}`, {
                    status: "paused",
                    timeSpent: Math.max(0, timeSpent),
                });
            } catch (err) { /* non-critical */ }
        }
    };

    const handleReset = async () => {
        setIsActive(false);
        setIsPaused(false);
        if (sessionId) {
            try {
                const task = tasksRef.current.find((t) => t.id === selectedTaskId);
                const timeSpent = (task?.defaultTime * 60 || defaultGlobalTime * 60) - timeLeft;
                await api.put(`/timer-sessions/${sessionId}`, {
                    status: "completed",
                    timeSpent: Math.max(0, timeSpent),
                    endTime: new Date(),
                });
            } catch (err) { /* non-critical */ }
        }
        setSessionId(null);
        const task = tasksRef.current.find((t) => t.id === selectedTaskId);
        setTimeLeft(task ? task.defaultTime * 60 : defaultGlobalTime * 60);
    };

    const handleComplete = async (sid) => {
        setIsActive(false);
        setIsPaused(false);
        playBeep(880, 500, 100);
        setTimeout(() => playBeep(880, 500, 100), 600);
        toast.success("Tempo finalizado! 🎉");
        if (sid) {
            try {
                const task = tasksRef.current.find((t) => t.id === selectedTaskId);
                await api.put(`/timer-sessions/${sid}`, {
                    status: "completed",
                    timeSpent: task ? task.defaultTime * 60 : defaultGlobalTime * 60,
                    endTime: new Date(),
                });
            } catch (err) { /* non-critical */ }
        }
        setSessionId(null);
        const task = tasksRef.current.find((t) => t.id === selectedTaskId);
        setTimeLeft(task ? task.defaultTime * 60 : defaultGlobalTime * 60);
    };

    const handleTaskChange = (e) => {
        if (isActive && !isPaused) {
            toast.warning("Pause o cronômetro para trocar de tarefa.");
            return;
        }
        const val = e.target.value;
        setSelectedTaskId(val);
        const task = tasksRef.current.find((t) => t.id === val);
        setTimeLeft(task ? task.defaultTime * 60 : defaultGlobalTime * 60);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    // ── Settings handlers ──────────────────────────────────────────
    const handleSaveTask = async () => {
        if (!newTaskName) return;
        try {
            await api.post("/timer-tasks", { name: newTaskName, defaultTime: newTaskTime });
            setNewTaskName("");
            setNewTaskTime(10);
            fetchTasks();
            toast.success("Tarefa criada");
        } catch (err) {
            toast.error("Erro ao criar tarefa");
        }
    };

    const handleDeleteTask = async (id) => {
        try {
            await api.delete(`/timer-tasks/${id}`);
            fetchTasks();
            if (selectedTaskId === id) setSelectedTaskId("");
        } catch (err) {
            toast.error("Erro ao deletar");
        }
    };

    const selectedTask = tasks.find((t) => t.id === selectedTaskId);
    const dotClass = isActive && !isPaused
        ? classes.miniDot
        : isPaused
            ? `${classes.miniDot} ${classes.miniDotPaused}`
            : `${classes.miniDot} ${classes.miniDotIdle}`;

    // ── Render ─────────────────────────────────────────────────────
    return (
        <>
            {collapsed ? (
                // Compact icon-only view when sidebar is collapsed (72px)
                <Tooltip title="Cronômetro de Tarefa" placement="right">
                    <div
                        className={classes.collapsedView}
                        onClick={() => setMinimized(false)}
                    >
                        <div className={dotClass} />
                        <span className={classes.miniTime} style={{ fontSize: 11 }}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </Tooltip>
            ) : (
            <div className={classes.sidebarWidget}>
                {minimized ? (
                    // ── Minimized bar ──────────────────────────────
                    <div
                        className={classes.minimizedBar}
                        onClick={() => setMinimized(false)}
                        title="Expandir cronômetro"
                    >
                        <div className={dotClass} />
                        <span className={classes.miniTime}>⏱ {formatTime(timeLeft)}</span>
                        <span className={classes.miniTask}>
                            {selectedTask ? selectedTask.name : "Sem tarefa"}
                        </span>
                        <MaximizeIcon style={{ fontSize: 14, color: "#6b7280", flexShrink: 0 }} />
                    </div>
                ) : (
                    // ── Expanded widget ────────────────────────────
                    <div className={classes.expanded}>
                        <div className={classes.header}>
                            <Typography className={classes.headerLabel}>Tarefa Atual</Typography>
                            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Tooltip title="Configurações">
                                    <IconButton className={classes.miniBtn} size="small" onClick={() => setSettingsOpen(true)}>
                                        <SettingsIcon style={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Minimizar">
                                    <IconButton className={classes.miniBtn} size="small" onClick={() => setMinimized(true)}>
                                        <MinimizeIcon style={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                            </div>
                        </div>

                        <div className={classes.body}>
                            {tasks.length > 0 ? (
                                <FormControl className={classes.taskSelect} size="small">
                                    <Select
                                        value={selectedTaskId}
                                        onChange={handleTaskChange}
                                        disableUnderline
                                        displayEmpty
                                        style={{
                                            color: "#fff",
                                            fontSize: 12,
                                            background: "rgba(255,255,255,0.07)",
                                            borderRadius: 4,
                                            padding: "2px 8px",
                                        }}
                                    >
                                        <SelectItem value="" disabled>Selecione uma tarefa</SelectItem>
                                        {tasks.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ) : (
                                <Typography style={{ color: "#6b7280", fontSize: 11 }}>
                                    Nenhuma tarefa. Clique em ⚙️ para criar.
                                </Typography>
                            )}

                            <div className={classes.timerDisplay}>
                                {formatTime(timeLeft)}
                            </div>

                            <div className={classes.controls}>
                                {!isActive || isPaused ? (
                                    <Tooltip title="Iniciar">
                                        <IconButton
                                            className={`${classes.iconBtn} ${classes.playBtn}`}
                                            onClick={handleStart}
                                            size="small"
                                        >
                                            <PlayArrowIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                ) : (
                                    <Tooltip title="Pausar">
                                        <IconButton
                                            className={`${classes.iconBtn} ${classes.pauseBtn}`}
                                            onClick={handlePause}
                                            size="small"
                                        >
                                            <PauseIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                <Tooltip title="Parar/Resetar">
                                    <IconButton
                                        className={`${classes.iconBtn} ${classes.stopBtn}`}
                                        onClick={handleReset}
                                        size="small"
                                    >
                                        <StopIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Settings dialog */}
            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Configurações de Produtividade ⏱️</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle2" gutterBottom>Nova Tarefa Rápida</Typography>
                    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                        <TextField
                            label="Nome da Tarefa"
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={newTaskName}
                            onChange={(e) => setNewTaskName(e.target.value)}
                        />
                        <TextField
                            label="Minutos"
                            variant="outlined"
                            size="small"
                            type="number"
                            style={{ width: 110 }}
                            value={newTaskTime}
                            onChange={(e) => setNewTaskTime(Number(e.target.value))}
                        />
                        <Button variant="contained" color="primary" onClick={handleSaveTask} startIcon={<AddIcon />}>
                            Add
                        </Button>
                    </div>

                    <Typography variant="subtitle2" gutterBottom>
                        Minhas Tarefas ({tasks.length})
                    </Typography>
                    <List dense style={{ backgroundColor: "#f5f5f5", borderRadius: 4, maxHeight: 200, overflow: "auto" }}>
                        {tasks.map((t) => (
                            <ListItem key={t.id}>
                                <ListItemText primary={t.name} secondary={`${t.defaultTime} min`} />
                                <ListItemSecondaryAction>
                                    <IconButton edge="end" size="small" style={{ color: "#ef4444" }} onClick={() => handleDeleteTask(t.id)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                        {tasks.length === 0 && (
                            <ListItem><ListItemText primary="Sem tarefas. Adicione uma acima." /></ListItem>
                        )}
                    </List>

                    <div style={{ marginTop: 20 }}>
                        <Typography variant="subtitle2" gutterBottom>Aviso Sonoro</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Alertas sonoros aos 30 segundos finais e contagem regressiva nos últimos 10 segundos.
                        </Typography>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettingsOpen(false)} color="primary">Fechar</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ProductivityTimer;
