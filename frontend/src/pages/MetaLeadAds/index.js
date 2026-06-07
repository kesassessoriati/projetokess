import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import LinkIcon from "@material-ui/icons/Link";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 960,
    margin: "0 auto"
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3)
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "linear-gradient(135deg, #1877F2 0%, #0D65D9 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  card: {
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2)
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2)
  },
  instructionBox: {
    background: theme.palette.type === "dark" ? "rgba(24,119,242,0.08)" : "#EFF6FF",
    borderRadius: 8,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderLeft: "4px solid #1877F2"
  },
  instructionStep: {
    display: "flex",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    fontSize: 13
  },
  stepNumber: {
    color: "#1877F2",
    fontWeight: 700,
    minWidth: 18
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".5px",
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1.5)
  },
  webhookBox: {
    background: theme.palette.type === "dark" ? "rgba(52,168,83,0.08)" : "#F0FFF4",
    borderRadius: 8,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    borderLeft: "4px solid #34A853",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  statusChip: {
    fontWeight: 600,
    fontSize: 11
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(3),
    color: theme.palette.text.secondary,
    fontSize: 13
  },
  fieldRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("xs")]: { gridTemplateColumns: "1fr" }
  }
}));

const STATUS_LABELS = {
  received: { label: "Recebido", color: "#FFF8E1", textColor: "#E65100" },
  processing: { label: "Processando", color: "#E3F2FD", textColor: "#1565C0" },
  processed: { label: "Processado", color: "#E8F5E9", textColor: "#2E7D32" },
  duplicate: { label: "Duplicado", color: "#F3E5F5", textColor: "#6A1B9A" },
  error: { label: "Erro", color: "#FFEBEE", textColor: "#C62828" }
};

const EMPTY_FORM = {
  pageId: "",
  pageName: "",
  formId: "",
  formName: "",
  accessToken: "",
  pipelineId: "",
  stageId: "",
  defaultTagName: "Meta Ads",
  isActive: true
};

