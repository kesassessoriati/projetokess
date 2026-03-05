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
    InputLabel,
    Tooltip
} from "@material-ui/core";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import StopIcon from "@material-ui/icons/Stop";
import SettingsIcon from "@material-ui/icons/Settings";
import DeleteIcon from "@material-ui/icons/Delete";
import AddIcon from "@material-ui/icons/Add";
import api from "../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
    timerContainer: {
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#1e1e2d", // dark background matching typical sidebar
        color: "#fff",
        borderRadius: "8px",
        margin: "8px 16px",
        boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
    },
    taskTitle: {
        fontSize: "14px",
        fontWeight: "bold",
        marginBottom: "8px",
        textAlign: "center",
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    },
    timerDisplay: {
        fontSize: "32px",
        fontWeight: "bold",
        letterSpacing: "2px",
        fontFamily: "monospace",
        margin: "8px 0",
        color: "#3b82f6" // blue primary
    },
    controls: {
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
        marginTop: "8px"
    },
    iconBtn: {
        color: "#a1a1aa",
        padding: "8px",
        "&:hover": {
            color: "#fff",
            backgroundColor: "rgba(255,255,255,0.1)"
        }
    },
    playBtn: {
        color: "#22c55e", // green
    },
    pauseBtn: {
        color: "#eab308", // yellow
    },
    stopBtn: {
        color: "#ef4444", // red
    },
    settingsModal: {
        minWidth: "400px"
    },
    formControl: {
        width: "100%",
        marginBottom: theme.spacing(2)
    }
}));

// Function to play beep sound
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

