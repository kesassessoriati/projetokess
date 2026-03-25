import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Chip,
    CircularProgress,
    Tooltip,
    Link,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import CheckBoxOutlineBlankIcon from "@material-ui/icons/CheckBoxOutlineBlank";
import { toast } from "react-toastify";
import { format, parseISO, isPast, isToday } from "date-fns";
import api from "../../services/api";

const PRIORITY_CONFIG = {
    Baixa:   { bg: "#e3f2fd", color: "#1565c0" },
    Média:   { bg: "#fff8e1", color: "#e65100" },
    Alta:    { bg: "#fbe9e7", color: "#bf360c" },
    Urgente: { bg: "#ffebee", color: "#b71c1c" },
};

const EMPTY_FORM = {
    id: null,
    boardId: "",
    listId: "",
    title: "",
    description: "",
    priority: "Média",
    responsibleId: "",
    url: "",
    dueDate: "",
    color: "#ffffff",
};

const LeadTasksTab = ({ leadId, op }) => {
    const resolvedLeadId = leadId || (op && op.leadId) || null;

    const [tasks, setTasks] = useState([]);
    const [boards, setBoards] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // Lists from the selected board
    const selectedBoard = boards.find(b => b.id === form.boardId);
    const lists = selectedBoard ? (selectedBoard.lists || []) : [];

    const fetchTasks = useCallback(async () => {
        if (!resolvedLeadId) return;
        try {
            setLoading(true);
            const { data } = await api.get(`/tasks/lead/${resolvedLeadId}`);
            setTasks(data);
        } catch (err) {
            toast.error("Erro ao carregar tarefas do lead");
        } finally {
            setLoading(false);
        }
    }, [resolvedLeadId]);

    const fetchBoards = useCallback(async () => {
        try {
            const { data } = await api.get("/tasks");
            setBoards(data);
        } catch (err) {
            // silent
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const { data } = await api.get("/users", { params: { pageSize: 200 } });
            setUsers(data.users || data || []);
        } catch (err) {
            // silent
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    useEffect(() => {
        if (openModal && boards.length === 0) fetchBoards();
        if (openModal && users.length === 0) fetchUsers();
    }, [openModal]);

    const openCreateModal = () => {
        const leadName = (op && op.lead && op.lead.name) || (op && op.title) || "";
        const leadPhone = (op && op.lead && op.lead.phone) || (op && op.contact && op.contact.number) || "";
        const defaultDesc = [
            leadName && `Lead: ${leadName}`,
            leadPhone && `Telefone: ${leadPhone}`,
        ].filter(Boolean).join("\n");

        setForm({ ...EMPTY_FORM, description: defaultDesc });
        setOpenModal(true);
    };

    const openEditModal = (task) => {
        const boardId = task.list && task.list.board ? task.list.board.id : "";
        setForm({
            id: task.id,
            boardId,
            listId: task.listId,
            title: task.title || "",
            description: task.description || "",
            priority: task.priority || "Média",
            responsibleId: task.responsibleId || "",
            url: task.url || "",
            dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
            color: task.color || "#ffffff",
        });
        if (boards.length === 0) fetchBoards();
        if (users.length === 0) fetchUsers();
        setOpenModal(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) {
            toast.error("Título é obrigatório");
            return;
        }
        if (!form.listId) {
            toast.error("Selecione um quadro e uma coluna");
            return;
        }
        try {
            setSaving(true);
            const payload = {
                listId: form.listId,
                title: form.title,
                description: form.description,
                priority: form.priority,
                responsibleId: form.responsibleId || null,
                url: form.url,
                dueDate: form.dueDate || null,
                color: form.color,
                leadId: resolvedLeadId,
            };
            if (form.id) {
                await api.put(`/tasks/item/${form.id}`, payload);
                toast.success("Tarefa atualizada");
            } else {
                await api.post("/tasks/item", payload);
                toast.success("Tarefa criada");
            }
            setOpenModal(false);
            fetchTasks();
        } catch (err) {
            toast.error("Erro ao salvar tarefa");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (taskId) => {
        if (!window.confirm("Excluir esta tarefa?")) return;
        try {
            await api.delete(`/tasks/item/${taskId}`);
            toast.success("Tarefa removida");
            fetchTasks();
        } catch (err) {
            toast.error("Erro ao excluir tarefa");
        }
    };

    const formatDueDate = (dueDate) => {
        if (!dueDate) return null;
        try {
            const d = parseISO(dueDate);
            const label = format(d, "dd/MM/yyyy");
            if (isToday(d)) return { label, color: "#e65100" };
            if (isPast(d)) return { label, color: "#b71c1c" };
            return { label, color: "#555" };
        } catch {
            return null;
        }
    };

    return (
        <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1" style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckBoxOutlineBlankIcon fontSize="small" /> Tarefas vinculadas ao Lead
                </Typography>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    style={{ backgroundColor: "#10b981", color: "#fff", boxShadow: "none", textTransform: "none" }}
                    onClick={openCreateModal}
                    disabled={!resolvedLeadId}
                >
                    Nova Tarefa
                </Button>
            </Box>

            {!resolvedLeadId && (
                <Typography variant="body2" color="textSecondary">
                    Salve o lead primeiro para poder adicionar tarefas.
                </Typography>
            )}

            {loading ? (
                <Box display="flex" justifyContent="center" mt={3}>
                    <CircularProgress size={28} />
                </Box>
            ) : tasks.length === 0 ? (
                <Box
                    p={3}
                    style={{ border: "2px dashed #e0e0e0", borderRadius: 8, textAlign: "center" }}
                >
                    <Typography variant="body2" color="textSecondary">
                        Nenhuma tarefa vinculada a este lead ainda.
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        Crie tarefas aqui e elas aparecerão no Kanban de Tarefas.
                    </Typography>
                </Box>
            ) : (
                <Box display="flex" flexDirection="column" style={{ gap: 10 }}>
                    {tasks.map(task => {
                        const due = formatDueDate(task.dueDate);
                        const pConf = PRIORITY_CONFIG[task.priority] || {};
                        return (
                            <Box
                                key={task.id}
                                p={2}
                                style={{
                                    borderRadius: 8,
                                    border: "1px solid #e0e0e0",
                                    backgroundColor: task.color && task.color !== "#ffffff" ? task.color + "22" : "#fff",
                                    borderLeft: task.color && task.color !== "#ffffff" ? `4px solid ${task.color}` : "4px solid #e0e0e0",
                                }}
                            >
                                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                                    <Box flexGrow={1}>
                                        <Typography variant="body2" style={{ fontWeight: 600 }}>
                                            {task.title}
                                        </Typography>
                                        {task.description && (
                                            <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 2, whiteSpace: "pre-wrap" }}>
                                                {task.description}
                                            </Typography>
                                        )}
                                        <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginTop: 6 }}>
                                            {task.priority && (
                                                <Chip
                                                    label={task.priority}
                                                    size="small"
                                                    style={{ backgroundColor: pConf.bg, color: pConf.color, fontSize: 11, height: 20 }}
                                                />
                                            )}
                                            {due && (
                                                <Chip
                                                    label={due.label}
                                                    size="small"
                                                    style={{ backgroundColor: "#f5f5f5", color: due.color, fontSize: 11, height: 20 }}
                                                />
                                            )}
                                            {task.responsible && (
                                                <Chip
                                                    label={task.responsible.name}
                                                    size="small"
                                                    style={{ backgroundColor: "#e8f5e9", color: "#2e7d32", fontSize: 11, height: 20 }}
                                                />
                                            )}
                                            {task.list && task.list.board && (
                                                <Chip
                                                    label={`${task.list.board.name} › ${task.list.name}`}
                                                    size="small"
                                                    style={{ backgroundColor: "#f3e5f5", color: "#6a1b9a", fontSize: 11, height: 20 }}
                                                />
                                            )}
                                        </Box>
                                        {task.url && (
                                            <Box mt={0.5}>
                                                <Link href={task.url} target="_blank" rel="noopener" variant="caption" style={{ color: "#1976d2" }}>
                                                    <OpenInNewIcon style={{ fontSize: 12, verticalAlign: "middle", marginRight: 2 }} />
                                                    {task.url}
                                                </Link>
                                            </Box>
                                        )}
                                    </Box>
                                    <Box display="flex" ml={1}>
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => openEditModal(task)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Excluir">
                                            <IconButton size="small" onClick={() => handleDelete(task.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* Task create/edit dialog */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
                <DialogTitle>{form.id ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Título *"
                        fullWidth
                        variant="outlined"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Descrição"
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                    />

                    {/* Board / List selectors */}
                    <Box display="flex" style={{ gap: 12, marginTop: 4 }}>
                        <FormControl variant="outlined" margin="dense" style={{ flex: 1 }}>
                            <InputLabel>Quadro (Board) *</InputLabel>
                            <Select
                                value={form.boardId}
                                onChange={e => setForm({ ...form, boardId: e.target.value, listId: "" })}
                                label="Quadro (Board) *"
                            >
                                {boards.map(b => (
                                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl variant="outlined" margin="dense" style={{ flex: 1 }} disabled={!form.boardId}>
                            <InputLabel>Coluna *</InputLabel>
                            <Select
                                value={form.listId}
                                onChange={e => setForm({ ...form, listId: e.target.value })}
                                label="Coluna *"
                            >
                                {lists.map(l => (
                                    <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <Box display="flex" style={{ gap: 12, marginTop: 4 }}>
                        <FormControl variant="outlined" margin="dense" style={{ flex: 1 }}>
                            <InputLabel>Prioridade</InputLabel>
                            <Select
                                value={form.priority}
                                onChange={e => setForm({ ...form, priority: e.target.value })}
                                label="Prioridade"
                            >
                                {Object.keys(PRIORITY_CONFIG).map(p => (
                                    <MenuItem key={p} value={p}>{p}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl variant="outlined" margin="dense" style={{ flex: 1 }}>
                            <InputLabel>Responsável</InputLabel>
                            <Select
                                value={form.responsibleId}
                                onChange={e => setForm({ ...form, responsibleId: e.target.value })}
                                label="Responsável"
                            >
                                <MenuItem value=""><em>Nenhum</em></MenuItem>
                                {users.map(u => (
                                    <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <TextField
                        margin="dense"
                        label="Link Adicional (URL)"
                        fullWidth
                        variant="outlined"
                        value={form.url}
                        onChange={e => setForm({ ...form, url: e.target.value })}
                        placeholder="https://exemplo.com"
                    />

                    <Box display="flex" style={{ gap: 16, marginTop: 4 }}>
                        <TextField
                            margin="dense"
                            label="Data de Vencimento"
                            type="date"
                            style={{ flex: 1 }}
                            variant="outlined"
                            InputLabelProps={{ shrink: true }}
                            value={form.dueDate}
                            onChange={e => setForm({ ...form, dueDate: e.target.value })}
                        />
                        <Box style={{ flex: 1, marginTop: 8 }}>
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
                                value={form.color}
                                onChange={e => setForm({ ...form, color: e.target.value })}
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions style={{ padding: "8px 16px 12px" }}>
                    {form.id && (
                        <Button
                            onClick={() => { handleDelete(form.id); setOpenModal(false); }}
                            style={{ color: "#d32f2f" }}
                        >
                            Excluir
                        </Button>
                    )}
                    <Box flexGrow={1} />
                    <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
                    <Button
                        onClick={handleSave}
                        color="primary"
                        variant="contained"
                        disabled={saving}
                    >
                        {saving ? <CircularProgress size={18} /> : "Salvar"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LeadTasksTab;