const MetaLeadAdsPage = () => {
  const classes = useStyles();
  const history = useHistory();
  const [loading, setLoading] = useState(true);

  const [integrations, setIntegrations] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [pipelines, setPipelines] = useState([]);
  const [availableStages, setAvailableStages] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [simDialogOpen, setSimDialogOpen] = useState(false);
  const [simIntegrationId, setSimIntegrationId] = useState("");
  const [simName, setSimName] = useState("");
  const [simPhone, setSimPhone] = useState("");
  const [simEmail, setSimEmail] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  const loadAll = useCallback(async () => {
    try {
      const [intRes, pipRes] = await Promise.all([
        api.get("/meta-lead-ads/integrations"),
        api.get("/pipelines")
      ]);
      setIntegrations(intRes.data || []);
      setPipelines(pipRes.data || []);
      if (intRes.data?.[0]?.webhookUrl) setWebhookUrl(intRes.data[0].webhookUrl);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const { data } = await api.get("/meta-lead-ads/leads?limit=30");
      setLeads(data.rows || []);
      setLeadsTotal(data.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadAll(), loadLeads()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (form.pipelineId) {
      const pipeline = pipelines.find(p => String(p.id) === String(form.pipelineId));
      setAvailableStages(pipeline?.stages || []);
    } else {
      setAvailableStages([]);
    }
  }, [form.pipelineId, pipelines]);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTokenVisible(false);
    setDialogOpen(true);
  };

  const openEdit = (integration) => {
    setEditingId(integration.id);
    setForm({
      pageId: integration.pageId || "",
      pageName: integration.pageName || "",
      formId: integration.formId || "",
      formName: integration.formName || "",
      accessToken: integration.accessToken || "",
      pipelineId: integration.pipelineId ? String(integration.pipelineId) : "",
      stageId: integration.stageId ? String(integration.stageId) : "",
      defaultTagName: integration.defaultTagName || "Meta Ads",
      isActive: integration.isActive !== false
    });
    setTokenVisible(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.pageId || !form.accessToken) {
      toast.warn("Page ID e Access Token são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        pipelineId: form.pipelineId || null,
        stageId: form.stageId || null
      };
      if (editingId) {
        await api.put(`/meta-lead-ads/integrations/${editingId}`, payload);
        toast.success("Integração atualizada!");
      } else {
        const { data } = await api.post("/meta-lead-ads/integrations", payload);
        setWebhookUrl(data.webhookUrl || "");
        toast.success("Integração criada! Copie o Verify Token para configurar na Meta.");
      }
      setDialogOpen(false);
      loadAll();
    } catch (err) {
      toast.error("Erro ao salvar integração.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remover esta integração?")) return;
    try {
      await api.delete(`/meta-lead-ads/integrations/${id}`);
      toast.success("Integração removida.");
      loadAll();
    } catch {
      toast.error("Erro ao remover integração.");
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.info("Copiado!"));
  };

  const handleSimulate = async () => {
    if (!simIntegrationId) {
      toast.warn("Selecione uma integração.");
      return;
    }
    setSimLoading(true);
    try {
      const { data } = await api.post("/meta-lead-ads/simulate", {
        integrationId: simIntegrationId,
        name: simName || "Lead Teste",
        phone: simPhone || undefined,
        email: simEmail || undefined
      });
      toast.success(data.message || "Simulação disparada com sucesso!");
      setSimDialogOpen(false);
      setTimeout(loadLeads, 1500);
    } catch {
      toast.error("Erro ao simular lead.");
    } finally {
      setSimLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      {/* Header */}
      <Box className={classes.header}>
        <IconButton size="small" onClick={() => history.goBack()}>
          <ArrowBackIcon />
        </IconButton>
        <Box className={classes.providerIcon}>
          <Typography style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>f</Typography>
        </Box>
        <Box>
          <Typography variant="caption" style={{ color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>
            CAPTAÇÃO DE LEADS
          </Typography>
          <Typography variant="h5" style={{ fontWeight: 700 }}>Meta Lead Ads</Typography>
          <Typography variant="body2" color="textSecondary">
            Receba leads de formulários do Facebook e Instagram diretamente no CRM.
          </Typography>
        </Box>
        <Box ml="auto">
          <Button
            variant="outlined"
            startIcon={<PlayArrowIcon />}
            onClick={() => setSimDialogOpen(true)}
            style={{ marginRight: 8, borderColor: "#1877F2", color: "#1877F2" }}
            disabled={integrations.length === 0}
          >
            Simular Lead
          </Button>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openCreate}>
            Nova Integração
          </Button>
        </Box>
      </Box>

      {/* Instruções */}
      <Card className={classes.card} elevation={0}>
        <CardContent>
          <Box className={classes.instructionBox}>
            <Typography style={{ fontWeight: 700, fontSize: 13, color: "#1877F2", marginBottom: 8 }}>
              Como configurar
            </Typography>
            {[
              "Crie ou acesse um Formulário de Lead no Meta Business Suite (facebook.com/ads/manager).",
              "Vá em Configurações → Webhooks → Assinaturas de Página e adicione o URL do webhook abaixo.",
              "Cole o Verify Token exibido ao criar a integração no campo de verificação da Meta.",
              "Marque o evento 'leadgen' para receber notificações de novos leads.",
              "Configure o Page ID, o Form ID (opcional) e o funil de destino.",
              "Quando alguém preencher o formulário, o lead chegará automaticamente ao CRM."
            ].map((step, i) => (
              <Box key={i} className={classes.instructionStep}>
                <span className={classes.stepNumber}>{i + 1}.</span>
                <span>{step}</span>
              </Box>
            ))}
          </Box>

          {webhookUrl && (
            <Box className={classes.webhookBox}>
              <LinkIcon style={{ color: "#34A853", fontSize: 18 }} />
              <Typography variant="body2" style={{ fontWeight: 600, flexShrink: 0 }}>
                URL do Webhook:
              </Typography>
              <Typography variant="body2" style={{ fontFamily: "monospace", wordBreak: "break-all", flex: 1 }}>
                {webhookUrl}
              </Typography>
              <IconButton size="small" onClick={() => handleCopy(webhookUrl)}>
                <FileCopyIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Lista de integrações */}
      <Card className={classes.card} elevation={0}>
        <CardContent>
          <Box className={classes.cardHeader}>
            <Box>
              <Typography style={{ fontWeight: 700 }}>Integrações Configuradas</Typography>
              <Typography variant="body2" color="textSecondary">
                Cada integração mapeia uma página/formulário da Meta para um funil do CRM.
              </Typography>
            </Box>
          </Box>

          {integrations.length === 0 ? (
            <Box className={classes.emptyState}>
              Nenhuma integração configurada. Clique em "Nova Integração" para começar.
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" style={{ borderRadius: 8 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Página / Formulário</TableCell>
                    <TableCell>Page ID</TableCell>
                    <TableCell>Funil / Etapa</TableCell>
                    <TableCell>Etiqueta</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {integrations.map((intg) => (
                    <TableRow key={intg.id}>
                      <TableCell style={{ fontSize: 12 }}>
                        <Typography variant="body2" style={{ fontWeight: 600 }}>
                          {intg.pageName || intg.pageId}
                        </Typography>
                        {intg.formName && (
                          <Typography variant="caption" color="textSecondary">
                            {intg.formName}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell style={{ fontSize: 11, fontFamily: "monospace" }}>
                        {intg.pageId}
                      </TableCell>
                      <TableCell style={{ fontSize: 12 }}>
                        {intg.pipeline?.name || "—"}
                        {intg.stage?.name && ` / ${intg.stage.name}`}
                      </TableCell>
                      <TableCell>
                        {intg.defaultTagName && (
                          <Chip label={intg.defaultTagName} size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={intg.isActive ? "Ativo" : "Inativo"}
                          style={{
                            fontSize: 11,
                            backgroundColor: intg.isActive ? "#E8F5E9" : "#FAFAFA",
                            color: intg.isActive ? "#2E7D32" : "#757575"
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => openEdit(intg)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remover">
                          <IconButton size="small" onClick={() => handleDelete(intg.id)}>
                            <DeleteIcon fontSize="small" style={{ color: "#f44336" }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Histórico de leads recebidos */}
      <Card className={classes.card} elevation={0}>
        <CardContent>
          <Box className={classes.cardHeader}>
            <Box>
              <Typography style={{ fontWeight: 700 }}>
                Leads Recebidos
                {leadsTotal > 0 && (
                  <Chip
                    label={leadsTotal}
                    size="small"
                    style={{ marginLeft: 8, fontSize: 11 }}
                  />
                )}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Histórico de leads recebidos via webhook da Meta.
              </Typography>
            </Box>
            <Button size="small" onClick={loadLeads} disabled={leadsLoading}>
              Atualizar
            </Button>
          </Box>

          {leadsLoading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          ) : leads.length === 0 ? (
            <Box className={classes.emptyState}>
              Nenhum lead recebido ainda. Configure a integração e teste com o botão "Simular Lead".
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" style={{ borderRadius: 8 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data/Hora</TableCell>
                    <TableCell>Nome</TableCell>
                    <TableCell>Telefone</TableCell>
                    <TableCell>E-mail</TableCell>
                    <TableCell>Formulário</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leads.map((lead) => {
                    const s = STATUS_LABELS[lead.status] || STATUS_LABELS.received;
                    return (
                      <TableRow key={lead.id}>
                        <TableCell style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                          {new Date(lead.createdAt).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell style={{ fontSize: 12 }}>
                          {lead.leadName || "—"}
                        </TableCell>
                        <TableCell style={{ fontSize: 12 }}>
                          {lead.leadPhone || "—"}
                        </TableCell>
                        <TableCell style={{ fontSize: 12 }}>
                          {lead.leadEmail || "—"}
                        </TableCell>
                        <TableCell style={{ fontSize: 11, color: "#666" }}>
                          {lead.integration?.formName || lead.formId || "—"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={s.label}
                            icon={
                              lead.status === "processed" ? (
                                <CheckCircleIcon style={{ fontSize: 12 }} />
                              ) : lead.status === "error" ? (
                                <ErrorIcon style={{ fontSize: 12 }} />
                              ) : null
                            }
                            style={{
                              fontSize: 11,
                              backgroundColor: s.color,
                              color: s.textColor
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog criar/editar integração */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? "Editar Integração" : "Nova Integração Meta Lead Ads"}</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" style={{ gap: 16 }}>
            <Box className={classes.fieldRow}>
              <TextField
                label="Page ID *"
                placeholder="123456789012345"
                variant="outlined"
                size="small"
                fullWidth
                value={form.pageId}
                onChange={(e) => setField("pageId", e.target.value)}
              />
              <TextField
                label="Nome da Página"
                placeholder="Minha Empresa"
                variant="outlined"
                size="small"
                fullWidth
                value={form.pageName}
                onChange={(e) => setField("pageName", e.target.value)}
              />
            </Box>

            <Box className={classes.fieldRow}>
              <TextField
                label="Form ID (opcional)"
                placeholder="Deixe em branco para qualquer formulário"
                variant="outlined"
                size="small"
                fullWidth
                value={form.formId}
                onChange={(e) => setField("formId", e.target.value)}
              />
              <TextField
                label="Nome do Formulário"
                placeholder="Formulário de Contato"
                variant="outlined"
                size="small"
                fullWidth
                value={form.formName}
                onChange={(e) => setField("formName", e.target.value)}
              />
            </Box>

            <TextField
              label="Page Access Token *"
              placeholder="EAAxxxxxxxxxxxx..."
              variant="outlined"
              size="small"
              fullWidth
              type={tokenVisible ? "text" : "password"}
              value={form.accessToken}
              onChange={(e) => setField("accessToken", e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setTokenVisible(!tokenVisible)}>
                      {tokenVisible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Divider />

            <Typography className={classes.sectionTitle}>Funil de Destino</Typography>

            <Box className={classes.fieldRow}>
              <FormControl variant="outlined" size="small" fullWidth>
                <InputLabel>Funil (Quadro)</InputLabel>
                <Select
                  value={form.pipelineId}
                  onChange={(e) => setField("pipelineId", e.target.value)}
                  label="Funil (Quadro)"
                >
                  <MenuItem value=""><em>Selecione</em></MenuItem>
                  {pipelines.map(p => (
                    <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl variant="outlined" size="small" fullWidth>
                <InputLabel>Etapa Inicial</InputLabel>
                <Select
                  value={form.stageId}
                  onChange={(e) => setField("stageId", e.target.value)}
                  label="Etapa Inicial"
                  disabled={!form.pipelineId}
                >
                  <MenuItem value=""><em>Selecione</em></MenuItem>
                  {availableStages.map(s => (
                    <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Etiqueta / Origem padrão"
              placeholder="Meta Ads"
              variant="outlined"
              size="small"
              fullWidth
              value={form.defaultTagName}
              onChange={(e) => setField("defaultTagName", e.target.value)}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => setField("isActive", e.target.checked)}
                  color="primary"
                />
              }
              label={form.isActive ? "Ativo" : "Inativo"}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {editingId ? "Salvar" : "Criar Integração"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog simulação de lead */}
      <Dialog open={simDialogOpen} onClose={() => setSimDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Simular Lead</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" style={{ gap: 16, paddingTop: 4 }}>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Integração</InputLabel>
              <Select
                value={simIntegrationId}
                onChange={(e) => setSimIntegrationId(e.target.value)}
                label="Integração"
              >
                <MenuItem value=""><em>Selecione</em></MenuItem>
                {integrations.map(i => (
                  <MenuItem key={i.id} value={i.id}>
                    {i.pageName || i.pageId}
                    {i.formName ? ` — ${i.formName}` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Nome do lead"
              variant="outlined"
              size="small"
              fullWidth
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
            />
            <TextField
              label="Telefone (ex: 5511999999999)"
              variant="outlined"
              size="small"
              fullWidth
              value={simPhone}
              onChange={(e) => setSimPhone(e.target.value)}
            />
            <TextField
              label="E-mail"
              variant="outlined"
              size="small"
              fullWidth
              value={simEmail}
              onChange={(e) => setSimEmail(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSimDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleSimulate}
            variant="contained"
            color="primary"
            disabled={simLoading}
            startIcon={simLoading ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />}
          >
            Simular
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MetaLeadAdsPage;
