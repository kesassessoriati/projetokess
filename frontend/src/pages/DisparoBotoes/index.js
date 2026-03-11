import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  makeStyles,
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import SendIcon from "@material-ui/icons/Send";
import EditIcon from "@material-ui/icons/Edit";
import CancelIcon from "@material-ui/icons/Cancel";
import SmartButtonIcon from "@mui/icons-material/SmartButton";
import ListAltIcon from "@material-ui/icons/ListAlt";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import { toast } from "react-toastify";
import api from "../../services/api";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "calc(100vh - 64px)",
    background: "radial-gradient(circle at top left, #eff6ff 0%, #e5eeff 42%, #dde8ff 100%)",
    padding: 14,
    overflow: "auto"
  },
  header: {
    borderRadius: 16,
    border: "1px solid #c7d7f5",
    background: "#ffffffeb",
    boxShadow: "0 10px 24px rgba(16,24,40,0.07)",
    padding: "14px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14
  },
  titleRow: { display: "flex", alignItems: "center", gap: 12 },
  titleIcon: {
    width: 44, height: 44, borderRadius: 10,
    background: "#dde8ff", color: "#2563eb",
    display: "inline-flex", alignItems: "center", justifyContent: "center"
  },
  title: { fontSize: "1.05rem", fontWeight: 800, color: "#1e3a8a" },
  subtitle: { fontSize: ".75rem", color: "#5d7a9b" },
  primaryBtn: {
    textTransform: "none", borderRadius: 10,
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff", fontWeight: 700
  },
  card: {
    borderRadius: 14, border: "1px solid #c7d7f5",
    background: "#fff", padding: "14px 18px",
    marginBottom: 10, boxShadow: "0 2px 8px rgba(37,99,235,0.06)"
  },
  campaignName: { fontSize: "1rem", fontWeight: 700, color: "#1e3a8a" },
  statusChip: { fontSize: ".7rem", fontWeight: 700, borderRadius: 8 },
  progressBar: { borderRadius: 4, height: 6 },
  sectionTitle: { fontSize: ".85rem", fontWeight: 700, color: "#374151", marginBottom: 6, marginTop: 14 },
  btnRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  btnChip: {
    border: "1px solid #c7d7f5", borderRadius: 8,
    padding: "4px 10px", fontSize: ".78rem", color: "#1e3a8a",
    background: "#eff6ff"
  },
  formLabel: { fontSize: ".82rem", fontWeight: 600, color: "#374151", marginBottom: 3 },
  addBtnRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 6 },
  emptyState: {
    textAlign: "center", padding: 48, color: "#6b7280"
  }
}));

const STATUS_COLORS = {
  DRAFT: { bg: "#f3f4f6", color: "#374151" },
  SENDING: { bg: "#dbeafe", color: "#1d4ed8" },
  COMPLETED: { bg: "#d1fae5", color: "#065f46" },
  FAILED: { bg: "#fee2e2", color: "#991b1b" },
  CANCELLED: { bg: "#f3f4f6", color: "#6b7280" }
};

const STATUS_LABELS = {
  DRAFT: "Rascunho",
  SENDING: "Enviando...",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
  CANCELLED: "Cancelada"
};

const BUTTON_TYPES = [
  { value: "reply", label: "Resposta rápida" },
  { value: "url", label: "Link / URL" },
  { value: "call", label: "Ligação" }
];

const DEFAULT_BUTTON = { displayText: "", type: "reply", value: "" };
const DEFAULT_ROW = { title: "", rowId: "", description: "" };
const DEFAULT_SECTION = { title: "Opções", rows: [{ ...DEFAULT_ROW }] };

