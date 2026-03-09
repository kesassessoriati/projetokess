import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { makeStyles } from "@material-ui/core/styles";
import {
    Button,
    IconButton,
    Typography,
    Paper,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Tooltip
} from "@material-ui/core";
import { Add, Delete, Edit, MoreVert, Link as LinkIcon } from "@material-ui/icons";
import api from "../../services/api";
import { toast } from "react-toastify";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import { format, parseISO } from "date-fns";
import ContextPageHeader from "../../components/ContextPageHeader";

const useStyles = makeStyles((theme) => ({
    mainContainer: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%",
        backgroundColor: theme.palette.type === "dark" ? "#1e1e1e" : "#f5f7f9",
    },
    boardSelector: {
        display: "flex",
        alignItems: "center",
        marginBottom: theme.spacing(2),
        gap: theme.spacing(2),
        padding: theme.spacing(0, 2),
    },
    boardContainer: {
        display: "flex",
        flex: 1,
        overflowX: "auto",
        overflowY: "hidden",
        padding: theme.spacing(2),
        gap: theme.spacing(2),
        "&::-webkit-scrollbar": {
            height: "8px",
        },
        "&::-webkit-scrollbar-thumb": {
            borderRadius: "8px",
            backgroundColor: theme.palette.type === "dark" ? "#555" : "#ccc",
        },
    },
    column: {
        backgroundColor: theme.palette.type === "dark" ? "#2d2d2d" : "#ebecf0",
        minWidth: "300px",
        maxWidth: "300px",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
        padding: theme.spacing(1),
    },
    columnHeader: {
        padding: theme.spacing(1),
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontWeight: "bold",
        color: theme.palette.type === "dark" ? "#fff" : "#172b4d",
    },
    taskList: {
        flex: 1,
        overflowY: "auto",
        minHeight: "100px",
        padding: theme.spacing(0.5),
        "&::-webkit-scrollbar": {
            width: "6px",
        },
        "&::-webkit-scrollbar-thumb": {
            borderRadius: "6px",
            backgroundColor: "rgba(0,0,0,0.2)",
        },
    },
    taskCard: {
        backgroundColor: theme.palette.type === "dark" ? "#383838" : "#fff",
        color: theme.palette.type === "dark" ? "#e0e0e0" : "#172b4d",
        padding: theme.spacing(1.5),
        marginBottom: theme.spacing(1),
        borderRadius: "6px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.2s, background-color 0.2s",
        "&:hover": {
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        },
    },
    cardTitle: {
        fontWeight: "600",
        fontSize: "14px",
        marginBottom: theme.spacing(0.5),
    },
    cardDate: {
        fontSize: "12px",
        color: theme.palette.type === "dark" ? "#aaa" : "#5e6c84",
    },
    cardTags: {
        display: "flex",
        gap: "4px",
        marginTop: "8px",
        flexWrap: "wrap",
    },
    tag: {
        fontSize: "11px",
        padding: "2px 6px",
        borderRadius: "12px",
        backgroundColor: "#e0e0e0",
        color: "#333",
    },
    btnDanger: {
        color: "red"
    }
}));

