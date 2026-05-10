import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@material-ui/core";
import { toast } from "react-toastify";
import api from "../../services/api";

const PRIORITIES = ["Baixa", "Média", "Alta", "Urgente"];

const EMPTY_FORM = {
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

const getTicketLeadId = (ticket) =>
  ticket?.crmLeadId || ticket?.crmLead?.id || ticket?.leadId || null;

const buildDefaultDescription = (ticket) => {
  const contact = ticket?.contact || {};
  return [
    contact.name && `Lead: ${contact.name}`,
    contact.number && `Telefone: ${contact.number}`,
  ].filter(Boolean).join("\n");
};

const LeadTaskCreateModal = ({ open, onClose, ticket, ticketId, onCreated }) => {
  const [resolvedTicket, setResolvedTicket] = useState(ticket || null);
  const [boards, setBoards] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const leadId = getTicketLeadId(resolvedTicket);
  const selectedBoard = boards.find((board) => String(board.id) === String(form.boardId));
  const lists = selectedBoard?.lists || [];

  const contactLabel = useMemo(() => {
    const contact = resolvedTicket?.contact || ticket?.contact || {};
    return contact.name || contact.number || "lead";
  }, [resolvedTicket, ticket]);

  useEffect(() => {
    if (!open) return;
    let isActive = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const requests = [
          api.get("/tasks"),
          api.get("/users", { params: { limit: 200, pageSize: 200 } }),
        ];

        if (ticketId) {
          requests.push(api.get(`/tickets/${ticketId}`));
        }

        const [boardsRes, usersRes, ticketRes] = await Promise.all(requests);
        if (!isActive) return;

        const nextTicket = ticketRes?.data || ticket || null;
        setResolvedTicket(nextTicket);
        setBoards(boardsRes.data || []);
        setUsers(usersRes.data?.users || usersRes.data || []);

        const firstBoard = (boardsRes.data || [])[0];
        const firstList = firstBoard?.lists?.[0];
        setForm({
          ...EMPTY_FORM,
          boardId: firstBoard?.id || "",
          listId: firstList?.id || "",
          description: buildDefaultDescription(nextTicket),
        });
      } catch (err) {
        toast.error("Erro ao carregar dados para criar tarefa.");
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadData();
    return () => {
      isActive = false;
    };
  }, [open, ticketId, ticket]);

  const handleBoardChange = (event) => {
    const boardId = event.target.value;
    const board = boards.find((item) => String(item.id) === String(boardId));
    setForm({
      ...form,
      boardId,
      listId: board?.lists?.[0]?.id || "",
    });
  };

  const handleSave = async () => {
    if (!leadId) {
      toast.error("Este atendimento ainda nao possui lead vinculado.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Titulo e obrigatorio.");
      return;
    }
    if (!form.listId) {
      toast.error("Selecione um quadro e uma coluna.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/tasks/item", {
        listId: form.listId,
        title: form.title.trim(),
        description: form.description,
        priority: form.priority,
        responsibleId: form.responsibleId || null,
        url: form.url,
        dueDate: form.dueDate || null,
        color: form.color,
        leadId,
      });
      toast.success("Tarefa criada para este lead.");
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      toast.error("Erro ao criar tarefa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Adicionar tarefa</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
              Lead: {contactLabel}
            </Typography>

            {!leadId && (
              <Box mb={2} p={1.5} style={{ background: "#fff8e1", borderRadius: 6 }}>
                <Typography variant="body2" style={{ color: "#8a5a00" }}>
                  Nao encontrei um lead vinculado a este atendimento. Mova o contato para o Kanban primeiro.
                </Typography>
              </Box>
            )}

            <Box display="flex" style={{ gap: 12 }}>
              <FormControl variant="outlined" margin="dense" style={{ flex: 1 }}>
                <InputLabel>Quadro</InputLabel>
                <Select value={form.boardId} onChange={handleBoardChange} label="Quadro">
                  {boards.map((board) => (
                    <MenuItem key={board.id} value={board.id}>{board.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl variant="outlined" margin="dense" style={{ flex: 1 }} disabled={!form.boardId}>
                <InputLabel>Coluna</InputLabel>
                <Select
                  value={form.listId}
                  onChange={(event) => setForm({ ...form, listId: event.target.value })}
                  label="Coluna"
                >
                  {lists.map((list) => (
                    <MenuItem key={list.id} value={list.id}>{list.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <TextField
              autoFocus
              margin="dense"
              label="Titulo"
              fullWidth
              variant="outlined"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <TextField
              margin="dense"
              label="Descricao"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />

            <Box display="flex" style={{ gap: 12 }}>
              <FormControl variant="outlined" margin="dense" style={{ flex: 1 }}>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                  label="Prioridade"
                >
                  {PRIORITIES.map((priority) => (
                    <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl variant="outlined" margin="dense" style={{ flex: 1 }}>
                <InputLabel>Responsavel</InputLabel>
                <Select
                  value={form.responsibleId}
                  onChange={(event) => setForm({ ...form, responsibleId: event.target.value })}
                  label="Responsavel"
                >
                  <MenuItem value=""><em>Nenhum</em></MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box display="flex" style={{ gap: 12 }}>
              <TextField
                margin="dense"
                label="Data de vencimento"
                type="date"
                variant="outlined"
                style={{ flex: 1 }}
                InputLabelProps={{ shrink: true }}
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
              <Box style={{ flex: 1, marginTop: 8 }}>
                <Typography variant="caption" color="textSecondary">Cor do card</Typography>
                <input
                  type="color"
                  value={form.color}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                  style={{
                    width: "100%",
                    height: 38,
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    marginTop: 4,
                    padding: 2,
                    cursor: "pointer",
                    display: "block",
                  }}
                />
              </Box>
            </Box>

            <TextField
              margin="dense"
              label="Link adicional"
              fullWidth
              variant="outlined"
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
              placeholder="https://exemplo.com"
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={loading || saving || !leadId}
        >
          {saving ? <CircularProgress size={18} /> : "Criar tarefa"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeadTaskCreateModal;
