import React, { useState, useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { makeStyles } from "@material-ui/core/styles";
import {
    Button,
    IconButton,
    Typography,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Avatar,
    Tooltip,
    Chip,
} from "@material-ui/core";
import {
    Add,
    Delete,
    Link as LinkIcon,
    DragIndicator,
} from "@material-ui/icons";
import api from "../../services/api";
import { toast } from "react-toastify";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import { format, parseISO, isPast, isToday } from "date-fns";
import ContextPageHeader from "../../components/ContextPageHeader";

// ─── Priority config ─────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
    Baixa:   { bg: "#e3f2fd", color: "#1565c0" },
    Média:   { bg: "#fff8e1", color: "#e65100" },
    Alta:    { bg: "#fbe9e7", color: "#bf360c" },
    Urgente: { bg: "#ffebee", color: "#b71c1c" },
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: theme.palette.type === "dark" ? "#1a1a2e" : "#f0f2f5",
        overflow: "hidden",
    },
    boardBar: {
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(1.5),
        padding: theme.spacing(1.5, 2),
        backgroundColor: theme.palette.type === "dark" ? "#16213e" : "#fff",
        borderBottom: `1px solid ${theme.palette.divider}`,
        flexWrap: "wrap",
        flexShrink: 0,
        [theme.breakpoints.down("sm")]: {
            padding: theme.spacing(1),
            gap: theme.spacing(1),
        },
    },
    boardSelect: {
        minWidth: 200,
        [theme.breakpoints.down("sm")]: {
            minWidth: 140,
            flex: 1,
        },
    },
    boardCanvas: {
        display: "flex",
        flex: 1,
        overflowX: "auto",
        overflowY: "hidden",
        padding: theme.spacing(2),
        gap: theme.spacing(2),
        alignItems: "flex-start",
        "&::-webkit-scrollbar": { height: 8 },
        "&::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: theme.palette.type === "dark" ? "#555" : "#c1c7d0",
        },
        [theme.breakpoints.down("sm")]: {
            padding: theme.spacing(1),
            gap: theme.spacing(1),
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            alignItems: "flex-start",
        },
    },
    column: {
        minWidth: 280,
        maxWidth: 280,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.palette.type === "dark" ? "#2d2d2d" : "#ebecf0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        overflow: "hidden",
        flexShrink: 0,
        [theme.breakpoints.down("sm")]: {
            minWidth: 240,
            maxWidth: 240,
        },
    },
    columnHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: theme.spacing(1, 1, 1, 1),
        userSelect: "none",
    },
    columnTitle: {
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 0.3,
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    columnActions: {
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
    },
    countBadge: {
        fontSize: 11,
        fontWeight: 700,
        padding: "1px 7px",
        borderRadius: 10,
        marginLeft: 4,
        marginRight: 4,
        flexShrink: 0,
    },
    taskList: {
        flex: 1,
        overflowY: "auto",
        padding: theme.spacing(0.5, 1, 0, 1),
        minHeight: 60,
        "&::-webkit-scrollbar": { width: 4 },
        "&::-webkit-scrollbar-thumb": {
            borderRadius: 4,
            backgroundColor: "rgba(0,0,0,0.15)",
        },
    },
    emptyColumn: {
        textAlign: "center",
        padding: theme.spacing(2.5, 1),
        color: theme.palette.text.disabled,
        fontSize: 12,
        borderRadius: 8,
        border: `2px dashed ${theme.palette.divider}`,
        margin: theme.spacing(0.5, 0),
    },
    taskCard: {
        backgroundColor: theme.palette.type === "dark" ? "#3a3a3a" : "#fff",
        borderRadius: 8,
        padding: theme.spacing(1.5),
        marginBottom: theme.spacing(1),
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        cursor: "pointer",
        border: "1px solid transparent",
        transition: "box-shadow 0.15s, border-color 0.15s",
        "&:hover": {
            boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
            borderColor: theme.palette.primary.light,
        },
    },
    cardTitle: {
        fontWeight: 600,
        fontSize: 13,
        lineHeight: 1.4,
        marginBottom: 6,
        wordBreak: "break-word",
    },
    cardMeta: {
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
    },
    priorityBadge: {
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 12,
    },
    dueDateChip: {
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 12,
        fontWeight: 600,
    },
    responsibleAvatar: {
        width: 20,
        height: 20,
        fontSize: 10,
        marginLeft: "auto",
    },
    cardLink: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        color: "#3b82f6",
        textDecoration: "none",
        marginTop: 6,
        "&:hover": { textDecoration: "underline" },
    },
    addCardBtn: {
        width: "100%",
        justifyContent: "flex-start",
        borderRadius: 6,
        padding: theme.spacing(0.5, 1),
        fontSize: 12,
        color: theme.palette.text.secondary,
        "&:hover": {
            backgroundColor: "rgba(0,0,0,0.05)",
        },
    },
    emptyBoard: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing(1.5),
        color: theme.palette.text.secondary,
    },
    loadingOverlay: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    noBoardsState: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing(2),
        color: theme.palette.text.secondary,
    },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name = "") =>
    name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const formatDueDate = (isoDate) => {
    if (!isoDate) return null;
    try {
        const d = parseISO(isoDate);
        return {
            label:   format(d, "dd/MM/yyyy"),
            overdue: isPast(d) && !isToday(d),
            today:   isToday(d),
        };
    } catch {
        return null;
    }
};

