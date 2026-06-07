import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { makeStyles } from "@material-ui/core/styles";
import SaveIcon from "@material-ui/icons/Save";
import EditIcon from "@material-ui/icons/Edit";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import LinkIcon from "@material-ui/icons/Link";
import { toast } from "react-toastify";
import api from "../../services/api";

import { AuthContext } from "../../context/Auth/AuthContext";
import ForbiddenPage from "../../components/ForbiddenPage";
import {
  getGlobalAiSettings,
  updateGlobalAiSettings
} from "../../services/globalAiSettings";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3),
    height: "100%",
    overflow: "auto"
  },
  header: {
    marginBottom: theme.spacing(3)
  },
  card: {
    borderRadius: 8,
    marginBottom: theme.spacing(2)
  },
  promptPreviewField: {
    "& .MuiInputBase-root": { cursor: "pointer" },
    "& .MuiInputBase-input": {
      cursor: "pointer",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis"
    }
  },
  promptDialogContent: {
    paddingTop: theme.spacing(1)
  }
}));

const providerLabels = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  groq: "Groq"
};

const isSuperAdminUser = user =>
  Boolean(user?.super) || user?.profile === "super" ||
  (user?.profile === "admin" && Number(user?.companyId) === 1);

const GlobalAISettings = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState([]);
  const [preferredProvider, setPreferredProvider] = useState("openai");
  const [crmAiSystemPrompt, setCrmAiSystemPrompt] = useState("");
  const [crmAiDefaultModel, setCrmAiDefaultModel] = useState("");

  // Configuração padrão dos Agentes de Atendimento
  const [attendanceAiPrimaryProvider, setAttendanceAiPrimaryProvider] = useState("openai");
  const [attendanceAiPrimaryModel, setAttendanceAiPrimaryModel] = useState("");
  const [attendanceAiFallbackProvider, setAttendanceAiFallbackProvider] = useState("");
  const [attendanceAiFallbackModel, setAttendanceAiFallbackModel] = useState("");
  const [attendanceAiStrategy, setAttendanceAiStrategy] = useState("primary_only");

  // Webhook Geral N8N
  const [globalWebhookEnabled, setGlobalWebhookEnabled] = useState(false);
  const [globalWebhookUrl, setGlobalWebhookUrl] = useState("");
  const [globalWebhookEvents, setGlobalWebhookEvents] = useState(["MESSAGE_RECEIVED", "MESSAGE_SENT"]);
  const [globalWebhookSaving, setGlobalWebhookSaving] = useState(false);
  const [globalWebhookTesting, setGlobalWebhookTesting] = useState(false);

  // Modal de edição do prompt
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [data, webhookData] = await Promise.all([
          getGlobalAiSettings(),
          api.get("/admin/ai/global-webhook").then(r => r.data).catch(() => null),
        ]);
        setProviders(data.providers || []);
        setPreferredProvider(data.preferredProvider || "openai");
        setCrmAiSystemPrompt(data.crmAiSystemPrompt || "");
        setCrmAiDefaultModel(data.crmAiDefaultModel || "");
        setAttendanceAiPrimaryProvider(data.attendanceAiPrimaryProvider || "openai");
        setAttendanceAiPrimaryModel(data.attendanceAiPrimaryModel || "");
        setAttendanceAiFallbackProvider(data.attendanceAiFallbackProvider || "");
        setAttendanceAiFallbackModel(data.attendanceAiFallbackModel || "");
        setAttendanceAiStrategy(data.attendanceAiStrategy || "primary_only");
        if (webhookData) {
          setGlobalWebhookEnabled(!!webhookData.enabled);
          setGlobalWebhookUrl(webhookData.url || "");
          setGlobalWebhookEvents(webhookData.events || ["MESSAGE_RECEIVED", "MESSAGE_SENT"]);
        }
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Modelos disponíveis do provedor selecionado (Assistente CRM)
  const providerModels = useMemo(() => {
    const p = providers.find(item => item.provider === preferredProvider);
    return p?.models || [];
  }, [providers, preferredProvider]);

  // Modelos do provedor principal dos agentes de atendimento
  const attendancePrimaryModels = useMemo(() => {
    const p = providers.find(item => item.provider === attendanceAiPrimaryProvider);
    return p?.models || [];
  }, [providers, attendanceAiPrimaryProvider]);

  // Modelos do provedor de contingência dos agentes de atendimento
  const attendanceFallbackModels = useMemo(() => {
    const p = providers.find(item => item.provider === attendanceAiFallbackProvider);
    return p?.models || [];
  }, [providers, attendanceAiFallbackProvider]);

  if (user && !isSuperAdminUser(user)) return <ForbiddenPage />;

  const handleOpenPromptModal = () => {
    setDraftPrompt(crmAiSystemPrompt);
    setPromptModalOpen(true);
  };

  const handleSavePromptModal = () => {
    setCrmAiSystemPrompt(draftPrompt);
    setPromptModalOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGlobalAiSettings({
        preferredProvider,
        crmAiSystemPrompt,
        crmAiDefaultModel,
        attendanceAiPrimaryProvider,
        attendanceAiPrimaryModel,
        attendanceAiFallbackProvider,
        attendanceAiFallbackModel,
        attendanceAiStrategy,
      });
      toast.success("Configuração de IA salva com sucesso.");
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGlobalWebhook = async () => {
    setGlobalWebhookSaving(true);
    try {
      await api.put("/admin/ai/global-webhook", {
        enabled: globalWebhookEnabled,
        url: globalWebhookUrl,
        events: globalWebhookEvents,
      });
      toast.success("Webhook Geral N8N salvo com sucesso.");
    } catch (err) {
      toastError(err);
    } finally {
      setGlobalWebhookSaving(false);
    }
  };

  const handleTestGlobalWebhook = async () => {
    if (!globalWebhookUrl) {
      toast.error("Informe a URL antes de testar.");
      return;
    }
    setGlobalWebhookTesting(true);
    try {
      const { data } = await api.post("/admin/ai/global-webhook/test", { url: globalWebhookUrl });
      if (data.success) {
        toast.success(`Webhook respondeu com sucesso (status ${data.status}).`);
      } else {
        toast.error(`Webhook falhou: ${data.error || `status ${data.status}`}`);
      }
    } catch (err) {
      toastError(err);
    } finally {
      setGlobalWebhookTesting(false);
    }
  };

  const handleToggleGlobalWebhookEvent = (event) => {
    setGlobalWebhookEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  if (loading) {
    return (
      <Box className={classes.root} display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  const promptPreview = crmAiSystemPrompt
    ? crmAiSystemPrompt.replace(/\n/g, " ").slice(0, 120) + (crmAiSystemPrompt.length > 120 ? "…" : "")
    : "";

  // Objeto de modelo selecionado (para o Autocomplete)
  const selectedModelOption = providerModels.find(m => m.id === crmAiDefaultModel) || null;

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography variant="h5" style={{ fontWeight: 700 }}>
          Configuração de IA
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Provedor, modelo e prompt global usados pelos assistentes do CRM.
        </Typography>
      </div>

      <Card className={classes.card}>
        <CardContent>
          <Grid container spacing={2}>
            {/* Provedor padrão */}
            <Grid item xs={12} md={4}>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Provedor padrão</InputLabel>
                <Select
                  value={preferredProvider}
                  onChange={e => {
                    setPreferredProvider(e.target.value);
                    setCrmAiDefaultModel("");
                  }}
                  label="Provedor padrão"
                >
                  {Object.entries(providerLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Modelo LLM — Autocomplete pelos modelos sincronizados */}
            <Grid item xs={12} md={8}>
              {providerModels.length > 0 ? (
                <Autocomplete
                  options={providerModels}
                  getOptionLabel={option => option.name || option.id || ""}
                  value={selectedModelOption}
                  onChange={(_, newValue) => setCrmAiDefaultModel(newValue?.id || "")}
                  freeSolo={false}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Modelo LLM do Assistente CRM IA"
                      variant="outlined"
                      helperText="Selecione o modelo. Deixe vazio para usar o padrão do provedor."
                    />
                  )}
                />
              ) : (
                <TextField
                  label="Modelo LLM do Assistente CRM IA"
                  value={crmAiDefaultModel}
                  onChange={e => setCrmAiDefaultModel(e.target.value)}
                  variant="outlined"
                  fullWidth
                  placeholder="Ex: gpt-4o-mini"
                  helperText="Nenhum modelo sincronizado. Adicione a chave em APIs e clique em Sincronizar modelos."
                />
              )}
            </Grid>

            {/* Prompt global compacto */}
            <Grid item xs={12}>
              <TextField
                label="Prompt global do Assistente CRM IA"
                value={promptPreview}
                variant="outlined"
                fullWidth
                className={classes.promptPreviewField}
                placeholder="Clique em editar para definir o prompt global."
                helperText={crmAiSystemPrompt
                  ? `${crmAiSystemPrompt.length} caracteres configurados`
                  : "Este prompt é aplicado como base para os assistentes globais do CRM."}
                inputProps={{ readOnly: true }}
                onClick={handleOpenPromptModal}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Editar prompt completo">
                        <IconButton onClick={handleOpenPromptModal} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Configuração padrão dos Agentes de Atendimento */}
      <Card className={classes.card}>
        <CardContent>
          <Typography variant="h6" style={{ fontWeight: 700, marginBottom: 4 }}>
            Configuração padrão dos Agentes de Atendimento
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
            Provedor e modelo usados quando empresas utilizam créditos do sistema nos agentes internos.
            O usuário final não vê estas configurações.
          </Typography>
          <Grid container spacing={2}>
            {/* Provedor principal */}
            <Grid item xs={12} md={3}>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Provedor principal</InputLabel>
                <Select
                  value={attendanceAiPrimaryProvider}
                  onChange={e => { setAttendanceAiPrimaryProvider(e.target.value); setAttendanceAiPrimaryModel(""); }}
                  label="Provedor principal"
                >
                  {Object.entries(providerLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/* Modelo principal */}
            <Grid item xs={12} md={3}>
              {attendancePrimaryModels.length > 0 ? (
                <Autocomplete
                  options={attendancePrimaryModels}
                  getOptionLabel={option => option.name || option.id || ""}
                  value={attendancePrimaryModels.find(m => m.id === attendanceAiPrimaryModel) || null}
                  onChange={(_, v) => setAttendanceAiPrimaryModel(v?.id || "")}
                  freeSolo={false}
                  renderInput={params => (
                    <TextField {...params} label="Modelo principal" variant="outlined" helperText="Modelo principal para agentes." />
                  )}
                />
              ) : (
                <TextField
                  label="Modelo principal"
                  value={attendanceAiPrimaryModel}
                  onChange={e => setAttendanceAiPrimaryModel(e.target.value)}
                  variant="outlined"
                  fullWidth
                  placeholder="Ex: gpt-4o-mini"
                  helperText="Sincronize modelos em APIs para usar a lista."
                />
              )}
            </Grid>
            {/* Provedor de contingência */}
            <Grid item xs={12} md={3}>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Provedor de contingência</InputLabel>
                <Select
                  value={attendanceAiFallbackProvider}
                  onChange={e => { setAttendanceAiFallbackProvider(e.target.value); setAttendanceAiFallbackModel(""); }}
                  label="Provedor de contingência"
                >
                  <MenuItem value=""><em>Nenhum</em></MenuItem>
                  {Object.entries(providerLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/* Modelo de contingência */}
            <Grid item xs={12} md={3}>
              {attendanceAiFallbackProvider && attendanceFallbackModels.length > 0 ? (
                <Autocomplete
                  options={attendanceFallbackModels}
                  getOptionLabel={option => option.name || option.id || ""}
                  value={attendanceFallbackModels.find(m => m.id === attendanceAiFallbackModel) || null}
                  onChange={(_, v) => setAttendanceAiFallbackModel(v?.id || "")}
                  freeSolo={false}
                  renderInput={params => (
                    <TextField {...params} label="Modelo de contingência" variant="outlined" helperText="Opcional." />
                  )}
                />
              ) : (
                <TextField
                  label="Modelo de contingência"
                  value={attendanceAiFallbackModel}
                  onChange={e => setAttendanceAiFallbackModel(e.target.value)}
                  variant="outlined"
                  fullWidth
                  disabled={!attendanceAiFallbackProvider}
                  placeholder="Ex: llama-3.3-70b-versatile"
                  helperText={attendanceAiFallbackProvider ? "Sincronize modelos em APIs ou digite manualmente." : "Selecione um provedor de contingência."}
                />
              )}
            </Grid>
            {/* Estratégia */}
            <Grid item xs={12} md={6}>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Estratégia de execução</InputLabel>
                <Select
                  value={attendanceAiStrategy}
                  onChange={e => setAttendanceAiStrategy(e.target.value)}
                  label="Estratégia de execução"
                >
                  <MenuItem value="primary_only">Usar somente o provedor principal</MenuItem>
                  <MenuItem value="fallback_on_error">Usar contingência em caso de erro do principal</MenuItem>
                  <MenuItem value="randomize">Alternar aleatoriamente entre principal e contingência</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Salvar configuração de IA
        </Button>
      </Box>

      {/* Webhook Geral N8N */}
      <Card className={classes.card} style={{ marginTop: 24 }}>
        <CardContent>
          <Box display="flex" alignItems="center" style={{ gap: 10, marginBottom: 4 }}>
            <LinkIcon style={{ color: "#2563eb" }} />
            <Typography variant="h6" style={{ fontWeight: 700 }}>Webhook Geral N8N</Typography>
          </Box>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 20 }}>
            Recebe eventos de mensagens de <strong>todas as empresas/tenants</strong>. Ideal para manter uma única arquitetura de IA no n8n.
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={globalWebhookEnabled}
                onChange={e => setGlobalWebhookEnabled(e.target.checked)}
                color="primary"
              />
            }
            label="Ativar Webhook Geral"
            style={{ marginBottom: 16 }}
          />

          <TextField
            label="URL do Webhook Geral"
            value={globalWebhookUrl}
            onChange={e => setGlobalWebhookUrl(e.target.value)}
            variant="outlined"
            fullWidth
            placeholder="https://seu-n8n.com/webhook/ia-global"
            disabled={!globalWebhookEnabled}
            style={{ marginBottom: 16 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LinkIcon style={{ fontSize: 18, color: "#94a3b8" }} />
                </InputAdornment>
              )
            }}
          />

          <Typography variant="body2" style={{ fontWeight: 600, marginBottom: 8, color: "#475569" }}>
            Eventos
          </Typography>
          <Box style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            {[
              { key: "MESSAGE_RECEIVED", label: "Mensagem recebida" },
              { key: "MESSAGE_SENT", label: "Mensagem enviada" },
            ].map(({ key, label }) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    checked={globalWebhookEvents.includes(key)}
                    onChange={() => handleToggleGlobalWebhookEvent(key)}
                    color="primary"
                    disabled={!globalWebhookEnabled}
                  />
                }
                label={label}
              />
            ))}
          </Box>

          <Box display="flex" style={{ gap: 12 }}>
            <Button
              variant="outlined"
              startIcon={globalWebhookTesting ? <CircularProgress size={14} /> : <PlayArrowIcon />}
              onClick={handleTestGlobalWebhook}
              disabled={!globalWebhookUrl || globalWebhookTesting}
            >
              Testar Webhook
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={globalWebhookSaving ? <CircularProgress size={14} /> : <SaveIcon />}
              onClick={handleSaveGlobalWebhook}
              disabled={globalWebhookSaving}
            >
              Salvar
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Modal de edição do Prompt */}
      <Dialog open={promptModalOpen} onClose={() => setPromptModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Prompt Global do Assistente CRM IA</DialogTitle>
        <DialogContent className={classes.promptDialogContent}>
          <TextField
            value={draftPrompt}
            onChange={e => setDraftPrompt(e.target.value)}
            variant="outlined"
            multiline
            minRows={18}
            maxRows={32}
            fullWidth
            placeholder="Digite aqui o prompt base do Assistente CRM IA..."
            helperText={`${draftPrompt.length} caracteres`}
            autoFocus
          />
        </DialogContent>
        <DialogActions style={{ padding: "16px 24px" }}>
          <Button onClick={() => setPromptModalOpen(false)} color="default">Cancelar</Button>
          <Button onClick={handleSavePromptModal} variant="contained" color="primary">Aplicar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default GlobalAISettings;
