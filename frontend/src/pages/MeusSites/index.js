import React, { useCallback, useMemo, useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import {
  makeStyles,
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip,
  Checkbox,
  FormControlLabel
} from "@material-ui/core";
import { Add, Edit, Delete, OpenInNew, Send, AttachFile } from "@material-ui/icons";
import api from "../../services/api";
import { toast } from "react-toastify";
import MainContainer from "../../components/MainContainer";
import ContextPageHeader from "../../components/ContextPageHeader";

const useStyles = makeStyles(theme => ({
  root: {
    height: "calc(100vh - 48px)",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(180deg, #f0f8f3 0%, #e8f2ea 100%)"
  },
  shell: {
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    height: "100%"
  },
  topCard: {
    borderRadius: 14,
    border: "1px solid #cfe4d7",
    background: "#ffffffdd",
    padding: 12
  },
  controls: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "1.4fr 220px 220px 170px auto",
    gap: 8,
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "1fr 1fr"
    }
  },
  tagsRow: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  boardArea: {
    flex: 1,
    overflow: "auto",
    ...theme.scrollbarStyles
  },
  boardRow: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    paddingBottom: 14
  },
  column: {
    minWidth: 290,
    maxWidth: 290,
    borderRadius: 12,
    border: "1px solid #d9eadf",
    background: "#f8fcf9",
    display: "flex",
    flexDirection: "column"
  },
  columnHead: {
    padding: "10px 10px",
    borderBottom: "1px solid #e9edf2",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  columnBody: {
    padding: 8,
    minHeight: 80,
    maxHeight: "66vh",
    overflowY: "auto"
  },
  addCardBtn: {
    textTransform: "none",
    borderRadius: 8,
    justifyContent: "flex-start",
    marginTop: 8
  },
  card: {
    border: "1px solid #d7e8dc",
    borderRadius: 10,
    background: "#f7fff9",
    padding: 9,
    marginBottom: 8,
    cursor: "pointer"
  },
  link: {
    color: "#1b9a59",
    fontSize: ".75rem",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 4
  },
  modalTabs: {
    "& .MuiTabs-indicator": { display: "none" }
  },
  modalTab: {
    textTransform: "none",
    border: "1px solid #dee4eb",
    borderRadius: 9,
    marginRight: 6,
    minHeight: 36,
    minWidth: 120,
    "&.Mui-selected": {
      backgroundColor: "#f2f6fb"
    }
  },
  section: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr"
    }
  },
  full: { gridColumn: "1 / -1" }
}));

const emptyCard = {
  id: null,
  columnId: "",
  title: "",
  description: "",
  url: "",
  responsible: "",
  priority: "Media",
  dueDate: "",
  tagsInput: "",
  notes: "",
  color: "#fff7e8",
  checklistItems: [],
  comments: [],
  attachments: []
};