export default function DisparoBotoes() {
  const classes = useStyles();
  const { whatsApps } = useContext(WhatsAppsContext);

  const [campaigns, setCampaigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    whatsappId: "",
    messageType: "buttons",
    message: "",
    footer: "",
    intervalSeconds: 3,
    targetNumbers: "",
    buttons: [{ ...DEFAULT_BUTTON }],
    listSections: [{ ...DEFAULT_SECTION, rows: [{ ...DEFAULT_ROW }] }],
    listButtonText: "Ver opções"
  });

  // Filtra conexões que suportam botões/listas (Whaileys e WhatsMeow)
  const whaileysConnections = (whatsApps || []).filter(
    w => (w.channel === "whatsapp_whaileys" || w.channel === "whatsapp_whatsmeow") && w.status === "CONNECTED"
  );

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/button-campaigns?limit=50");
      setCampaigns(data.rows || []);
      setTotal(data.count || 0);
    } catch (err) {
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // Auto-refresh para campanhas em envio
  useEffect(() => {
    const sending = campaigns.some(c => c.status === "SENDING");
    if (!sending) return;
    const timer = setInterval(fetchCampaigns, 4000);
    return () => clearInterval(timer);
  }, [campaigns, fetchCampaigns]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      whatsappId: whaileysConnections[0]?.id || "",
      messageType: "buttons",
      message: "",
      footer: "",
      intervalSeconds: 3,
      targetNumbers: "",
      buttons: [{ ...DEFAULT_BUTTON }],
      listSections: [{ title: "Opções", rows: [{ title: "", rowId: "op1", description: "" }] }],
      listButtonText: "Ver opções"
    });
    setDialogOpen(true);
  };

  const openEdit = (campaign) => {
    setEditingId(campaign.id);
    const targets = Array.isArray(campaign.targetNumbers)
      ? campaign.targetNumbers.join("\n")
      : "";
    setForm({
      name: campaign.name || "",
      whatsappId: campaign.whatsappId || "",
      messageType: campaign.messageType || "buttons",
      message: campaign.message || "",
      footer: campaign.footer || "",
      intervalSeconds: campaign.intervalSeconds || 3,
      targetNumbers: targets,
      buttons: campaign.buttons?.length ? campaign.buttons : [{ ...DEFAULT_BUTTON }],
      listSections: campaign.listSections?.length ? campaign.listSections : [DEFAULT_SECTION],
      listButtonText: campaign.listButtonText || "Ver opções"
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome da campanha");
    if (!form.whatsappId) return toast.error("Selecione uma conexão WhatsApp");
    if (!form.message.trim()) return toast.error("Informe a mensagem");

    const numbers = form.targetNumbers
      .split(/[\n,;]+/)
      .map(n => n.trim())
      .filter(Boolean);
    if (!numbers.length) return toast.error("Informe ao menos um número");

    if (form.messageType === "buttons" && !form.buttons.some(b => b.displayText.trim())) {
      return toast.error("Adicione ao menos um botão");
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        whatsappId: form.whatsappId,
        messageType: form.messageType,
        message: form.message,
        footer: form.footer,
        intervalSeconds: Number(form.intervalSeconds),
        targetNumbers: numbers,
        buttons: form.messageType === "buttons" ? form.buttons.filter(b => b.displayText.trim()) : [],
        listSections: form.messageType === "list" ? form.listSections : [],
        listButtonText: form.listButtonText
      };

      if (editingId) {
        await api.put(`/button-campaigns/${editingId}`, payload);
        toast.success("Campanha atualizada!");
      } else {
        await api.post("/button-campaigns", payload);
        toast.success("Campanha criada!");
      }
      setDialogOpen(false);
      fetchCampaigns();
    } catch (err) {
      toast.error("Erro ao salvar campanha");
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (campaign) => {
    try {
      await api.post(`/button-campaigns/${campaign.id}/start`);
      toast.success("Campanha iniciada!");
      fetchCampaigns();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao iniciar campanha");
    }
  };

  const handleCancel = async (campaign) => {
    try {
      await api.post(`/button-campaigns/${campaign.id}/cancel`);
      toast.info("Campanha cancelada");
      fetchCampaigns();
    } catch (err) {
      toast.error("Erro ao cancelar campanha");
    }
  };

  const handleDelete = async (campaign) => {
    if (!window.confirm(`Excluir campanha "${campaign.name}"?`)) return;
    try {
      await api.delete(`/button-campaigns/${campaign.id}`);
      toast.success("Campanha removida");
      fetchCampaigns();
    } catch (err) {
      toast.error("Erro ao remover campanha");
    }
  };

  // ── Botões helpers ──────────────────────────────────
  const addButton = () => {
    if (form.buttons.length >= 4) return toast.warning("Máximo de 4 botões por mensagem");
    setForm(f => ({ ...f, buttons: [...f.buttons, { ...DEFAULT_BUTTON }] }));
  };

  const removeButton = (idx) => {
    setForm(f => ({ ...f, buttons: f.buttons.filter((_, i) => i !== idx) }));
  };

  const updateButton = (idx, field, value) => {
    setForm(f => {
      const btns = [...f.buttons];
      btns[idx] = { ...btns[idx], [field]: value };
      return { ...f, buttons: btns };
    });
  };

  // ── Lista helpers ──────────────────────────────────
  const addSection = () => {
    setForm(f => ({
      ...f,
      listSections: [...f.listSections, { title: "Seção", rows: [{ title: "", rowId: `op_${Date.now()}`, description: "" }] }]
    }));
  };

  const removeSection = (si) => {
    setForm(f => ({ ...f, listSections: f.listSections.filter((_, i) => i !== si) }));
  };

  const updateSection = (si, field, value) => {
    setForm(f => {
      const secs = [...f.listSections];
      secs[si] = { ...secs[si], [field]: value };
      return { ...f, listSections: secs };
    });
  };

  const addRow = (si) => {
    setForm(f => {
      const secs = [...f.listSections];
      secs[si] = { ...secs[si], rows: [...secs[si].rows, { title: "", rowId: `op_${Date.now()}`, description: "" }] };
      return { ...f, listSections: secs };
    });
  };

  const removeRow = (si, ri) => {
    setForm(f => {
      const secs = [...f.listSections];
      secs[si] = { ...secs[si], rows: secs[si].rows.filter((_, i) => i !== ri) };
      return { ...f, listSections: secs };
    });
  };

  const updateRow = (si, ri, field, value) => {
    setForm(f => {
      const secs = [...f.listSections];
      const rows = [...secs[si].rows];
      rows[ri] = { ...rows[ri], [field]: value };
      secs[si] = { ...secs[si], rows };
      return { ...f, listSections: secs };
    });
  };

  const getProgress = (c) => {
    if (!c.totalTargets) return 0;
    return Math.round((c.processedTargets / c.totalTargets) * 100);
  };

  return (
    <Box className={classes.root}>
      {/* Header */}
      <Paper className={classes.header} elevation={0}>
        <div className={classes.titleRow}>
          <div className={classes.titleIcon}>
            <SmartButtonIcon />
          </div>
          <div>
            <Typography className={classes.title}>Disparo de Botões</Typography>
            <Typography className={classes.subtitle}>
              Envie mensagens interativas com botões ou listas via WhatsApp (Whaileys / WhatsMeow)
            </Typography>
          </div>
        </div>
        <Button
          variant="contained"
          className={classes.primaryBtn}
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          Nova Campanha
        </Button>
      </Paper>

      {/* Lista de campanhas */}
      {loading && campaigns.length === 0 ? (
        <Box textAlign="center" p={4}><CircularProgress /></Box>
      ) : campaigns.length === 0 ? (
        <Paper className={classes.card} elevation={0}>
          <div className={classes.emptyState}>
            <SmartButtonIcon style={{ fontSize: 48, opacity: 0.3 }} />
            <Typography>Nenhuma campanha criada ainda.</Typography>
            <Button onClick={openCreate} className={classes.primaryBtn} variant="contained" style={{ marginTop: 12 }}>
              Criar primeira campanha
            </Button>
          </div>
        </Paper>
      ) : (
        campaigns.map(campaign => {
          const statusStyle = STATUS_COLORS[campaign.status] || STATUS_COLORS.DRAFT;
          const progress = getProgress(campaign);
          return (
            <Paper key={campaign.id} className={classes.card} elevation={0}>
              <Grid container alignItems="flex-start" spacing={1}>
                <Grid item xs>
                  <Box display="flex" alignItems="center" gap={8} mb={0.5}>
                    <Typography className={classes.campaignName}>{campaign.name}</Typography>
                    <Chip
                      label={STATUS_LABELS[campaign.status] || campaign.status}
                      size="small"
                      className={classes.statusChip}
                      style={{ background: statusStyle.bg, color: statusStyle.color, marginLeft: 8 }}
                    />
                    <Chip
                      icon={campaign.messageType === "list" ? <ListAltIcon style={{ fontSize: 14 }} /> : <SmartButtonIcon style={{ fontSize: 14 }} />}
                      label={campaign.messageType === "list" ? "Lista" : "Botões"}
                      size="small"
                      variant="outlined"
                      style={{ marginLeft: 4, fontSize: ".7rem" }}
                    />
                  </Box>

                  <Typography variant="caption" style={{ color: "#6b7280" }}>
                    {campaign.whatsapp?.name || `Conexão #${campaign.whatsappId}`} &nbsp;•&nbsp;
                    {campaign.totalTargets} número{campaign.totalTargets !== 1 ? "s" : ""} &nbsp;•&nbsp;
                    {campaign.intervalSeconds}s intervalo
                  </Typography>

                  {campaign.status === "SENDING" && (
                    <Box mt={1}>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        className={classes.progressBar}
                      />
                      <Typography variant="caption" style={{ color: "#1d4ed8" }}>
                        {campaign.processedTargets}/{campaign.totalTargets} enviados &nbsp;•&nbsp;
                        {campaign.successCount} ok &nbsp;•&nbsp; {campaign.failedCount} falhas
                      </Typography>
                    </Box>
                  )}

                  {campaign.status === "COMPLETED" && (
                    <Typography variant="caption" style={{ color: "#065f46" }}>
                      Concluída: {campaign.successCount} enviados, {campaign.failedCount} falhas
                    </Typography>
                  )}

                  {campaign.message && (
                    <Box mt={0.5}>
                      <Typography variant="caption" style={{ color: "#374151", display: "block" }}>
                        {campaign.message.length > 120 ? campaign.message.slice(0, 120) + "…" : campaign.message}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                <Grid item>
                  <Box display="flex" gap={4}>
                    {(campaign.status === "DRAFT" || campaign.status === "COMPLETED" || campaign.status === "FAILED" || campaign.status === "CANCELLED") && (
                      <>
                        <Tooltip title="Iniciar envio">
                          <IconButton size="small" onClick={() => handleStart(campaign)} style={{ color: "#2563eb" }}>
                            <PlayArrowIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => openEdit(campaign)} style={{ color: "#6b7280" }}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton size="small" onClick={() => handleDelete(campaign)} style={{ color: "#dc2626" }}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {campaign.status === "SENDING" && (
                      <Tooltip title="Cancelar">
                        <IconButton size="small" onClick={() => handleCancel(campaign)} style={{ color: "#dc2626" }}>
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          );
        })
      )}

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? "Editar Campanha" : "Nova Campanha de Botões"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Nome */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome da campanha"
                fullWidth
                variant="outlined"
                size="small"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>

            {/* Conexão */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Conexão WhatsApp</InputLabel>
                <Select
                  value={form.whatsappId}
                  onChange={e => setForm(f => ({ ...f, whatsappId: e.target.value }))}
                  label="Conexão WhatsApp"
                >
                  {whaileysConnections.length === 0 && (
                    <MenuItem value="" disabled>Nenhuma conexão Whaileys/WhatsMeow conectada</MenuItem>
                  )}
                  {whaileysConnections.map(w => (
                    <MenuItem key={w.id} value={w.id}>{w.name} ({w.number})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Tipo de mensagem */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Tipo de mensagem</InputLabel>
                <Select
                  value={form.messageType}
                  onChange={e => setForm(f => ({ ...f, messageType: e.target.value }))}
                  label="Tipo de mensagem"
                >
                  <MenuItem value="buttons">Botões de ação</MenuItem>
                  <MenuItem value="list">Lista de opções</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Intervalo */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Intervalo entre envios (segundos)"
                type="number"
                fullWidth
                variant="outlined"
                size="small"
                inputProps={{ min: 1, max: 60 }}
                value={form.intervalSeconds}
                onChange={e => setForm(f => ({ ...f, intervalSeconds: e.target.value }))}
              />
            </Grid>

            {/* Mensagem */}
            <Grid item xs={12}>
              <TextField
                label="Mensagem"
                fullWidth
                variant="outlined"
                size="small"
                multiline
                rows={3}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              />
            </Grid>

            {/* Rodapé */}
            <Grid item xs={12}>
              <TextField
                label="Rodapé (opcional)"
                fullWidth
                variant="outlined"
                size="small"
                value={form.footer}
                onChange={e => setForm(f => ({ ...f, footer: e.target.value }))}
              />
            </Grid>

            {/* Botões */}
            {form.messageType === "buttons" && (
              <Grid item xs={12}>
                <Divider style={{ marginBottom: 8 }} />
                <Typography className={classes.sectionTitle}>Botões (máx. 4)</Typography>
                {form.buttons.map((btn, idx) => (
                  <Box key={idx} display="flex" gap={8} alignItems="center" mb={1}>
                    <TextField
                      label="Texto do botão"
                      size="small"
                      variant="outlined"
                      style={{ flex: 2 }}
                      value={btn.displayText}
                      onChange={e => updateButton(idx, "displayText", e.target.value)}
                    />
                    <FormControl size="small" variant="outlined" style={{ minWidth: 140 }}>
                      <InputLabel>Tipo</InputLabel>
                      <Select
                        value={btn.type}
                        onChange={e => updateButton(idx, "type", e.target.value)}
                        label="Tipo"
                      >
                        {BUTTON_TYPES.map(t => (
                          <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {btn.type !== "reply" && (
                      <TextField
                        label={btn.type === "url" ? "URL" : "Telefone"}
                        size="small"
                        variant="outlined"
                        style={{ flex: 2 }}
                        value={btn.value}
                        onChange={e => updateButton(idx, "value", e.target.value)}
                      />
                    )}
                    <IconButton size="small" onClick={() => removeButton(idx)} style={{ color: "#dc2626" }}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addButton}
                  disabled={form.buttons.length >= 4}
                  style={{ marginTop: 4 }}
                >
                  Adicionar botão
                </Button>
              </Grid>
            )}

            {/* Lista */}
            {form.messageType === "list" && (
              <Grid item xs={12}>
                <Divider style={{ marginBottom: 8 }} />
                <Grid container spacing={1} style={{ marginBottom: 8 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Texto do botão da lista"
                      size="small"
                      fullWidth
                      variant="outlined"
                      value={form.listButtonText}
                      onChange={e => setForm(f => ({ ...f, listButtonText: e.target.value }))}
                    />
                  </Grid>
                </Grid>
                <Typography className={classes.sectionTitle}>Seções da lista</Typography>
                {form.listSections.map((section, si) => (
                  <Paper key={si} variant="outlined" style={{ padding: 10, marginBottom: 10, borderRadius: 8 }}>
                    <Box display="flex" alignItems="center" gap={8} mb={1}>
                      <TextField
                        label="Título da seção"
                        size="small"
                        variant="outlined"
                        style={{ flex: 1 }}
                        value={section.title}
                        onChange={e => updateSection(si, "title", e.target.value)}
                      />
                      <IconButton size="small" onClick={() => removeSection(si)} style={{ color: "#dc2626" }}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    {section.rows.map((row, ri) => (
                      <Box key={ri} display="flex" gap={8} alignItems="center" mb={0.5} ml={1}>
                        <TextField
                          label="Título"
                          size="small"
                          variant="outlined"
                          style={{ flex: 2 }}
                          value={row.title}
                          onChange={e => updateRow(si, ri, "title", e.target.value)}
                        />
                        <TextField
                          label="ID"
                          size="small"
                          variant="outlined"
                          style={{ flex: 1 }}
                          value={row.rowId}
                          onChange={e => updateRow(si, ri, "rowId", e.target.value)}
                        />
                        <TextField
                          label="Descrição"
                          size="small"
                          variant="outlined"
                          style={{ flex: 2 }}
                          value={row.description}
                          onChange={e => updateRow(si, ri, "description", e.target.value)}
                        />
                        <IconButton size="small" onClick={() => removeRow(si, ri)} style={{ color: "#dc2626" }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ))}
                    <Button size="small" startIcon={<AddIcon />} onClick={() => addRow(si)} style={{ marginLeft: 8 }}>
                      Adicionar opção
                    </Button>
                  </Paper>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={addSection}>
                  Adicionar seção
                </Button>
              </Grid>
            )}

            {/* Números */}
            <Grid item xs={12}>
              <Divider style={{ marginBottom: 8 }} />
              <Typography className={classes.sectionTitle}>
                Números de destino (um por linha, ou separados por vírgula/ponto e vírgula)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                variant="outlined"
                size="small"
                placeholder={"5511999999999\n5521888888888\n5531777777777"}
                value={form.targetNumbers}
                onChange={e => setForm(f => ({ ...f, targetNumbers: e.target.value }))}
                helperText={`${form.targetNumbers.split(/[\n,;]+/).filter(n => n.trim()).length} número(s) informado(s)`}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            className={classes.primaryBtn}
            startIcon={saving ? <CircularProgress size={16} /> : <SendIcon />}
            disabled={saving}
          >
            {editingId ? "Salvar" : "Criar campanha"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