const ProductivityTimer = ({ userId }) => {
    const classes = useStyles();
    const [tasks, setTasks] = useState([]);
    const [selectedTaskId, setSelectedTaskId] = useState("");
    const [timeLeft, setTimeLeft] = useState(10 * 60); // in seconds
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [sessionId, setSessionId] = useState(null);

    // Settings form
    const [newTaskName, setNewTaskName] = useState("");
    const [newTaskTime, setNewTaskTime] = useState(10);
    const [defaultGlobalTime, setDefaultGlobalTime] = useState(10);

    const timerRef = useRef(null);
    const lastTickRef = useRef(null);

    useEffect(() => {
        fetchTasks();
        loadState();
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
        const savedState = localStorage.getItem(`timer_state_${userId}`);
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                setSelectedTaskId(state.selectedTaskId || "");
                setTimeLeft(state.timeLeft || 10 * 60);
                setIsActive(state.isActive || false);
                setIsPaused(state.isPaused || false);
                setSessionId(state.sessionId || null);

                if (state.isActive && !state.isPaused && state.lastTick) {
                    // Adjust for time elapsed while page was closed
                    const elapsed = Math.floor((Date.now() - state.lastTick) / 1000);
                    const newTimeLeft = Math.max(0, state.timeLeft - elapsed);
                    setTimeLeft(newTimeLeft);
                    if (newTimeLeft === 0) {
                        handleComplete(state.sessionId);
                    }
                }
            } catch (e) {
                console.error("Error loading timer state", e);
            }
        }
    };

    const saveState = useCallback(() => {
        const state = {
            selectedTaskId,
            timeLeft,
            isActive,
            isPaused,
            sessionId,
            lastTick: Date.now()
        };
        localStorage.setItem(`timer_state_${userId}`, JSON.stringify(state));
    }, [selectedTaskId, timeLeft, isActive, isPaused, sessionId, userId]);

    useEffect(() => {
        saveState();
    }, [saveState]);

    useEffect(() => {
        if (isActive && !isPaused && timeLeft > 0) {
            lastTickRef.current = Date.now();
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleComplete(sessionId);
                        return 0;
                    }

                    // Sound alerts
                    if (prev === 31) playBeep(200, 100, 50); // Muted beep at 30s
                    if (prev <= 11 && prev > 1) { // 10s countdown
                        playBeep(440, 150, 70);
                    }

                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, isPaused, sessionId]); // removed timeLeft from deps to avoid retriggering

    useEffect(() => {
        // Save last tick every interval for accurate background time tracking
        if (isActive && !isPaused) {
            const tickSaver = setInterval(saveState, 5000);
            return () => clearInterval(tickSaver);
        }
    }, [isActive, isPaused, saveState]);

    const handleStart = async () => {
        if (!selectedTaskId) {
            toast.warning("Selecione uma tarefa para iniciar o cronômetro.");
            return;
        }

        if (!isActive && !isPaused) {
            // Create new session
            try {
                const { data } = await api.post("/timer-sessions", {
                    taskId: selectedTaskId,
                    status: "active"
                });
                setSessionId(data.id);
            } catch (err) {
                console.error(err);
                toast.error("Erro ao iniciar sessão de tarefa.");
            }
        } else if (isPaused && sessionId) {
            // Resume session
            try {
                await api.put(`/timer-sessions/${sessionId}`, { status: "active" });
            } catch (e) { }
        }

        setIsActive(true);
        setIsPaused(false);
    };

    const handlePause = async () => {
        setIsPaused(true);
        if (sessionId) {
            try {
                const selectedTask = tasks.find(t => t.id === selectedTaskId);
                const timeSpent = (selectedTask?.defaultTime * 60 || defaultGlobalTime * 60) - timeLeft;
                await api.put(`/timer-sessions/${sessionId}`, {
                    status: "paused",
                    timeSpent: Math.max(0, timeSpent)
                });
            } catch (err) { }
        }
    };

    const handleReset = async () => {
        setIsActive(false);
        setIsPaused(false);

        if (sessionId) {
            try {
                const selectedTask = tasks.find(t => t.id === selectedTaskId);
                const timeSpent = (selectedTask?.defaultTime * 60 || defaultGlobalTime * 60) - timeLeft;
                await api.put(`/timer-sessions/${sessionId}`, {
                    status: "completed",
                    timeSpent: Math.max(0, timeSpent),
                    endTime: new Date()
                });
            } catch (err) { }
        }

        setSessionId(null);
        const selectedTask = tasks.find(t => t.id === selectedTaskId);
        setTimeLeft(selectedTask ? selectedTask.defaultTime * 60 : defaultGlobalTime * 60);
    };

    const handleComplete = async (sid) => {
        setIsActive(false);
        setIsPaused(false);
        // Play completion sound
        playBeep(880, 500, 100);
        setTimeout(() => playBeep(880, 500, 100), 600);

        toast.success("Tempo finalizado! 🎉");

        if (sid) {
            try {
                const selectedTask = tasks.find(t => t.id === selectedTaskId);
                await api.put(`/timer-sessions/${sid}`, {
                    status: "completed",
                    timeSpent: selectedTask ? selectedTask.defaultTime * 60 : defaultGlobalTime * 60,
                    endTime: new Date()
                });
            } catch (err) { }
        }
        setSessionId(null);

        // reset visual
        const selectedTask = tasks.find(t => t.id === selectedTaskId);
        setTimeLeft(selectedTask ? selectedTask.defaultTime * 60 : defaultGlobalTime * 60);
    };

    const handleTaskChange = (e) => {
        if (isActive && !isPaused) {
            toast.warning("Pause o cronômetro para trocar de tarefa.");
            return;
        }
        const val = e.target.value;
        setSelectedTaskId(val);
        const selectedTask = tasks.find(t => t.id === val);
        setTimeLeft(selectedTask ? selectedTask.defaultTime * 60 : defaultGlobalTime * 60);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    // Settings Handlers
    const handleSaveTask = async () => {
        if (!newTaskName) return;
        try {
            await api.post("/timer-tasks", {
                name: newTaskName,
                defaultTime: newTaskTime
            });
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
            if (selectedTaskId === id) {
                setSelectedTaskId("");
            }
        } catch (err) {
            toast.error("Erro ao deletar");
        }
    };

    const selectedTaskObj = tasks.find(t => t.id === selectedTaskId);

    return (
        <>
            <div className={classes.timerContainer}>
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Typography variant="caption" style={{ color: "#a1a1aa" }}>TAREFA ATUAL</Typography>
                    <Tooltip title="Configurações do Cronômetro">
                        <SettingsIcon
                            style={{ cursor: "pointer", fontSize: 16, color: "#a1a1aa" }}
                            onClick={() => setSettingsOpen(true)}
                        />
                    </Tooltip>
                </div>

                {tasks.length > 0 ? (
                    <FormControl className={classes.formControl} size="small" style={{ marginBottom: 0 }}>
                        <Select
                            value={selectedTaskId}
                            onChange={handleTaskChange}
                            disableUnderline
                            displayEmpty
                            style={{ color: "#fff", fontSize: 13, background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "2px 8px" }}
                        >
                            <SelectItem value="" disabled>Selecione uma tarefa</SelectItem>
                            {tasks.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : (
                    <Typography variant="body2" style={{ color: "#a1a1aa", fontSize: 12, marginBottom: 8 }}>
                        Nenhuma tarefa cadastrada.
                    </Typography>
                )}

                <div className={classes.timerDisplay}>
                    ⏱ {formatTime(timeLeft)}
                </div>

                <div className={classes.controls}>
                    {!isActive || isPaused ? (
                        <Tooltip title="Iniciar">
                            <IconButton className={`${classes.iconBtn} ${classes.playBtn}`} onClick={handleStart} size="small">
                                <PlayArrowIcon />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Pausar">
                            <IconButton className={`${classes.iconBtn} ${classes.pauseBtn}`} onClick={handlePause} size="small">
                                <PauseIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="Parar/Resetar">
                        <IconButton className={`${classes.iconBtn} ${classes.stopBtn}`} onClick={handleReset} size="small">
                            <StopIcon />
                        </IconButton>
                    </Tooltip>
                </div>
            </div>

            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Configurações de Produtividade ⏱️</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle2" gutterBottom>Nova Tarefa Rápida</Typography>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
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
                            style={{ width: "120px" }}
                            value={newTaskTime}
                            onChange={(e) => setNewTaskTime(Number(e.target.value))}
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSaveTask}
                            startIcon={<AddIcon />}
                        >
                            Add
                        </Button>
                    </div>

                    <Typography variant="subtitle2" gutterBottom>Minhas Tarefas ({tasks.length})</Typography>
                    <List dense style={{ backgroundColor: "#f5f5f5", borderRadius: 4, maxHeight: "200px", overflow: "auto" }}>
                        {tasks.map(t => (
                            <ListItem key={t.id}>
                                <ListItemText primary={t.name} secondary={`${t.defaultTime} min`} />
                                <ListItemSecondaryAction>
                                    <IconButton edge="end" onClick={() => handleDeleteTask(t.id)} size="small" style={{ color: "#ef4444" }}>
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
                            O cronômetro emitirá alertas sonoros aos 30 segundos finais e uma contagem regressiva nos últimos 10 segundos.
                        </Typography>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettingsOpen(false)} color="primary">
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ProductivityTimer;