const safeUrl = url => {
  if (!url) return "";
  const t = String(url).trim();
  if (!t) return "";
  if (t.startsWith("/")) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

export default function MeusSites() {
  const classes = useStyles();
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: "", responsible: "", priority: "", tag: "", withDueDate: false });
  const [columnModal, setColumnModal] = useState({ open: false, id: null, name: "", color: "#f9fafb", description: "" });
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardTab, setCardTab] = useState(0);
  const [cardForm, setCardForm] = useState(emptyCard);
  const [commentInput, setCommentInput] = useState("");
  const [checklistInput, setChecklistInput] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/my-sites/board", {
        params: {
          search: filters.search || undefined,
          responsible: filters.responsible || undefined,
          priority: filters.priority || undefined,
          tag: filters.tag || undefined,
          withDueDate: filters.withDueDate || undefined
        }
      });
      setColumns(Array.isArray(data) ? data : []);
    } catch (_) {
      toast.error("Erro ao carregar Meus Sites.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(loadBoard, 150);
    return () => clearTimeout(t);
  }, [loadBoard]);

  const tagsAvailable = useMemo(() => {
    const set = new Set();
    columns.forEach(c => (c.cards || []).forEach(card => (card.tags || []).forEach(tag => set.add(tag))));
    return Array.from(set);
  }, [columns]);

  const openColumnCreate = () => setColumnModal({ open: true, id: null, name: "", color: "#f9fafb", description: "" });
  const openColumnEdit = col => setColumnModal({ open: true, id: col.id, name: col.name || "", color: col.color || "#f9fafb", description: col.description || "" });

  const saveColumn = async () => {
    if (!columnModal.name) return toast.error("Nome da coluna e obrigatorio.");
    try {
      if (columnModal.id) await api.put(`/my-sites/columns/${columnModal.id}`, columnModal);
      else await api.post("/my-sites/columns", columnModal);
      setColumnModal({ open: false, id: null, name: "", color: "#f9fafb", description: "" });
      loadBoard();
    } catch (_) {
      toast.error("Falha ao salvar coluna.");
    }
  };

  const deleteColumn = async columnId => {
    if (!window.confirm("Deseja excluir a coluna e seus cartoes?")) return;
    try {
      await api.delete(`/my-sites/columns/${columnId}`);
      loadBoard();
    } catch (_) {
      toast.error("Falha ao excluir coluna.");
    }
  };

  const openCardModal = (columnId, card) => {
    setCardTab(0);
    setCommentInput("");
    setChecklistInput("");
    setAttachmentUrl("");
    setAttachmentName("");
    if (card) {
      setCardForm({
        ...emptyCard,
        ...card,
        columnId: String(card.columnId),
        dueDate: card.dueDate || "",
        tagsInput: Array.isArray(card.tags) ? card.tags.join(", ") : "",
        checklistItems: card.checklistItems || [],
        comments: card.comments || [],
        attachments: card.attachments || []
      });
    } else {
      setCardForm({ ...emptyCard, columnId: String(columnId) });
    }
    setCardModalOpen(true);
  };

  const saveCard = async () => {
    if (!cardForm.title) return toast.error("Titulo e obrigatorio.");
    const payload = {
      columnId: Number(cardForm.columnId),
      title: cardForm.title,
      description: cardForm.description,
      url: cardForm.url,
      responsible: cardForm.responsible,
      priority: cardForm.priority,
      dueDate: cardForm.dueDate || null,
      tags: cardForm.tagsInput ? cardForm.tagsInput.split(",").map(t => t.trim()).filter(Boolean) : [],
      notes: cardForm.notes,
      color: cardForm.color
    };
    try {
      if (cardForm.id) await api.put(`/my-sites/cards/${cardForm.id}`, payload);
      else await api.post("/my-sites/cards", payload);
      setCardModalOpen(false);
      loadBoard();
    } catch (_) {
      toast.error("Falha ao salvar cartao.");
    }
  };

  const deleteCard = async () => {
    if (!cardForm.id || !window.confirm("Deseja excluir este cartao?")) return;
    try {
      await api.delete(`/my-sites/cards/${cardForm.id}`);
      setCardModalOpen(false);
      loadBoard();
    } catch (_) {
      toast.error("Falha ao excluir cartao.");
    }
  };

  const onDragEnd = async result => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    try {
      if (type === "COLUMN") {
        const reordered = [...columns];
        const [moved] = reordered.splice(source.index, 1);
        reordered.splice(destination.index, 0, moved);
        setColumns(reordered);
        await api.post("/my-sites/columns/reorder", { columns: reordered.map(c => ({ id: c.id })) });
      } else {
        await api.post(`/my-sites/cards/${draggableId}/move`, {
          columnId: Number(destination.droppableId),
          order: destination.index
        });
      }
      loadBoard();
    } catch (_) {
      toast.error("Falha ao reordenar board.");
      loadBoard();
    }
  };

  const createChecklist = async () => {
    if (!cardForm.id || !checklistInput) return;
    try {
      await api.post(`/my-sites/cards/${cardForm.id}/checklist`, { title: checklistInput });
      setChecklistInput("");
      loadBoard();
    } catch (_) {
      toast.error("Falha ao adicionar checklist.");
    }
  };

  const toggleChecklist = async item => {
    try {
      await api.put(`/my-sites/checklist/${item.id}`, { completed: !item.completed });
      loadBoard();
    } catch (_) {
      toast.error("Falha ao atualizar checklist.");
    }
  };

  const removeChecklist = async itemId => {
    try {
      await api.delete(`/my-sites/checklist/${itemId}`);
      loadBoard();
    } catch (_) {
      toast.error("Falha ao remover item.");
    }
  };

  const addComment = async () => {
    if (!cardForm.id || !commentInput) return;
    try {
      await api.post(`/my-sites/cards/${cardForm.id}/comments`, { message: commentInput });
      setCommentInput("");
      loadBoard();
    } catch (_) {
      toast.error("Falha ao comentar.");
    }
  };

  const deleteComment = async commentId => {
    try {
      await api.delete(`/my-sites/comments/${commentId}`);
      loadBoard();
    } catch (_) {
      toast.error("Falha ao remover comentario.");
    }
  };

  const uploadAttachment = async file => {
    if (!cardForm.id || !file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post(`/my-sites/cards/${cardForm.id}/attachments`, formData);
      loadBoard();
    } catch (_) {
      toast.error("Falha ao enviar anexo.");
    }
  };

  const addAttachmentLink = async () => {
    if (!cardForm.id || !attachmentUrl) return;
    try {
      await api.post(`/my-sites/cards/${cardForm.id}/attachments/link`, { name: attachmentName, url: attachmentUrl });
      setAttachmentName("");
      setAttachmentUrl("");
      loadBoard();
    } catch (_) {
      toast.error("Falha ao adicionar link.");
    }
  };

  const removeAttachment = async id => {
    try {
      await api.delete(`/my-sites/attachments/${id}`);
      loadBoard();
    } catch (_) {
      toast.error("Falha ao remover anexo.");
    }
  };

  const currentCard = useMemo(() => {
    if (!cardForm.id) return cardForm;
    for (const column of columns) {
      const found = (column.cards || []).find(card => card.id === cardForm.id);
      if (found) {
        return {
          ...cardForm,
          ...found,
          columnId: String(found.columnId),
          tagsInput: Array.isArray(found.tags) ? found.tags.join(", ") : "",
          checklistItems: found.checklistItems || [],
          comments: found.comments || [],
          attachments: found.attachments || []
        };
      }
    }
    return cardForm;
  }, [columns, cardForm]);

  return (
    <MainContainer>
      <Box className={classes.root}>
        <Box className={classes.shell}>
          <ContextPageHeader title="Meus Sites" subtitle="Gerencie e acesse seus sites (clique no cartao para abrir)" fallbackTo="/dashboard" />

          <Paper className={classes.topCard}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gridGap={8}>
              <Typography style={{ fontWeight: 800, fontSize: "1rem" }}>Painel de Sites da Equipe</Typography>
              <Button variant="contained" color="primary" startIcon={<Add />} onClick={openColumnCreate}>
                Nova Coluna
              </Button>
            </Box>
            <Box className={classes.controls}>
              <TextField variant="outlined" size="small" label="Buscar cartoes..." value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
              <TextField variant="outlined" size="small" label="Responsavel..." value={filters.responsible} onChange={e => setFilters(p => ({ ...p, responsible: e.target.value }))} />
              <FormControl variant="outlined" size="small">
                <InputLabel>Prioridade</InputLabel>
                <Select value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))} label="Prioridade">
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="Baixa">Baixa</MenuItem>
                  <MenuItem value="Media">Media</MenuItem>
                  <MenuItem value="Alta">Alta</MenuItem>
                  <MenuItem value="Urgente">Urgente</MenuItem>
                </Select>
              </FormControl>
              <FormControl variant="outlined" size="small">
                <InputLabel>Tag</InputLabel>
                <Select value={filters.tag} onChange={e => setFilters(p => ({ ...p, tag: e.target.value }))} label="Tag">
                  <MenuItem value="">Todas</MenuItem>
                  {tagsAvailable.map(tag => (
                    <MenuItem key={tag} value={tag}>{tag}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={<Checkbox checked={filters.withDueDate} onChange={e => setFilters(p => ({ ...p, withDueDate: e.target.checked }))} color="primary" />}
                label="Com prazo"
              />
            </Box>
            <Box className={classes.tagsRow}>
              <Typography variant="caption" color="textSecondary">Tags:</Typography>
              {tagsAvailable.slice(0, 10).map(tag => <Chip key={tag} size="small" label={tag} />)}
            </Box>
          </Paper>

          <Box className={classes.boardArea}>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="board" type="COLUMN" direction="horizontal">
                {provided => (
                  <Box className={classes.boardRow} ref={provided.innerRef} {...provided.droppableProps}>
                    {columns.map((column, columnIndex) => (
                      <Draggable key={`col-${column.id}`} draggableId={`col-${column.id}`} index={columnIndex}>
                        {drag => (
                          <Paper className={classes.column} ref={drag.innerRef} {...drag.draggableProps}>
                            <Box className={classes.columnHead} style={{ background: column.color || "#f9fafb" }} {...drag.dragHandleProps}>
                              <Box>
                                <Typography style={{ fontWeight: 800, fontSize: ".9rem" }}>{column.name}</Typography>
                                <Typography style={{ fontSize: ".72rem", color: "#60707f" }}>{(column.cards || []).length} cartoes</Typography>
                              </Box>
                              <Box>
                                <IconButton size="small" onClick={() => openColumnEdit(column)}><Edit fontSize="small" /></IconButton>
                                <IconButton size="small" onClick={() => deleteColumn(column.id)}><Delete fontSize="small" /></IconButton>
                              </Box>
                            </Box>
                            <Droppable droppableId={String(column.id)} type="CARD">
                              {drop => (
                                <Box className={classes.columnBody} ref={drop.innerRef} {...drop.droppableProps}>
                                  {(column.cards || []).map((card, cardIndex) => (
                                    <Draggable key={String(card.id)} draggableId={String(card.id)} index={cardIndex}>
                                      {dragCard => (
                                        <Box className={classes.card} ref={dragCard.innerRef} {...dragCard.draggableProps} {...dragCard.dragHandleProps} style={{ ...dragCard.draggableProps.style, background: card.color || "#fff7e8" }} onClick={() => openCardModal(column.id, card)}>
                                          <Typography style={{ fontWeight: 700 }}>{card.title}</Typography>
                                          {card.description ? <Typography variant="body2" style={{ color: "#556574", marginTop: 2 }}>{card.description}</Typography> : null}
                                          {card.url ? (
                                            <a href={safeUrl(card.url)} target="_blank" rel="noopener noreferrer" className={classes.link} onClick={e => e.stopPropagation()}>
                                              <OpenInNew style={{ fontSize: 14 }} />
                                              {card.url}
                                            </a>
                                          ) : null}
                                          <Box mt={0.6} display="flex" gridGap={4} flexWrap="wrap">
                                            {card.priority ? <Chip size="small" label={card.priority} /> : null}
                                            {(card.tags || []).slice(0, 2).map(tag => <Chip size="small" key={tag} label={tag} />)}
                                          </Box>
                                        </Box>
                                      )}
                                    </Draggable>
                                  ))}
                                  {drop.placeholder}
                                  <Button fullWidth className={classes.addCardBtn} startIcon={<Add />} onClick={() => openCardModal(column.id, null)}>Adicionar Cartao</Button>
                                </Box>
                              )}
                            </Droppable>
                          </Paper>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>
          </Box>
        </Box>
      </Box>

      <Dialog open={columnModal.open} onClose={() => setColumnModal(p => ({ ...p, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>{columnModal.id ? "Editar Coluna" : "Nova Coluna"}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" variant="outlined" size="small" label="Nome" value={columnModal.name} onChange={e => setColumnModal(p => ({ ...p, name: e.target.value }))} />
          <TextField fullWidth margin="dense" variant="outlined" size="small" label="Descricao" value={columnModal.description} onChange={e => setColumnModal(p => ({ ...p, description: e.target.value }))} />
          <TextField fullWidth margin="dense" variant="outlined" size="small" type="color" label="Cor" InputLabelProps={{ shrink: true }} value={columnModal.color} onChange={e => setColumnModal(p => ({ ...p, color: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColumnModal(p => ({ ...p, open: false }))}>Cancelar</Button>
          <Button color="primary" variant="contained" onClick={saveColumn}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cardModalOpen} onClose={() => setCardModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Editar Cartao</DialogTitle>
        <DialogContent>
          <Tabs value={cardTab} onChange={(_, v) => setCardTab(v)} className={classes.modalTabs}>
            <Tab className={classes.modalTab} label="Detalhes" />
            <Tab className={classes.modalTab} label="Checklist" />
            <Tab className={classes.modalTab} label="Comentarios" />
            <Tab className={classes.modalTab} label="Anexos" />
          </Tabs>

          {cardTab === 0 && (
            <Box mt={1} className={classes.section}>
              <TextField variant="outlined" size="small" label="Titulo" value={cardForm.title} onChange={e => setCardForm(p => ({ ...p, title: e.target.value }))} />
              <TextField variant="outlined" size="small" label="URL do Site" value={cardForm.url} onChange={e => setCardForm(p => ({ ...p, url: e.target.value }))} />
              <TextField className={classes.full} variant="outlined" size="small" multiline rows={3} label="Descricao" value={cardForm.description} onChange={e => setCardForm(p => ({ ...p, description: e.target.value }))} />
              <TextField variant="outlined" size="small" label="Responsavel" value={cardForm.responsible} onChange={e => setCardForm(p => ({ ...p, responsible: e.target.value }))} />
              <FormControl variant="outlined" size="small">
                <InputLabel>Prioridade</InputLabel>
                <Select value={cardForm.priority} onChange={e => setCardForm(p => ({ ...p, priority: e.target.value }))} label="Prioridade">
                  <MenuItem value="Baixa">Baixa</MenuItem>
                  <MenuItem value="Media">Media</MenuItem>
                  <MenuItem value="Alta">Alta</MenuItem>
                  <MenuItem value="Urgente">Urgente</MenuItem>
                </Select>
              </FormControl>
              <TextField variant="outlined" size="small" type="date" label="Data de Vencimento" InputLabelProps={{ shrink: true }} value={cardForm.dueDate} onChange={e => setCardForm(p => ({ ...p, dueDate: e.target.value }))} />
              <TextField className={classes.full} variant="outlined" size="small" label="Etiquetas (separadas por virgula)" value={cardForm.tagsInput} onChange={e => setCardForm(p => ({ ...p, tagsInput: e.target.value }))} />
              <TextField className={classes.full} variant="outlined" size="small" multiline rows={2} label="Observacoes" value={cardForm.notes} onChange={e => setCardForm(p => ({ ...p, notes: e.target.value }))} />
              {cardForm.url ? (
                <Button className={classes.full} variant="outlined" color="primary" href={safeUrl(cardForm.url)} target="_blank" rel="noopener noreferrer" startIcon={<OpenInNew />}>
                  Abrir site em nova aba
                </Button>
              ) : null}
            </Box>
          )}

          {cardTab === 1 && (
            <Box mt={1}>
              <Box display="flex" gridGap={8}>
                <TextField fullWidth variant="outlined" size="small" label="Adicionar item" value={checklistInput} onChange={e => setChecklistInput(e.target.value)} />
                <Button startIcon={<Add />} onClick={createChecklist} color="primary">Adicionar</Button>
              </Box>
              <Box mt={1}>
                {(currentCard.checklistItems || []).map(item => (
                  <Box key={item.id} display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                    <FormControlLabel control={<Checkbox checked={item.completed} onChange={() => toggleChecklist(item)} color="primary" />} label={item.title} />
                    <IconButton size="small" onClick={() => removeChecklist(item.id)}><Delete fontSize="small" /></IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {cardTab === 2 && (
            <Box mt={1}>
              <Box display="flex" gridGap={8}>
                <TextField fullWidth variant="outlined" size="small" label="Adicionar comentario..." value={commentInput} onChange={e => setCommentInput(e.target.value)} />
                <Button startIcon={<Send />} onClick={addComment} color="primary">Enviar</Button>
              </Box>
              <Box mt={1}>
                {(currentCard.comments || []).map(comment => (
                  <Paper key={comment.id} style={{ padding: 8, marginBottom: 6, border: "1px solid #e3e8ef" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="textSecondary">{comment.user?.name || "Usuario"} - {new Date(comment.createdAt).toLocaleString("pt-BR")}</Typography>
                      <IconButton size="small" onClick={() => deleteComment(comment.id)}><Delete fontSize="small" /></IconButton>
                    </Box>
                    <Typography variant="body2">{comment.message}</Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          {cardTab === 3 && (
            <Box mt={1}>
              <Box display="flex" gridGap={8} alignItems="center">
                <input type="file" onChange={e => uploadAttachment(e.target.files?.[0])} />
              </Box>
              <Box mt={1} display="grid" gridTemplateColumns="1fr 180px auto" gridGap={8}>
                <TextField variant="outlined" size="small" label="URL do anexo" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} />
                <TextField variant="outlined" size="small" label="Nome" value={attachmentName} onChange={e => setAttachmentName(e.target.value)} />
                <Button startIcon={<AttachFile />} onClick={addAttachmentLink} color="primary">Adicionar link</Button>
              </Box>
              <Box mt={1}>
                {(currentCard.attachments || []).map(att => (
                  <Paper key={att.id} style={{ padding: 8, marginBottom: 6, border: "1px solid #e3e8ef" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <a href={safeUrl(att.url)} target="_blank" rel="noopener noreferrer" className={classes.link}>
                        <OpenInNew style={{ fontSize: 14 }} />
                        {att.name || att.originalName || att.filename || "Anexo"}
                      </a>
                      <IconButton size="small" onClick={() => removeAttachment(att.id)}><Delete fontSize="small" /></IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {cardForm.id ? <Button startIcon={<Delete />} onClick={deleteCard} color="secondary">Excluir</Button> : null}
          <Box style={{ flex: 1 }} />
          <Button onClick={() => setCardModalOpen(false)}>Cancelar</Button>
          <Button onClick={saveCard} color="primary" variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
}

