import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  makeStyles,
  InputLabel,
  FormControl,
  CircularProgress,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import BarChartIcon from "@material-ui/icons/BarChart";
import { toast } from "react-toastify";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";

const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(3) },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(3),
  },
  chip: { marginRight: theme.spacing(1) },
  stageRow: {
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  stageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(1),
  },
  btnRow: {
    display: "flex",
    gap: theme.spacing(1),
    justifyContent: "flex-end",
    marginTop: theme.spacing(1),
  },
  statsBox: {
    display: "flex",
    gap: theme.spacing(3),
    flexWrap: "wrap",
    padding: theme.spacing(2),
  },
  statCard: {
    textAlign: "center",
    minWidth: 100,
  },
}));

const emptyStage = () => ({
  order: 1,
  delayMinutes: 60,
  messageType: "text",
  message: "",
  mediaUrl: "",
  mediaType: "",
  mediaCaption: "",
  buttons: [],
  isActive: true,
});

const emptyForm = () => ({
  name: "",
  whatsappId: "",
  isActive: true,
  sourceType: "manual",
  boardColumn: "",
  stages: [emptyStage()],
});

const StatsDialog = ({ open, onClose, campaignId, campaignName }) => {
  const classes = useStyles();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !campaignId) return;
    setLoading(true);
    api.get(`/follow-up-campaigns/${campaignId}/stats`)
      .then(({ data }) => setStats(data))
      .catch(() => toast.error("Erro ao carregar estatísticas"))
      .finally(() => setLoading(false));
  }, [open, campaignId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Estatísticas — {campaignName}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
        ) : stats ? (
          <Box className={classes.statsBox}>
            <Box className={classes.statCard}>
              <Typography variant="h4">{stats.totalSent}</Typography>
              <Typography variant="caption">Total enviados</Typography>
            </Box>
            <Box className={classes.statCard}>
              <Typography variant="h4">{stats.sentToday}</Typography>
              <Typography variant="caption">Enviados hoje</Typography>
            </Box>
            <Box className={classes.statCard}>
              <Typography variant="h4">{stats.responded}</Typography>
              <Typography variant="caption">Responderam</Typography>
            </Box>
            <Box className={classes.statCard}>
              <Typography variant="h4" color={stats.responseRate >= 50 ? "primary" : "error"}>
                {stats.responseRate}%
              </Typography>
              <Typography variant="caption">Taxa de resposta</Typography>
            </Box>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

const FollowUpModal = ({ open, onClose, onSave, campaign, whatsApps }) => {
  const classes = useStyles();
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name || "",
        whatsappId: campaign.whatsappId || "",
        isActive: campaign.isActive !== false,
        sourceType: campaign.sourceType || "manual",
        boardColumn: campaign.boardColumn || "",
        stages: campaign.stages?.length ? campaign.stages : [emptyStage()],
      });
    } else {
      setForm(emptyForm());
    }
  }, [campaign, open]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const updateStage = (idx, key, value) => {
    setForm((p) => {
      const stages = [...p.stages];
      stages[idx] = { ...stages[idx], [key]: value };
      return { ...p, stages };
    });
  };

  const handleUpload = async (e, idx, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMB = file.size / 1024 / 1024;
    if (type === "image" && sizeMB > 5) return toast.error("A imagem deve ter até 5MB");
    if (type === "video" && sizeMB > 16) return toast.error("O vídeo deve ter até 16MB");
    if (type === "audio" && sizeMB > 10) return toast.error("O áudio deve ter até 10MB");
    if (type === "document" && sizeMB > 10) return toast.error("O documento deve ter até 10MB");

    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post("/upload", formData);
      updateStage(idx, "mediaUrl", data.filePath);
      updateStage(idx, "mediaType", type);
      toast.success("Arquivo anexado com sucesso!");
    } catch {
      toast.error("Erro no upload do arquivo");
    }
  };

  const addStage = () => {
    setForm((p) => ({
      ...p,
      stages: [...p.stages, { ...emptyStage(), order: p.stages.length + 1 }],
    }));
  };

  const removeStage = (idx) => {
    setForm((p) => ({ ...p, stages: p.stages.filter((_, i) => i !== idx) }));
  };

  const addButton = (idx) => {
    setForm((p) => {
      const stages = [...p.stages];
      stages[idx] = {
        ...stages[idx],
        buttons: [...(stages[idx].buttons || []), { displayText: "", type: "reply", value: "" }],
      };
      return { ...p, stages };
    });
  };

  const updateButton = (stageIdx, btnIdx, key, value) => {
    setForm((p) => {
      const stages = [...p.stages];
      const buttons = [...(stages[stageIdx].buttons || [])];
      buttons[btnIdx] = { ...buttons[btnIdx], [key]: value };
      stages[stageIdx] = { ...stages[stageIdx], buttons };
      return { ...p, stages };
    });
  };

  const removeButton = (stageIdx, btnIdx) => {
    setForm((p) => {
      const stages = [...p.stages];
      stages[stageIdx] = {
        ...stages[stageIdx],
        buttons: stages[stageIdx].buttons.filter((_, i) => i !== btnIdx),
      };
      return { ...p, stages };
    });
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast.warn("Informe um nome para a campanha");
    if (!form.stages.length) return toast.warn("Adicione ao menos um estágio");
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{campaign ? "Editar Follow-up" : "Novo Follow-up"}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField
            label="Nome da campanha"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
          />

          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel>Conexão WhatsApp (opcional)</InputLabel>
            <Select
              value={form.whatsappId}
              onChange={(e) => setField("whatsappId", e.target.value)}
              label="Conexão WhatsApp (opcional)"
            >
              <MenuItem value="">Automático (primeiro disponível)</MenuItem>
              {whatsApps?.filter((w) => w.status === "CONNECTED").map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" fullWidth>
            <InputLabel>Tipo de origem</InputLabel>
            <Select
              value={form.sourceType}
              onChange={(e) => setField("sourceType", e.target.value)}
              label="Tipo de origem"
            >
              <MenuItem value="manual">Manual (qualquer mensagem enviada)</MenuItem>
              <MenuItem value="campaign">Campanha (disparador)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Coluna do Quadro Kanban (Opcional)"
            placeholder="Ex: Black Friday"
            value={form.boardColumn}
            onChange={(e) => setField("boardColumn", e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
                color="primary"
              />
            }
            label="Ativo"
          />

          <Divider />

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1"><strong>Estágios</strong></Typography>
            <Button startIcon={<AddIcon />} size="small" onClick={addStage} variant="outlined">
              Adicionar estágio
            </Button>
          </Box>

          {form.stages.map((stage, idx) => (
            <Box key={idx} className={classes.stageRow}>
              <Box className={classes.stageHeader}>
                <Typography variant="subtitle2">Estágio {idx + 1}</Typography>
                <IconButton size="small" onClick={() => removeStage(idx)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              <Box display="flex" gap={2} flexWrap="wrap" mb={1}>
                <TextField
                  label="Atraso (minutos)"
                  type="number"
                  value={stage.delayMinutes}
                  onChange={(e) => updateStage(idx, "delayMinutes", Number(e.target.value))}
                  variant="outlined"
                  size="small"
                  style={{ width: 150 }}
                  inputProps={{ min: 1 }}
                />

                <FormControl variant="outlined" size="small" style={{ minWidth: 150 }}>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={stage.messageType}
                    onChange={(e) => updateStage(idx, "messageType", e.target.value)}
                    label="Tipo"
                  >
                    <MenuItem value="text">Texto</MenuItem>
                    <MenuItem value="image">Imagem</MenuItem>
                    <MenuItem value="video">Vídeo</MenuItem>
                    <MenuItem value="audio">Áudio</MenuItem>
                    <MenuItem value="document">Documento</MenuItem>
                    <MenuItem value="buttons">Botões</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={stage.isActive}
                      onChange={(e) => updateStage(idx, "isActive", e.target.checked)}
                      color="primary"
                      size="small"
                    />
                  }
                  label="Ativo"
                />
              </Box>

              {["text", "buttons"].includes(stage.messageType) && (
                <TextField
                  label="Mensagem"
                  value={stage.message}
                  onChange={(e) => updateStage(idx, "message", e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  size="small"
                />
              )}

              {["image", "video", "audio", "document"].includes(stage.messageType) && (
                <Box mt={2} mb={2} p={2} border="1px dashed #ccc" borderRadius={4}>
                  <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Anexo de Mídia</Typography>
                  <Box display="flex" gap={2} alignItems="center">
                    <input 
                      type="file" 
                      accept={
                        stage.messageType === "image" ? "image/*" : 
                        stage.messageType === "video" ? "video/*" : 
                        stage.messageType === "audio" ? "audio/*" : 
                        "*"
                      }
                      onChange={(e) => handleUpload(e, idx, stage.messageType)} 
                    />
                  </Box>
                  {stage.mediaUrl && (
                    <Box mt={2} mb={2}>
                      <Typography variant="caption" color="primary">Arquivo: {stage.mediaUrl.split("-").pop()}</Typography>
                      {stage.messageType === "image" && (
                        <Box mt={1}>
                          <img
                            src={stage.mediaUrl?.startsWith("http") ? stage.mediaUrl : `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "")}${stage.mediaUrl}`}
                            alt="preview"
                            style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}
                  <Box mt={2}>
                    <TextField
                      label="Legenda (opcional)"
                      value={stage.mediaCaption || ""}
                      onChange={(e) => updateStage(idx, "mediaCaption", e.target.value)}
                      fullWidth
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              )}

              {stage.messageType === "buttons" && (
                <Box mt={1}>
                  <Typography variant="caption" color="textSecondary">Botões (máx. 4)</Typography>
                  {(stage.buttons || []).map((btn, btnIdx) => (
                    <Box key={btnIdx} display="flex" gap={1} alignItems="center" mt={1}>
                      <TextField
                        label="Texto"
                        value={btn.displayText}
                        onChange={(e) => updateButton(idx, btnIdx, "displayText", e.target.value)}
                        size="small"
                        variant="outlined"
                        style={{ flex: 2 }}
                      />
                      <FormControl variant="outlined" size="small" style={{ minWidth: 100 }}>
                        <InputLabel>Tipo</InputLabel>
                        <Select
                          value={btn.type}
                          onChange={(e) => updateButton(idx, btnIdx, "type", e.target.value)}
                          label="Tipo"
                        >
                          <MenuItem value="reply">Resposta</MenuItem>
                          <MenuItem value="url">URL</MenuItem>
                          <MenuItem value="call">Ligar</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label={btn.type === "url" ? "URL" : btn.type === "call" ? "Número" : "ID"}
                        value={btn.value}
                        onChange={(e) => updateButton(idx, btnIdx, "value", e.target.value)}
                        size="small"
                        variant="outlined"
                        style={{ flex: 2 }}
                      />
                      <IconButton size="small" onClick={() => removeButton(idx, btnIdx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  {(stage.buttons || []).length < 4 && (
                    <Button size="small" startIcon={<AddIcon />} onClick={() => addButton(idx)} style={{ marginTop: 4 }}>
                      Botão
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const KanbanBoard = ({ campaigns, onEdit, onDrop, onDelete, whatsApps, handleToggle, isAdmin }) => {
  const grouped = {};
  campaigns.forEach(c => {
     const col = c.boardColumn || "Sem Categoria";
     if(!grouped[col]) grouped[col] = [];
     grouped[col].push(c);
  });
  const allCols = Object.keys(grouped);
  if(!allCols.includes("Sem Categoria")) allCols.push("Sem Categoria");

  return (
    <Box display="flex" gap={2} style={{ overflowX: "auto", minHeight: "60vh", paddingBottom: 16 }}>
       {allCols.map(col => (
         <Box 
           key={col} 
           style={{ backgroundColor: "#f4f5f7", borderRadius: 8, padding: 16, minWidth: 320, maxWidth: 320 }}
           onDragOver={(e) => e.preventDefault()}
           onDrop={(e) => {
              const id = e.dataTransfer.getData("campaignId");
              if (id) onDrop(id, col === "Sem Categoria" ? null : col);
           }}
         >
           <Typography variant="subtitle1" style={{ fontWeight: "bold", marginBottom: 16, color: "#5e6c84" }}>
              {col} ({grouped[col]?.length || 0})
           </Typography>
           
           <Box display="flex" flexDirection="column" gap={2}>
             {grouped[col]?.map(c => {
                const wa = whatsApps?.find((w) => w.id === c.whatsappId);
                return (
                  <Paper 
                    key={c.id} 
                    style={{ padding: 16, cursor: "grab", borderLeft: `4px solid ${c.isActive ? "#4caf50" : "#9e9e9e"}` }}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("campaignId", c.id)}
                  >
                     <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                       <Typography variant="subtitle2" style={{ fontWeight: "bold" }}>{c.name}</Typography>
                       <Tooltip title="Editar">
                         <IconButton size="small" onClick={() => onEdit(c)}><EditIcon fontSize="small" /></IconButton>
                       </Tooltip>
                     </Box>
                     <Typography variant="body2" color="textSecondary" style={{ marginBottom: 4 }}>
                       {c.stages?.length || 0} estágio(s)
                     </Typography>
                     <Typography variant="body2" color="textSecondary" style={{ marginBottom: 4 }}>
                       Origem: {c.sourceType === "campaign" ? "Campanha" : "Manual"}
                     </Typography>
                     <Typography variant="body2" color="textSecondary" style={{ marginBottom: 4 }}>
                       Conexão: {wa ? wa.name : "Automático"}
                     </Typography>
                     <Box display="flex" alignItems="center" mt={2} gap={1} justifyContent="space-between">
                       <Box display="flex" alignItems="center" gap={1}>
                         <Switch size="small" checked={!!c.isActive} onChange={() => handleToggle(c)} color="primary" />
                         <Typography variant="caption">{c.isActive ? 'Ativo' : 'Inativo'}</Typography>
                       </Box>
                       {isAdmin && (
                         <Tooltip title="Excluir">
                           <IconButton size="small" onClick={() => onDelete(c.id)}>
                             <DeleteIcon fontSize="small" />
                           </IconButton>
                         </Tooltip>
                       )}
                     </Box>
                  </Paper>
                );
             })}
           </Box>
         </Box>
       ))}
    </Box>
  );
};

const FollowUps = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { whatsApps } = useContext(WhatsAppsContext);

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statsTarget, setStatsTarget] = useState(null);
  const [viewMode, setViewMode] = useState("list");

  const isAdmin = user?.profile === "admin" || user?.profile === "super";

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/follow-up-campaigns");
      setCampaigns(data);
    } catch {
      toast.error("Erro ao carregar follow-ups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCampaigns(); }, []);

  const handleSave = async (form) => {
    try {
      if (editing) {
        await api.put(`/follow-up-campaigns/${editing.id}`, form);
        toast.success("Follow-up atualizado");
      } else {
        await api.post("/follow-up-campaigns", form);
        toast.success("Follow-up criado");
      }
      setModalOpen(false);
      setEditing(null);
      loadCampaigns();
    } catch {
      toast.error("Erro ao salvar follow-up");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remover este follow-up?")) return;
    try {
      await api.delete(`/follow-up-campaigns/${id}`);
      toast.success("Removido");
      loadCampaigns();
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleToggle = async (campaign) => {
    try {
      await api.put(`/follow-up-campaigns/${campaign.id}`, { isActive: !campaign.isActive });
      loadCampaigns();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDragDropColumn = async (id, targetColumn) => {
    try {
      await api.put(`/follow-up-campaigns/${id}`, { boardColumn: targetColumn });
      toast.success("Movido com sucesso");
      loadCampaigns();
    } catch (err) {
       toast.error("Erro ao mover");
    }
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="h5">Follow-ups Automáticos</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant={viewMode === "list" ? "contained" : "outlined"}
            color="primary"
            onClick={() => setViewMode("list")}
          >
            Lista
          </Button>
          <Button
            variant={viewMode === "kanban" ? "contained" : "outlined"}
            color="primary"
            onClick={() => setViewMode("kanban")}
          >
            Kanban
          </Button>
          {isAdmin && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => { setEditing(null); setModalOpen(true); }}
            >
              Novo
            </Button>
          )}
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : viewMode === "kanban" ? (
         <KanbanBoard
           campaigns={campaigns}
           whatsApps={whatsApps}
           onEdit={(c) => { setEditing(c); setModalOpen(true); }}
           onDrop={handleDragDropColumn}
           onDelete={handleDelete}
           handleToggle={handleToggle}
           isAdmin={isAdmin}
         />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Conexão</TableCell>
                <TableCell>Origem</TableCell>
                <TableCell>Estágios</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">Nenhum follow-up criado.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {campaigns.map((c) => {
                const wa = whatsApps?.find((w) => w.id === c.whatsappId);
                return (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{wa ? wa.name : "Automático"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={c.sourceType === "campaign" ? "Campanha" : "Manual"}
                        color={c.sourceType === "campaign" ? "primary" : "default"}
                      />
                    </TableCell>
                    <TableCell>{c.stages?.length || 0} estágio(s)</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={c.isActive ? "Ativo" : "Inativo"}
                        style={{ backgroundColor: c.isActive ? "#4caf50" : "#9e9e9e", color: "#fff" }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Estatísticas">
                        <IconButton size="small" onClick={() => setStatsTarget(c)}>
                          <BarChartIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {isAdmin && (
                        <>
                          <Tooltip title={c.isActive ? "Desativar" : "Ativar"}>
                            <Switch
                              size="small"
                              checked={c.isActive}
                              onChange={() => handleToggle(c)}
                              color="primary"
                            />
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => { setEditing(c); setModalOpen(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton size="small" onClick={() => handleDelete(c.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <FollowUpModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        campaign={editing}
        whatsApps={whatsApps}
      />

      {statsTarget && (
        <StatsDialog
          open={!!statsTarget}
          onClose={() => setStatsTarget(null)}
          campaignId={statsTarget?.id}
          campaignName={statsTarget?.name}
        />
      )}
    </Box>
  );
};

export default FollowUps;