// ─── Component ────────────────────────────────────────────────────────────────
const Tasks = () => {
    const classes = useStyles();
    const history = useHistory();
    const location = useLocation();

    const [boards, setBoards]                   = useState([]);
    const [selectedBoardId, setSelectedBoardId] = useState("");
    const [boardData, setBoardData]             = useState(null);
    const [loading, setLoading]                 = useState(false);
    const [users, setUsers]                     = useState([]);
    const [completedTasks, setCompletedTasks]   = useState([]);
    const [completedLoading, setCompletedLoading] = useState(false);
    const [showCompleted, setShowCompleted]     = useState(false);
    const [completedViewMode, setCompletedViewMode] = useState("kanban");

    // Board modal
    const [openModalBoard, setOpenModalBoard] = useState(false);
    const [boardForm, setBoardForm]           = useState({ name: "", description: "" });

    // Column modal
    const [openListModal, setOpenListModal] = useState(false);
    const [listForm, setListForm]           = useState({ name: "", color: "#ebecf0" });

    // Task modal
    const [openTaskModal, setOpenTaskModal] = useState(false);
    const [taskForm, setTaskForm]           = useState({
        id: null, listId: "", title: "", description: "",
        priority: "Média", dueDate: "", tags: [], url: "",
        color: "#ffffff", responsibleId: "", status: "active",
        completedAt: "", completedByUser: null,
    });

    // ── Mount ─────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchBoards();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (boards.length > 0 && !selectedBoardId) {
            setSelectedBoardId(boards[0].id);
        }
    }, [boards]);

    useEffect(() => {
        if (selectedBoardId) {
            setBoardData(boards.find((b) => b.id === selectedBoardId) || null);
        } else {
            setBoardData(null);
        }
    }, [selectedBoardId, boards]);

    // ── Data fetchers ─────────────────────────────────────────────────────
    const fetchBoards = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/tasks");
            setBoards(data);
        } catch {
            toast.error("Erro ao carregar quadros");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const { data } = await api.get("/users", { params: { limit: 200 } });
            setUsers(data.users || data || []);
        } catch { /* non-critical */ }
    };

    const fetchCompletedTasks = async () => {
        setCompletedLoading(true);
        try {
            const { data } = await api.get("/tasks/completed");
            setCompletedTasks(data || []);
        } catch {
            toast.error("Erro ao carregar tarefas concluidas");
        } finally {
            setCompletedLoading(false);
        }
    };

    useEffect(() => {
        fetchCompletedTasks();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const taskId = params.get("taskId");
        if (!taskId || boards.length === 0) return;

        const numericTaskId = Number(taskId);
        let targetTask = null;
        let targetBoardId = null;

        for (const board of boards) {
            for (const list of board.lists || []) {
                const foundTask = (list.tasks || []).find((task) => task.id === numericTaskId);
                if (foundTask) {
                    targetTask = foundTask;
                    targetBoardId = board.id;
                    break;
                }
            }
            if (targetTask) break;
        }

        if (targetTask && targetBoardId) {
            setShowCompleted(false);
            setSelectedBoardId(targetBoardId);
            handleOpenTask(targetTask.listId, targetTask);
            history.replace("/crm/tasks");
            return;
        }

        const completedTask = completedTasks.find((task) => task.id === numericTaskId);
        if (completedTask) {
            setShowCompleted(true);
            setCompletedViewMode("list");
            handleOpenTask(completedTask.listId, completedTask);
            history.replace("/crm/tasks");
        }
    }, [location.search, boards, completedTasks, history]);

    // ── Board handlers ────────────────────────────────────────────────────
    const handleSaveBoard = async () => {
        if (!boardForm.name) return toast.error("Nome é obrigatório");
        try {
            await api.post("/tasks", boardForm);
            toast.success("Quadro criado!");
            setOpenModalBoard(false);
            setBoardForm({ name: "", description: "" });
            fetchBoards();
        } catch {
            toast.error("Erro ao salvar quadro");
        }
    };

    const handleDeleteBoard = async () => {
        if (!selectedBoardId) return;
        if (!window.confirm("Deseja excluir o quadro atual e todo seu conteúdo?")) return;
        try {
            await api.delete(`/tasks/${selectedBoardId}`);
            toast.success("Quadro excluído");
            setSelectedBoardId("");
            setBoardData(null);
            fetchBoards();
        } catch {
            toast.error("Erro ao excluir quadro");
        }
    };

    // ── Column handlers ───────────────────────────────────────────────────
    const handleSaveList = async () => {
        if (!listForm.name) return;
        try {
            // BUG FIX: always append at the end with the correct sequential order index
            const nextOrder = boardData?.lists?.length ?? 0;
            await api.post("/tasks/list", {
                ...listForm,
                boardId: selectedBoardId,
                order: nextOrder,
            });
            toast.success("Coluna criada!");
            setOpenListModal(false);
            setListForm({ name: "", color: "#ebecf0" });
            fetchBoards();
        } catch {
            toast.error("Erro ao salvar coluna");
        }
    };

    const handleDeleteList = async (id) => {
        if (!window.confirm("Remover esta coluna e todas as tarefas?")) return;
        try {
            await api.delete(`/tasks/list/${id}`);
            fetchBoards();
        } catch {
            toast.error("Erro ao remover coluna");
        }
    };

    // ── Task handlers ─────────────────────────────────────────────────────
    const handleOpenTask = (listId, task = null) => {
        if (task) {
            setTaskForm({
                id:            task.id,
                listId:        task.listId,
                title:         task.title,
                description:   task.description || "",
                priority:      task.priority || "Média",
                dueDate:       task.dueDate ? task.dueDate.slice(0, 10) : "",
                tags:          task.tags || [],
                url:           task.url || "",
                color:         task.color || "#ffffff",
                responsibleId: task.responsible?.id || task.responsibleId || "",
                status:        task.status || "active",
                completedAt:   task.completedAt || "",
                completedByUser: task.completedByUser || null,
            });
        } else {
            setTaskForm({
                id: null, listId, title: "", description: "",
                priority: "Média", dueDate: "", tags: [], url: "",
                color: "#ffffff", responsibleId: "", status: "active",
                completedAt: "", completedByUser: null,
            });
        }
        setOpenTaskModal(true);
    };

    const handleSaveTask = async () => {
        if (!taskForm.title) return toast.error("Título é obrigatório");
        try {
            const payload = { ...taskForm, responsibleId: taskForm.responsibleId || null };
            if (taskForm.id) {
                await api.put(`/tasks/item/${taskForm.id}`, payload);
                toast.success("Tarefa atualizada");
            } else {
                await api.post("/tasks/item", payload);
                toast.success("Tarefa criada");
            }
            setOpenTaskModal(false);
            fetchBoards();
            fetchCompletedTasks();
        } catch {
            toast.error("Erro ao salvar tarefa");
        }
    };

    const handleDeleteTask = async () => {
        if (!window.confirm("Remover esta tarefa?")) return;
        try {
            await api.delete(`/tasks/item/${taskForm.id}`);
            toast.success("Tarefa removida");
            setOpenTaskModal(false);
            fetchBoards();
            fetchCompletedTasks();
        } catch {
            toast.error("Erro ao remover tarefa");
        }
    };

    const handleCompleteTask = async (taskId) => {
        try {
            await api.put(`/tasks/item/${taskId}/complete`);
            toast.success("Tarefa concluida");
            setOpenTaskModal(false);
            setShowCompleted(true);
            fetchBoards();
            fetchCompletedTasks();
        } catch {
            toast.error("Erro ao concluir tarefa");
        }
    };

    const handleReopenTask = async (taskId) => {
        try {
            await api.put(`/tasks/item/${taskId}/reopen`);
            toast.success("Tarefa reaberta");
            setOpenTaskModal(false);
            setShowCompleted(false);
            fetchBoards();
            fetchCompletedTasks();
        } catch {
            toast.error("Erro ao reabrir tarefa");
        }
    };

    // ── Drag & Drop ───────────────────────────────────────────────────────
    const onDragEnd = async (result) => {
        const { source, destination, type } = result;
        if (!destination) return;
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) return;

        // ── Column reorder ─────────────────────────────────────────────────
        if (type === "COLUMN") {
            const newLists = Array.from(boardData.lists);
            const [removed] = newLists.splice(source.index, 1);
            newLists.splice(destination.index, 0, removed);

            // Optimistic update
            setBoards((prev) =>
                prev.map((b) =>
                    b.id === selectedBoardId ? { ...b, lists: newLists } : b
                )
            );

            // BUG FIX: update ALL lists with sequential order values so the
            // order field is fully deterministic — no more tie-at-zero instability
            try {
                await Promise.all(
                    newLists.map((list, idx) =>
                        api.put(`/tasks/list/${list.id}`, { order: idx })
                    )
                );
            } catch {
                toast.error("Erro ao reordenar colunas");
                fetchBoards();
            }
            return;
        }

        // ── Task move ──────────────────────────────────────────────────────
        const newBoards = [...boards];
        const boardIdx  = newBoards.findIndex((b) => b.id === selectedBoardId);
        const srcIdx    = newBoards[boardIdx].lists.findIndex(
            (l) => l.id.toString() === source.droppableId
        );
        const dstIdx    = newBoards[boardIdx].lists.findIndex(
            (l) => l.id.toString() === destination.droppableId
        );
        const task      = newBoards[boardIdx].lists[srcIdx].tasks[source.index];

        newBoards[boardIdx].lists[srcIdx].tasks.splice(source.index, 1);
        const movedTask = { ...task, listId: parseInt(destination.droppableId) };
        newBoards[boardIdx].lists[dstIdx].tasks.splice(destination.index, 0, movedTask);
        setBoards(newBoards);

        try {
            await api.put(`/tasks/item/${task.id}`, {
                listId: destination.droppableId,
                order:  destination.index,
            });
        } catch {
            toast.error("Erro ao mover tarefa");
            fetchBoards();
        }
    };

    // ── Card renderer ─────────────────────────────────────────────────────
    const renderCard = (task, provided, snapshot) => {
        const due   = formatDueDate(task.dueDate);
        const pConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG["Média"];
        const hasBg = task.color && task.color !== "#ffffff";

        return (
            <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={classes.taskCard}
                onClick={() => handleOpenTask(task.listId, task)}
                style={{
                    ...provided.draggableProps.style,
                    backgroundColor: hasBg ? task.color : undefined,
                    transform: snapshot.isDragging
                        ? `${provided.draggableProps.style?.transform} scale(1.02)`
                        : provided.draggableProps.style?.transform,
                    zIndex:  snapshot.isDragging ? 999 : "auto",
                    opacity: snapshot.isDragging ? 0.92 : 1,
                }}
            >
                <Typography
                    className={classes.cardTitle}
                    style={{ color: hasBg ? "#000" : undefined }}
                >
                    {task.title}
                </Typography>

                <div className={classes.cardMeta}>
                    <span
                        className={classes.priorityBadge}
                        style={{ backgroundColor: pConf.bg, color: pConf.color }}
                    >
                        {task.priority || "Média"}
                    </span>

                    {due && (
                        <span
                            className={classes.dueDateChip}
                            style={{
                                backgroundColor: due.overdue ? "#ffebee" : due.today ? "#fff8e1" : "#e8f5e9",
                                color:           due.overdue ? "#c62828" : due.today ? "#e65100" : "#2e7d32",
                            }}
                        >
                            {due.overdue ? "⚠ " : due.today ? "• " : ""}
                            {due.label}
                        </span>
                    )}

                    {task.responsible && (
                        <Tooltip title={task.responsible.name} placement="top">
                            <Avatar className={classes.responsibleAvatar}>
                                {getInitials(task.responsible.name)}
                            </Avatar>
                        </Tooltip>
                    )}
                </div>

                {task.url && (
                    <a
                        href={task.url.startsWith("http") ? task.url : `https://${task.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={classes.cardLink}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <LinkIcon style={{ fontSize: 13 }} /> Acessar Link
                    </a>
                )}
            </div>
        );
    };

    // ── Column renderer ───────────────────────────────────────────────────
    const renderColumn = (list, index) => {
        const taskCount = list.tasks?.length || 0;
        const isDark    = list.color && list.color !== "#ebecf0";
        const textColor = isDark ? "#fff" : undefined;
        const iconSx    = isDark ? { color: "#fff" } : {};

        return (
            <Draggable
                key={`list-${list.id}`}
                draggableId={`list-${list.id}`}
                index={index}
            >
                {(provided) => (
                    <div
                        className={classes.column}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                            ...provided.draggableProps.style,
                            backgroundColor: list.color || undefined,
                        }}
                    >
                        {/* Header — drag handle */}
                        <div className={classes.columnHeader} {...provided.dragHandleProps}>
                            <DragIndicator
                                style={{
                                    fontSize: 16,
                                    color:    isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.2)",
                                    marginRight: 2,
                                    flexShrink: 0,
                                }}
                            />
                            <Typography
                                className={classes.columnTitle}
                                style={{ color: textColor }}
                            >
                                {list.name}
                            </Typography>
                            <span
                                className={classes.countBadge}
                                style={{
                                    color:           textColor,
                                    backgroundColor: isDark
                                        ? "rgba(255,255,255,0.2)"
                                        : "rgba(0,0,0,0.1)",
                                }}
                            >
                                {taskCount}
                            </span>
                            <div className={classes.columnActions}>
                                <Tooltip title="Nova tarefa">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleOpenTask(list.id)}
                                    >
                                        <Add fontSize="small" style={iconSx} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Excluir coluna">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDeleteList(list.id)}
                                    >
                                        <Delete fontSize="small" style={iconSx} />
                                    </IconButton>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Tasks */}
                        <Droppable droppableId={list.id.toString()}>
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={classes.taskList}
                                    style={{
                                        backgroundColor: snapshot.isDraggingOver
                                            ? "rgba(0,0,0,0.04)"
                                            : "transparent",
                                    }}
                                >
                                    {taskCount === 0 && (
                                        <div className={classes.emptyColumn}>
                                            Sem tarefas
                                        </div>
                                    )}
                                    {list.tasks?.map((task, taskIndex) => (
                                        <Draggable
                                            key={task.id.toString()}
                                            draggableId={task.id.toString()}
                                            index={taskIndex}
                                        >
                                            {(provided, snapshot) =>
                                                renderCard(task, provided, snapshot)
                                            }
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>

                        {/* Quick-add button */}
                        <div style={{ padding: "4px 8px 8px" }}>
                            <Button
                                className={classes.addCardBtn}
                                size="small"
                                startIcon={
                                    <Add
                                        fontSize="small"
                                        style={{ color: isDark ? "rgba(255,255,255,0.65)" : undefined }}
                                    />
                                }
                                style={{ color: isDark ? "rgba(255,255,255,0.65)" : undefined }}
                                onClick={() => handleOpenTask(list.id)}
                            >
                                Adicionar tarefa
                            </Button>
                        </div>
                    </div>
                )}
            </Draggable>
        );
    };

    const completedByBoard = completedTasks.reduce((acc, task) => {
        const board = task.list?.board;
        const boardKey = board?.id || "without-board";
        if (!acc[boardKey]) {
            acc[boardKey] = {
                id: boardKey,
                name: board?.name || "Sem quadro",
                color: board?.color || "#ebecf0",
                tasks: [],
            };
        }
        acc[boardKey].tasks.push(task);
        return acc;
    }, {});

    const renderCompletedCard = (task) => {
        const due = formatDueDate(task.dueDate);
        const pConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG["MÃ©dia"];
        const completedAtLabel = task.completedAt ? format(parseISO(task.completedAt), "dd/MM/yyyy HH:mm") : null;

        return (
            <div
                key={`completed-${task.id}`}
                className={classes.taskCard}
                onClick={() => handleOpenTask(task.listId, task)}
                style={{
                    backgroundColor: task.color && task.color !== "#ffffff" ? task.color : "#fff",
                    borderLeft: "4px solid #10b981",
                }}
            >
                <Typography className={classes.cardTitle}>
                    {task.title}
                </Typography>

                <div className={classes.cardMeta}>
                    <span
                        className={classes.priorityBadge}
                        style={{ backgroundColor: pConf.bg, color: pConf.color }}
                    >
                        {task.priority || "MÃ©dia"}
                    </span>
                    <Chip
                        label="Concluida"
                        size="small"
                        style={{ backgroundColor: "#dcfce7", color: "#166534", fontSize: 11, height: 20 }}
                    />
                    {task.list && (
                        <Chip
                            label={`${task.list.board?.name || "Sem quadro"} › ${task.list.name}`}
                            size="small"
                            style={{ backgroundColor: "#eef2ff", color: "#4338ca", fontSize: 11, height: 20 }}
                        />
                    )}
                    {due && (
                        <span
                            className={classes.dueDateChip}
                            style={{ backgroundColor: "#f5f5f5", color: due.color }}
                        >
                            {due.label}
                        </span>
                    )}
                </div>

                {completedAtLabel && (
                    <Typography variant="caption" style={{ display: "block", marginTop: 8, color: "#4b5563" }}>
                        Concluida em {completedAtLabel}
                    </Typography>
                )}
            </div>
        );
    };

    const renderCompletedKanban = () => (
        <div className={classes.boardCanvas}>
            {Object.values(completedByBoard).length === 0 ? (
                <div className={classes.emptyBoard}>
                    <Typography variant="body1" style={{ opacity: 0.45 }}>
                        Nenhuma tarefa concluida encontrada
                    </Typography>
                </div>
            ) : (
                Object.values(completedByBoard).map((group) => (
                    <div
                        key={`completed-board-${group.id}`}
                        className={classes.column}
                        style={{ backgroundColor: group.color || undefined }}
                    >
                        <div className={classes.columnHeader}>
                            <Typography className={classes.columnTitle}>
                                {group.name}
                            </Typography>
                            <span className={classes.countBadge} style={{ backgroundColor: "rgba(0,0,0,0.1)" }}>
                                {group.tasks.length}
                            </span>
                        </div>
                        <div className={classes.taskList}>
                            {group.tasks.map((task) => renderCompletedCard(task))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderCompletedList = () => (
        <div className={classes.boardCanvas} style={{ display: "block", overflowY: "auto" }}>
            {completedTasks.length === 0 ? (
                <div className={classes.emptyBoard}>
                    <Typography variant="body1" style={{ opacity: 0.45 }}>
                        Nenhuma tarefa concluida encontrada
                    </Typography>
                </div>
            ) : (
                completedTasks.map((task) => renderCompletedCard(task))
            )}
        </div>
    );

    // ── Main render ───────────────────────────────────────────────────────
    return (
        <MainContainer>
            <div className={classes.root}>
                <ContextPageHeader
                    title="Tarefas"
                    subtitle="Gestão de quadros e atividades do CRM"
                    fallbackTo="/kanban"
                />
                <MainHeader>
                    <Title>TaskBoard (Kanban)</Title>
                </MainHeader>

                {/* Toolbar */}
                <div className={classes.boardBar}>
                    {!showCompleted && (
                        <FormControl
                            variant="outlined"
                            size="small"
                            className={classes.boardSelect}
                        >
                            <InputLabel>Selecionar Quadro</InputLabel>
                            <Select
                                value={selectedBoardId}
                                onChange={(e) => setSelectedBoardId(e.target.value)}
                                label="Selecionar Quadro"
                            >
                                {boards.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>
                                        {b.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {!showCompleted && selectedBoardId && (
                        <>
                            <Button
                                size="small"
                                startIcon={<Add />}
                                variant="outlined"
                                onClick={() => setOpenListModal(true)}
                            >
                                Nova Coluna
                            </Button>
                            <Tooltip title="Excluir quadro">
                                <IconButton size="small" onClick={handleDeleteBoard}>
                                    <Delete fontSize="small" color="error" />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}

                    <Button
                        size="small"
                        variant={showCompleted ? "contained" : "outlined"}
                        color="secondary"
                        onClick={() => setShowCompleted((prev) => !prev)}
                    >
                        {showCompleted ? "Voltar para Ativas" : "Tarefas Concluidas"}
                    </Button>

                    {showCompleted && (
                        <>
                            <Button
                                size="small"
                                variant={completedViewMode === "kanban" ? "contained" : "outlined"}
                                onClick={() => setCompletedViewMode("kanban")}
                            >
                                Kanban
                            </Button>
                            <Button
                                size="small"
                                variant={completedViewMode === "list" ? "contained" : "outlined"}
                                onClick={() => setCompletedViewMode("list")}
                            >
                                Lista
                            </Button>
                        </>
                    )}

                    <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => setOpenModalBoard(true)}
                    >
                        Criar Quadro
                    </Button>
                </div>

                {/* Canvas */}
                {showCompleted ? (
                    completedLoading ? (
                        <div className={classes.loadingOverlay}>
                            <CircularProgress />
                        </div>
                    ) : completedViewMode === "kanban" ? renderCompletedKanban() : renderCompletedList()
                ) : loading ? (
                    <div className={classes.loadingOverlay}>
                        <CircularProgress />
                    </div>
                ) : boards.length === 0 ? (
                    <div className={classes.noBoardsState}>
                        <Typography variant="h6" style={{ opacity: 0.45 }}>
                            Nenhum quadro criado
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Add />}
                            onClick={() => setOpenModalBoard(true)}
                        >
                            Criar primeiro quadro
                        </Button>
                    </div>
                ) : boardData ? (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable
                            droppableId="board"
                            type="COLUMN"
                            direction="horizontal"
                        >
                            {(provided) => (
                                <div
                                    className={classes.boardCanvas}
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                >
                                    {boardData.lists?.length === 0 && (
                                        <div className={classes.emptyBoard}>
                                            <Typography
                                                variant="body1"
                                                style={{ opacity: 0.45 }}
                                            >
                                                Nenhuma coluna neste quadro
                                            </Typography>
                                            <Button
                                                variant="outlined"
                                                startIcon={<Add />}
                                                onClick={() => setOpenListModal(true)}
                                            >
                                                Adicionar coluna
                                            </Button>
                                        </div>
                                    )}
                                    {boardData.lists?.map((list, index) =>
                                        renderColumn(list, index)
                                    )}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                ) : null}
            </div>

            {/* ── Board dialog ──────────────────────────────────────────────── */}
            <Dialog
                open={openModalBoard}
                onClose={() => setOpenModalBoard(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Novo Quadro</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nome do Quadro"
                        fullWidth
                        variant="outlined"
                        value={boardForm.name}
                        onChange={(e) =>
                            setBoardForm({ ...boardForm, name: e.target.value })
                        }
                    />
                    <TextField
                        margin="dense"
                        label="Descrição (opcional)"
                        fullWidth
                        variant="outlined"
                        value={boardForm.description}
                        onChange={(e) =>
                            setBoardForm({ ...boardForm, description: e.target.value })
                        }
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenModalBoard(false)}>Cancelar</Button>
                    <Button
                        onClick={handleSaveBoard}
                        color="primary"
                        variant="contained"
                    >
                        Criar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Column dialog ─────────────────────────────────────────────── */}
            <Dialog
                open={openListModal}
                onClose={() => setOpenListModal(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Nova Coluna</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nome da Coluna"
                        fullWidth
                        variant="outlined"
                        value={listForm.name}
                        onChange={(e) =>
                            setListForm({ ...listForm, name: e.target.value })
                        }
                    />
                    <div style={{ marginTop: 16 }}>
                        <Typography variant="caption" color="textSecondary">
                            Cor de fundo da coluna
                        </Typography>
                        <input
                            type="color"
                            style={{
                                width: "100%", height: 38,
                                border: "1px solid #ccc", borderRadius: 6,
                                marginTop: 4, padding: 2, cursor: "pointer",
                                display: "block",
                            }}
                            value={listForm.color}
                            onChange={(e) =>
                                setListForm({ ...listForm, color: e.target.value })
                            }
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenListModal(false)}>Cancelar</Button>
                    <Button
                        onClick={handleSaveList}
                        color="primary"
                        variant="contained"
                    >
                        Criar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Task dialog ───────────────────────────────────────────────── */}
            <Dialog
                open={openTaskModal}
                onClose={() => setOpenTaskModal(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    {taskForm.id ? "Editar Tarefa" : "Nova Tarefa"}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Título"
                        fullWidth
                        variant="outlined"
                        value={taskForm.title}
                        onChange={(e) =>
                            setTaskForm({ ...taskForm, title: e.target.value })
                        }
                    />
                    <TextField
                        margin="dense"
                        label="Descrição"
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        value={taskForm.description}
                        onChange={(e) =>
                            setTaskForm({ ...taskForm, description: e.target.value })
                        }
                    />

                    {taskForm.id && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                            <Chip
                                label={taskForm.status === "completed" ? "Concluida" : "Ativa"}
                                size="small"
                                style={{
                                    backgroundColor: taskForm.status === "completed" ? "#dcfce7" : "#dbeafe",
                                    color: taskForm.status === "completed" ? "#166534" : "#1d4ed8",
                                }}
                            />
                            {taskForm.completedAt && (
                                <Chip
                                    label={`Finalizada em ${format(parseISO(taskForm.completedAt), "dd/MM/yyyy HH:mm")}`}
                                    size="small"
                                    style={{ backgroundColor: "#f3f4f6", color: "#374151" }}
                                />
                            )}
                            {taskForm.completedByUser?.name && (
                                <Chip
                                    label={`Por ${taskForm.completedByUser.name}`}
                                    size="small"
                                    style={{ backgroundColor: "#f3f4f6", color: "#374151" }}
                                />
                            )}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                        <FormControl variant="outlined" margin="dense" style={{ flex: 1 }}>
                            <InputLabel>Prioridade</InputLabel>
                            <Select
                                value={taskForm.priority}
                                onChange={(e) =>
                                    setTaskForm({ ...taskForm, priority: e.target.value })
                                }
                                label="Prioridade"
                            >
                                {Object.keys(PRIORITY_CONFIG).map((p) => (
                                    <MenuItem key={p} value={p}>{p}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl variant="outlined" margin="dense" style={{ flex: 1 }}>
                            <InputLabel>Responsável</InputLabel>
                            <Select
                                value={taskForm.responsibleId}
                                onChange={(e) =>
                                    setTaskForm({ ...taskForm, responsibleId: e.target.value })
                                }
                                label="Responsável"
                            >
                                <MenuItem value=""><em>Nenhum</em></MenuItem>
                                {users.map((u) => (
                                    <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>

                    <TextField
                        margin="dense"
                        label="Link Adicional (URL)"
                        fullWidth
                        variant="outlined"
                        value={taskForm.url}
                        onChange={(e) =>
                            setTaskForm({ ...taskForm, url: e.target.value })
                        }
                        placeholder="https://exemplo.com"
                    />

                    <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                        <TextField
                            margin="dense"
                            label="Data de Vencimento"
                            type="date"
                            style={{ flex: 1 }}
                            variant="outlined"
                            InputLabelProps={{ shrink: true }}
                            value={taskForm.dueDate}
                            onChange={(e) =>
                                setTaskForm({ ...taskForm, dueDate: e.target.value })
                            }
                        />
                        <div style={{ flex: 1, marginTop: 8 }}>
                            <Typography variant="caption" color="textSecondary" style={{ marginLeft: 4 }}>
                                Cor de fundo do card
                            </Typography>
                            <input
                                type="color"
                                style={{
                                    width: "100%", height: 38,
                                    border: "1px solid #ccc", borderRadius: 6,
                                    marginTop: 4, padding: 2, cursor: "pointer",
                                    display: "block",
                                }}
                                value={taskForm.color}
                                onChange={(e) =>
                                    setTaskForm({ ...taskForm, color: e.target.value })
                                }
                            />
                        </div>
                    </div>
                </DialogContent>

                <DialogActions style={{ padding: "8px 16px 12px" }}>
                    {taskForm.id && (
                        <Button
                            onClick={handleDeleteTask}
                            style={{ color: "#d32f2f" }}
                        >
                            Excluir
                        </Button>
                    )}
                    <div style={{ flex: 1 }} />
                    {taskForm.id && taskForm.status !== "completed" && (
                        <Button
                            onClick={() => handleCompleteTask(taskForm.id)}
                            style={{ color: "#166534" }}
                        >
                            Concluir
                        </Button>
                    )}
                    {taskForm.id && taskForm.status === "completed" && (
                        <Button
                            onClick={() => handleReopenTask(taskForm.id)}
                            style={{ color: "#1d4ed8" }}
                        >
                            Reabrir
                        </Button>
                    )}
                    <Button onClick={() => setOpenTaskModal(false)}>Cancelar</Button>
                    <Button
                        onClick={handleSaveTask}
                        color="primary"
                        variant="contained"
                    >
                        Salvar
                    </Button>
                </DialogActions>
            </Dialog>
        </MainContainer>
    );
};

export default Tasks;
