import React, { useEffect, useState, useMemo } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Chip,
  Tabs,
  Tab,
  Box
} from "@material-ui/core";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Close as CloseIcon
} from "@material-ui/icons";
import api from "../../services/api";
import useUsers from "../../hooks/useUsers";
import TagModal from "../../components/TagModal";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import { useSystemAlert } from "../../components/SystemAlert";
import TabPanel from "../../components/TabPanel";

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    paddingBottom: 100
  },
  form: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(4)
  },
  field: {
    marginBottom: theme.spacing(2)
  },
  sectionTitle: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1)
  },
  actions: {
    marginTop: theme.spacing(1),
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: theme.spacing(2)
  },
  cardsGrid: {
    marginTop: theme.spacing(2)
  },
  card: {
    borderRadius: 12,
    boxShadow: "0 4px 10px rgba(15, 23, 42, 0.12)",
    border: `1px solid ${"#e5e7eb"}`,
    height: "100%",
    display: "flex",
    flexDirection: "column"
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1)
  }
}));

const NegociosPage = () => {
  const classes = useStyles();
  const { showConfirm } = useSystemAlert();

  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kanbanBoards, setKanbanBoards] = useState([]); // array de IDs de tags
  const [selectedUsers, setSelectedUsers] = useState([]); // array de IDs de usuários
  const [kanbanTags, setKanbanTags] = useState([]); // tags kanban disponíveis
  const [kanbanTagToAdd, setKanbanTagToAdd] = useState("");
  const [tagsLoading, setTagsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("negocios");
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagSearchTerm, setTagSearchTerm] = useState("");

  const { users, loading: loadingUsers } = useUsers();

  const [viewOpen, setViewOpen] = useState(false);
  const [viewNegocio, setViewNegocio] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setKanbanBoards([]);
    setSelectedUsers([]);
    setFormOpen(false);
  };

  const loadNegocios = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/negocios");
      setNegocios(data || []);
    } catch (err) {
      console.error("Erro ao carregar negócios", err);
    } finally {
      setLoading(false);
    }
  };

  const truncate = (text, maxLength = 30) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const getKanbanCount = negocio => {
    return Array.isArray(negocio.kanbanBoards) ? negocio.kanbanBoards.length : 0;
  };

  const getKanbanDetails = negocio => {
    if (!negocio || !Array.isArray(negocio.kanbanBoards)) return [];
    return negocio.kanbanBoards.map(id => {
      const tag = kanbanTags.find(t => t.id === id);
      return {
        id,
        name: tag ? tag.name : String(id)
      };
    });
  };

  const loadKanbanTags = async () => {
    setTagsLoading(true);
    try {
      const { data } = await api.get("/tags", {
        params: { kanban: 1 }
      });
      setKanbanTags(data.tags || []);
    } catch (err) {
      console.error("Erro ao carregar tags do Kanban", err);
      toastError(err);
    } finally {
      setTagsLoading(false);
    }
  };

  useEffect(() => {
    loadNegocios();
    loadKanbanTags();
  }, []);

  const usedKanbanTags = useMemo(() => {
    const used = new Set();
    negocios.forEach(negocio => {
      if (editingId && negocio.id === editingId) {
        return;
      }
      if (Array.isArray(negocio.kanbanBoards)) {
        negocio.kanbanBoards.forEach(tagId => used.add(tagId));
      }
    });
    return used;
  }, [negocios, editingId]);

  const availableKanbanTags = useMemo(() => {
    return kanbanTags.filter(tag => !usedKanbanTags.has(tag.id) || kanbanBoards.includes(tag.id));
  }, [kanbanTags, usedKanbanTags, kanbanBoards]);

  const filteredKanbanTags = useMemo(() => {
    if (!tagSearchTerm.trim()) {
      return kanbanTags;
    }
    const term = tagSearchTerm.trim().toLowerCase();
    return kanbanTags.filter(tag => (tag.name || "").toLowerCase().includes(term));
  }, [kanbanTags, tagSearchTerm]);

  const handleAddKanbanBoard = tagId => {
    if (!tagId) return;
    setKanbanBoards(prev => {
      if (prev.includes(tagId)) {
        return prev;
      }
      return [...prev, tagId];
    });
    setKanbanTagToAdd("");
  };

  const handleMoveKanbanBoard = (index, direction) => {
    setKanbanBoards(prev => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev;
      }
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleRemoveKanbanBoard = tagId => {
    setKanbanBoards(prev => prev.filter(id => id !== tagId));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name,
      description,
      kanbanBoards,
      users: selectedUsers
    };

    try {
      if (editingId) {
        await api.put(`/negocios/${editingId}`, payload);
      } else {
        await api.post("/negocios", payload);
      }

      await loadNegocios();
      resetForm();
    } catch (err) {
      console.error("Erro ao salvar negócio", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = negocio => {
    setEditingId(negocio.id);
    setName(negocio.name || "");
    setDescription(negocio.description || "");
    setKanbanBoards(Array.isArray(negocio.kanbanBoards) ? negocio.kanbanBoards : []);
    setSelectedUsers(Array.isArray(negocio.users) ? negocio.users : []);
    setFormOpen(true);
  };

  const handleDelete = async id => {
    const confirmed = await showConfirm({
      type: "error",
      title: "Excluir Negócio",
      message: "Deseja realmente excluir este negócio?",
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;

    try {
      await api.delete(`/negocios/${id}`);
      await loadNegocios();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error("Erro ao excluir negócio", err);
    }
  };

  const handleOpenTagModal = () => {
    setSelectedTag(null);
    setTagModalOpen(true);
  };

  const handleCloseTagModal = () => {
    setSelectedTag(null);
    setTagModalOpen(false);
    loadKanbanTags();
  };

  const handleEditTag = tag => {
    setSelectedTag(tag);
    setActiveTab("tags");
    setTagModalOpen(true);
  };

  const handleDeleteTag = async tagId => {
    const confirmedTag = await showConfirm({
      type: "error",
      title: "Excluir Tag Kanban",
      message: "Deseja realmente excluir esta Tag Kanban?",
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
    });
    if (!confirmedTag) return;
    try {
      await api.delete(`/tags/${tagId}`);
      toast.success("Tag Kanban excluída com sucesso.");
      loadKanbanTags();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Paper className={classes.mainPaper} variant="outlined">
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
      >
        <Tab label="Negócios" value="negocios" />
        <Tab label="Tags Kanban" value="tags" />
      </Tabs>

      <Box mt={2}>
        <TabPanel value={activeTab} name="negocios">
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item xs={12} sm={4}>
              <Typography variant="h5">Negócios</Typography>
            </Grid>
            <Grid item xs={12} sm={8}>
              <div className={classes.actions}>
                <TextField
                  placeholder="Pesquisar..."
                  variant="standard"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon style={{ color: "#FFA500" }} />
                      </InputAdornment>
                    )
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    resetForm();
                    setFormOpen(true);
                  }}
                >
                  Adicionar negócio
                </Button>
              </div>
            </Grid>
          </Grid>

          <Divider style={{ marginTop: 16 }} />

          <Typography variant="h6" className={classes.sectionTitle}>
            Negócios cadastrados
          </Typography>

          {loading ? (
            <Typography>Carregando negócios...</Typography>
          ) : (
            <Grid container spacing={2} className={classes.cardsGrid}>
              {negocios
                .filter(negocio => {
                  if (!searchTerm.trim()) return true;
                  const term = searchTerm.toLowerCase();
                  return (
                    (negocio.name || "").toLowerCase().includes(term) ||
                    (negocio.description || "").toLowerCase().includes(term)
                  );
                })
                .map(negocio => (
                <Grid item xs={12} sm={6} md={4} key={negocio.id}>
                  <Card className={classes.card}>
                    <CardContent>
                      <div className={classes.cardHeader}>
                        <Typography variant="h6" noWrap>
                          {negocio.name}
                        </Typography>
                      </div>

                      {negocio.description && (
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          {truncate(negocio.description, 30)}
                        </Typography>
                      )}

                      <Typography variant="body2">
                        <strong>Kanbans:</strong> {getKanbanCount(negocio)}
                      </Typography>
                    </CardContent>
                    <Divider />
                    <CardActions>
                      <IconButton
                        onClick={() => {
                          setViewNegocio(negocio);
                          setViewOpen(true);
                        }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton onClick={() => handleEdit(negocio)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(negocio.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}

              {negocios.length === 0 && !loading && (
                <Grid item xs={12}>
                  <Typography>Nenhum negócio cadastrado ainda.</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={activeTab} name="tags">
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item xs={12} sm={6}>
              <Typography variant="h5">Tags Kanban</Typography>
              <Typography variant="body2" color="textSecondary">
                Gerencie as colunas que serão usadas nos negócios.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <div className={classes.actions}>
                <TextField
                  placeholder="Buscar tags..."
                  variant="standard"
                  value={tagSearchTerm}
                  onChange={e => setTagSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon style={{ color: "#FFA500" }} />
                      </InputAdornment>
                    )
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleOpenTagModal}
                >
                  Nova Tag Kanban
                </Button>
              </div>
            </Grid>
          </Grid>

          <Divider style={{ marginTop: 16 }} />

          {tagsLoading ? (
            <Typography>Carregando tags...</Typography>
          ) : filteredKanbanTags.length === 0 ? (
            <Typography style={{ marginTop: 16 }}>
              Nenhuma tag encontrada.
            </Typography>
          ) : (
            <Grid container spacing={2} className={classes.cardsGrid}>
              {filteredKanbanTags.map(tag => (
                <Grid item xs={12} sm={6} md={4} key={tag.id}>
                  <Card className={classes.card}>
                    <CardContent>
                      <Chip
                        label={tag.name}
                        style={{
                          backgroundColor: tag.color || "#4B5563",
                          color: "#fff",
                          marginBottom: 8
                        }}
                      />
                      <Typography variant="body2" color="textSecondary">
                        ID: {tag.id}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <IconButton onClick={() => handleEditTag(tag)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteTag(tag.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Box>
      <TagModal
        open={tagModalOpen}
        onClose={handleCloseTagModal}
        tagId={selectedTag ? selectedTag.id : null}
        kanban={1}
      />

      <Dialog
        open={formOpen}
        onClose={resetForm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingId ? "Editar negócio" : "Adicionar negócio"}
        </DialogTitle>
        <DialogContent>
          <form className={classes.form} id="negocio-form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nome do negócio"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  variant="outlined"
                  fullWidth
                  className={classes.field}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Descrição"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  variant="outlined"
                  fullWidth
                  className={classes.field}
                />
              </Grid>

              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl variant="outlined" fullWidth className={classes.field}>
                      <InputLabel id="kanbanBoards-label">Adicionar Tag Kanban</InputLabel>
                      <Select
                        labelId="kanbanBoards-label"
                        value={kanbanTagToAdd}
                        onChange={e => {
                          const value = e.target.value;
                          setKanbanTagToAdd(value);
                          handleAddKanbanBoard(value);
                        }}
                        label="Adicionar Tag Kanban"
                      >
                        {availableKanbanTags.length === 0 && (
                          <MenuItem value="" disabled>
                            Nenhuma tag disponível
                          </MenuItem>
                        )}
                        {availableKanbanTags.map(tag => (
                          <MenuItem key={tag.id} value={tag.id}>
                            {tag.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Ordem das Tags Kanban (arraste com os botões para reordenar)
                    </Typography>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {kanbanBoards.length === 0 && (
                        <Typography variant="body2" color="textSecondary">
                          Nenhuma tag selecionada.
                        </Typography>
                      )}
                      {kanbanBoards.map((id, index) => {
                        const tagInfo = kanbanTags.find(tag => tag.id === id);
                        return (
                          <Chip
                            key={id}
                            label={
                              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <strong>{index + 1}.</strong> {tagInfo?.name || id}
                              </span>
                            }
                            onDelete={() => handleRemoveKanbanBoard(id)}
                            deleteIcon={<CloseIcon />}
                            style={{ backgroundColor: "#f0f4ff" }}
                            icon={
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <IconButton
                                  size="small"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleMoveKanbanBoard(index, -1);
                                  }}
                                  disabled={index === 0}
                                >
                                  <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleMoveKanbanBoard(index, 1);
                                  }}
                                  disabled={index === kanbanBoards.length - 1}
                                >
                                  <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                              </div>
                            }
                          />
                        );
                      })}
                    </div>
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl variant="outlined" fullWidth className={classes.field}>
                  <InputLabel id="users-label">Usuários</InputLabel>
                  <Select
                    labelId="users-label"
                    multiple
                    value={selectedUsers}
                    onChange={e => setSelectedUsers(e.target.value)}
                    label="Usuários"
                    renderValue={selected => {
                      const selectedIds = selected || [];
                      const names = (users || [])
                        .filter(u => selectedIds.includes(u.id))
                        .map(u => u.name);
                      return names.join(", ");
                    }}
                  >
                    {(users || []).map(u => (
                      <MenuItem key={u.id} value={u.id}>
                        <Checkbox checked={selectedUsers.includes(u.id)} />
                        <ListItemText primary={u.name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetForm}>Cancelar</Button>
          <Button
            color="primary"
            variant="contained"
            type="submit"
            form="negocio-form"
            disabled={saving}
          >
            {editingId ? "Salvar alterações" : "Criar negócio"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewNegocio(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Detalhes do negócio</DialogTitle>
        <DialogContent>
          {viewNegocio && (
            <>
              <Typography variant="h6" gutterBottom>
                {viewNegocio.name}
              </Typography>
              {viewNegocio.description && (
                <Typography variant="body2" paragraph>
                  <strong>Descrição completa:</strong> {viewNegocio.description}
                </Typography>
              )}
              <Typography variant="subtitle1" gutterBottom>
                Kanbans
              </Typography>
              {getKanbanDetails(viewNegocio).length > 0 ? (
                getKanbanDetails(viewNegocio).map(k => (
                  <Typography key={k.id} variant="body2">
                    ID: {k.id} - {k.name}
                  </Typography>
                ))
              ) : (
                <Typography variant="body2">Nenhum kanban vinculado.</Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setViewOpen(false);
              setViewNegocio(null);
            }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default NegociosPage;