const Tasks = () => {
    const classes = useStyles();
    const [boards, setBoards] = useState([]);
    const [selectedBoardId, setSelectedBoardId] = useState("");
    const [boardData, setBoardData] = useState(null);

    const [openModalBoard, setOpenModalBoard] = useState(false);
    const [boardForm, setBoardForm] = useState({ name: "", description: "" });

    const [openListModal, setOpenListModal] = useState(false);
    const [listForm, setListForm] = useState({ name: "", color: "#ebecf0" });

    const [openTaskModal, setOpenTaskModal] = useState(false);
    const [taskForm, setTaskForm] = useState({ id: null, listId: "", title: "", description: "", priority: "Média", dueDate: "", tags: [], url: "", color: "#ffffff" });

    useEffect(() => {
        fetchBoards();
    }, []);

    useEffect(() => {
        if (boards.length > 0 && !selectedBoardId) {
            setSelectedBoardId(boards[0].id);
        }
    }, [boards]);

    useEffect(() => {
        if (selectedBoardId) {
            const active = boards.find((b) => b.id === selectedBoardId);
            setBoardData(active);
        }
    }, [selectedBoardId, boards]);

    const fetchBoards = async () => {
        try {
            const { data } = await api.get("/tasks");
            setBoards(data);
        } catch (err) {
            toast.error("Erro ao carregar quadros");
        }
    };

    const handleSaveBoard = async () => {
        try {
            if (!boardForm.name) return toast.error("Nome é obrigatório");
            await api.post("/tasks", boardForm);
            toast.success("Quadro criado!");
            setOpenModalBoard(false);
            fetchBoards();
            setBoardForm({ name: "", description: "" });
        } catch (err) {
            toast.error("Erro ao salvar quadro");
        }
    };

    const handleDeleteBoard = async () => {
        if (!selectedBoardId) return;
        if (window.confirm("Deseja mesmo excluir o quadro atual?")) {
            try {
                await api.delete(`/tasks/${selectedBoardId}`);
                toast.success("Quadro excluído");
                setSelectedBoardId("");
                fetchBoards();
            } catch (err) {
                toast.error("Erro ao excluir quadro");
            }
        }
    };

    const handleSaveList = async () => {
        try {
            if (!listForm.name) return;
            await api.post(`/tasks/list`, { ...listForm, boardId: selectedBoardId });
            toast.success("Coluna criada!");
            setOpenListModal(false);
            fetchBoards();
            setListForm({ name: "", color: "#ebecf0" });
        } catch (err) {
            toast.error("Erro ao salvar coluna");
        }
    };

    const handleDeleteList = async (id) => {
        if (window.confirm("Deseja remover esta coluna e todas as tarefas dela?")) {
            try {
                await api.delete(`/tasks/list/${id}`);
                fetchBoards();
            } catch (err) {
                toast.error("Erro ao remover coluna");
            }
        }
    };

    const handleOpenTask = (listId, task = null) => {
        if (task) {
            setTaskForm({
                id: task.id,
                listId: task.listId,
                title: task.title,
                description: task.description || "",
                priority: task.priority || "Média",
                dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
                tags: task.tags || [],
                url: task.url || "",
                color: task.color || "#ffffff"
            });
        } else {
            setTaskForm({ id: null, listId, title: "", description: "", priority: "Média", dueDate: "", tags: [], url: "", color: "#ffffff" });
        }
        setOpenTaskModal(true);
    };

    const handleSaveTask = async () => {
        try {
            if (!taskForm.title) return toast.error("Título é obrigatório");
            if (taskForm.id) {
                await api.put(`/tasks/item/${taskForm.id}`, taskForm);
                toast.success("Tarefa atualizada");
            } else {
                await api.post(`/tasks/item`, taskForm);
                toast.success("Tarefa criada");
            }
            setOpenTaskModal(false);
            fetchBoards();
        } catch (err) {
            toast.error("Erro ao salvar tarefa");
        }
    };

    const handleDeleteTask = async () => {
        if (window.confirm("Deseja remover esta tarefa?")) {
            try {
                await api.delete(`/tasks/item/${taskForm.id}`);
                toast.success("Tarefa removida");
                setOpenTaskModal(false);
                fetchBoards();
            } catch (err) {
                toast.error("Erro");
            }
        }
    };

    const onDragEnd = async (result) => {
        const { source, destination, type } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        if (type === "COLUMN") {
            let newBoards = [...boards];
            let boardIndex = newBoards.findIndex(b => b.id === selectedBoardId);
            const newLists = Array.from(newBoards[boardIndex].lists);
            const [reorderedList] = newLists.splice(source.index, 1);
            newLists.splice(destination.index, 0, reorderedList);
            newBoards[boardIndex].lists = newLists;
            setBoards(newBoards);

            try {
                await api.put(`/tasks/list/${reorderedList.id}`, { order: destination.index });
            } catch (err) {
                toast.error("Erro ao mover coluna");
                fetchBoards(); // rollback
            }
            return;
        }

        const sourceList = boardData.lists.find(l => l.id.toString() === source.droppableId);
        const destList = boardData.lists.find(l => l.id.toString() === destination.droppableId);

        const task = sourceList.tasks[source.index];

        // Optimistic UI update
        let newBoards = [...boards];
        let boardIndex = newBoards.findIndex(b => b.id === selectedBoardId);
        let slIndex = newBoards[boardIndex].lists.findIndex(l => l.id.toString() === source.droppableId);
        let dlIndex = newBoards[boardIndex].lists.findIndex(l => l.id.toString() === destination.droppableId);

        newBoards[boardIndex].lists[slIndex].tasks.splice(source.index, 1);

        // update task listId explicitly
        let updatedTask = { ...task, listId: parseInt(destination.droppableId) };
        newBoards[boardIndex].lists[dlIndex].tasks.splice(destination.index, 0, updatedTask);

        setBoards(newBoards);

        // Persist API
        try {
            await api.put(`/tasks/item/${task.id}`, { listId: destination.droppableId, order: destination.index });
        } catch (err) {
            toast.error("Erro ao mover");
            fetchBoards(); // rollback
        }
    };

    return (
        <MainContainer>
            <div className={classes.mainContainer}>
                <ContextPageHeader
                    title="Tarefas"
                    subtitle="Gestão de quadros e atividades do CRM"
                    fallbackTo="/kanban"
                />
                <MainHeader>
                    <Title>TaskBoard (Kanban)</Title>
                </MainHeader>

                <div className={classes.boardSelector}>
                    <FormControl variant="outlined" size="small" style={{ minWidth: 200 }}>
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
                    {selectedBoardId && (
                        <>
                            <Button size="small" startIcon={<Add />} variant="outlined" onClick={() => setOpenListModal(true)}>
                                Nova Coluna
                            </Button>
                            <IconButton size="small" color="secondary" onClick={handleDeleteBoard}>
                                <Delete />
                            </IconButton>
                        </>
                    )}
                    <Button size="small" variant="contained" color="primary" onClick={() => setOpenModalBoard(true)}>
                        Criar Quadro
                    </Button>
                </div>

                {boardData && (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="board" type="COLUMN" direction="horizontal">
                            {(provided) => (
                                <div className={classes.boardContainer} ref={provided.innerRef} {...provided.droppableProps}>
                                    {boardData.lists?.map((list, index) => (
                                        <Draggable key={`list-${list.id}`} draggableId={`list-${list.id}`} index={index}>
                                            {(provided) => (
                                                <div
                                                    className={classes.column}
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={{ ...provided.draggableProps.style, backgroundColor: list.color || undefined }}
                                                >
                                                    <div className={classes.columnHeader}>
                                                        <Typography variant="subtitle1" style={{ color: list.color && list.color !== "#ebecf0" ? "#fff" : undefined, textShadow: list.color && list.color !== "#ebecf0" ? "0 1px 2px rgba(0,0,0,0.5)" : "none" }}>{list.name}</Typography>
                                                        <div>
                                                            <IconButton size="small" onClick={() => handleOpenTask(list.id)}>
                                                                <Add fontSize="small" style={{ color: list.color && list.color !== "#ebecf0" ? "#fff" : undefined }} />
                                                            </IconButton>
                                                            <IconButton size="small" onClick={() => handleDeleteList(list.id)}>
                                                                <Delete fontSize="small" style={{ color: list.color && list.color !== "#ebecf0" ? "#fff" : undefined }} />
                                                            </IconButton>
                                                        </div>
                                                    </div>
                                                    <Droppable droppableId={list.id.toString()}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                {...provided.droppableProps}
                                                                ref={provided.innerRef}
                                                                className={classes.taskList}
                                                                style={{ backgroundColor: snapshot.isDraggingOver ? "rgba(0,0,0,0.05)" : "transparent" }}
                                                            >
                                                                {list.tasks?.map((task, taskIndex) => (
                                                                    <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={taskIndex}>
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                {...provided.dragHandleProps}
                                                                                className={classes.taskCard}
                                                                                onClick={() => handleOpenTask(list.id, task)}
                                                                                style={{
                                                                                    ...provided.draggableProps.style,
                                                                                    backgroundColor: task.color !== "#ffffff" ? task.color : undefined,
                                                                                    transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.02)` : provided.draggableProps.style?.transform,
                                                                                    zIndex: snapshot.isDragging ? 100 : "auto"
                                                                                }}
                                                                            >
                                                                                <Typography className={classes.cardTitle} style={{ color: task.color !== "#ffffff" ? "#000" : undefined }}>{task.title}</Typography>
                                                                                {task.dueDate && (
                                                                                    <Typography className={classes.cardDate} style={{ color: task.color !== "#ffffff" ? "#333" : undefined }}>
                                                                                        Vence: {format(parseISO(task.dueDate), "dd/MM/yyyy")}
                                                                                    </Typography>
                                                                                )}
                                                                                <div className={classes.cardTags}>
                                                                                    <span className={classes.tag} style={{ backgroundColor: task.priority === 'Alta' ? '#ffebee' : task.priority === 'Urgente' ? '#ffcdd2' : '#e0e0e0' }}>
                                                                                        {task.priority || "Normal"}
                                                                                    </span>
                                                                                </div>
                                                                                {task.url && (
                                                                                    <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                                                                                        <a href={task.url.startsWith('http') ? task.url : `https://${task.url}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#3b82f6', textDecoration: 'none' }}>
                                                                                            <LinkIcon fontSize="small" /> Acessar Link
                                                                                        </a>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}
            </div>

            <Dialog open={openModalBoard} onClose={() => setOpenModalBoard(false)}>
                <DialogTitle>Novo Quadro</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nome do Quadro"
                        fullWidth
                        value={boardForm.name}
                        onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Descrição"
                        fullWidth
                        value={boardForm.description}
                        onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenModalBoard(false)}>Cancelar</Button>
                    <Button onClick={handleSaveBoard} color="primary" variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openListModal} onClose={() => setOpenListModal(false)}>
                <DialogTitle>Nova Coluna</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nome da Coluna"
                        fullWidth
                        value={listForm.name}
                        onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
                    />
                    <div style={{ marginTop: 16 }}>
                        <Typography variant="caption">Cor da coluna de Fundo</Typography>
                        <input
                            type="color"
                            style={{ width: "100%", height: 38, border: "1px solid #ccc", borderRadius: 4, marginTop: 4, padding: 2, cursor: "pointer" }}
                            value={listForm.color}
                            onChange={e => setListForm({ ...listForm, color: e.target.value })}
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenListModal(false)}>Cancelar</Button>
                    <Button onClick={handleSaveList} color="primary" variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openTaskModal} onClose={() => setOpenTaskModal(false)} fullWidth maxWidth="sm">
                <DialogTitle>{taskForm.id ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Título"
                        fullWidth
                        variant="outlined"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Descrição"
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    />
                    <FormControl variant="outlined" margin="dense" fullWidth>
                        <InputLabel>Prioridade</InputLabel>
                        <Select
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                            label="Prioridade"
                        >
                            <MenuItem value="Baixa">Baixa</MenuItem>
                            <MenuItem value="Média">Média</MenuItem>
                            <MenuItem value="Alta">Alta</MenuItem>
                            <MenuItem value="Urgente">Urgente</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        margin="dense"
                        label="Link Adicional (URL)"
                        fullWidth
                        variant="outlined"
                        value={taskForm.url}
                        onChange={(e) => setTaskForm({ ...taskForm, url: e.target.value })}
                        placeholder="https://exemplo.com"
                    />
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                        <TextField
                            margin="dense"
                            label="Data de Vencimento"
                            type="date"
                            fullWidth
                            variant="outlined"
                            InputLabelProps={{ shrink: true }}
                            value={taskForm.dueDate}
                            onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                        />
                        <div style={{ flex: 1, marginTop: 8 }}>
                            <Typography variant="caption" style={{ marginLeft: 4 }}>Cor de Fundo do Card</Typography>
                            <input
                                type="color"
                                style={{ width: "100%", height: 38, border: "1px solid #ccc", borderRadius: 4, marginTop: 4, padding: 2, cursor: "pointer" }}
                                value={taskForm.color}
                                onChange={e => setTaskForm({ ...taskForm, color: e.target.value })}
                            />
                        </div>
                    </div>
                </DialogContent>
                <DialogActions>
                    {taskForm.id && (
                        <Button onClick={handleDeleteTask} className={classes.btnDanger}>Excluir</Button>
                    )}
                    <div style={{ flex: 1 }}></div>
                    <Button onClick={() => setOpenTaskModal(false)}>Cancelar</Button>
                    <Button onClick={handleSaveTask} color="primary" variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>
        </MainContainer>
    );
};

export default Tasks;
