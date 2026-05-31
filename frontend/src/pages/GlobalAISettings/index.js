import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import SyncIcon from "@material-ui/icons/Sync";
import SaveIcon from "@material-ui/icons/Save";
import EditIcon from "@material-ui/icons/Edit";
import { toast } from "react-toastify";

import { AuthContext } from "../../context/Auth/AuthContext";
import ForbiddenPage from "../../components/ForbiddenPage";
import {
  getGlobalAiSettings,
  syncGlobalAiModels,
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
  providerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  modelList: {
    maxHeight: 180,
    overflow: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: theme.spacing(1),
    background: "#fafafa"
  },
  modelChip: {
    margin: 4
  },
  promptPreviewField: {
    "& .MuiInputBase-root": {
      cursor: "pointer"
    },
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
  openrouter: "OpenRouter"
};

const defaultKeys = {
  openai: "",
  gemini: "",
  openrouter: ""
};

const isSuperAdminUser = user => {
  return Boolean(user?.super) || user?.profile === "super" || (user?.profile === "admin" && Number(user?.companyId) === 1);
};

const GlobalAISettings = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [settings, setSettings] = useState(null);
  const [preferredProvider, setPreferredProvider] = useState("openai");
  const [crmAiSystemPrompt, setCrmAiSystemPrompt] = useState("");
  const [crmAiDefaultModel, setCrmAiDefaultModel] = useState("");
  const [keys, setKeys] = useState(defaultKeys);

  // Modal de edição do prompt
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");

  const providers = useMemo(() => settings?.providers || [], [settings]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getGlobalAiSettings();
        setSettings(data);
        setPreferredProvider(data.preferredProvider || "openai");
        setCrmAiSystemPrompt(data.crmAiSystemPrompt || "");
        setCrmAiDefaultModel(data.crmAiDefaultModel || "");
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (user && !isSuperAdminUser(user)) {
    return <ForbiddenPage />;
  }

  const handleOpenPromptModal = () => {
    setDraftPrompt(crmAiSystemPrompt);
    setPromptModalOpen(true);
  };

  const handleSavePromptModal = () => {
    setCrmAiSystemPrompt(draftPrompt);
    setPromptModalOpen(false);
  };

  const handleCancelPromptModal = () => {
    setPromptModalOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let data = await updateGlobalAiSettings({
        preferredProvider,
        crmAiSystemPrompt,
        crmAiDefaultModel,
        keys
      });
      const providersWithNewKeys = Object.entries(keys)
        .filter(([, value]) => value?.trim())
        .map(([provider]) => provider);

      if (providersWithNewKeys.length) {
        const syncResults = await Promise.all(
          providersWithNewKeys.map(provider => syncGlobalAiModels(provider, keys[provider]))
        );

        data = {
          ...data,
          providers: data.providers.map(providerConfig => {
            const syncResult = syncResults.find(item => item.provider === providerConfig.provider);
            return syncResult
              ? { ...providerConfig, models: syncResult.models, lastSyncAt: syncResult.lastSyncAt, hasApiKey: true }
              : providerConfig;
          })
        };
      }
      setSettings(data);
      setKeys(defaultKeys);
      toast.success("Configuração global de IA salva com sucesso.");
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async provider => {
    setSyncing(prev => ({ ...prev, [provider]: true }));
    try {
      const result = await syncGlobalAiModels(provider, keys[provider]);
      setSettings(prev => ({
        ...prev,
        providers: (prev?.providers || []).map(item =>
          item.provider === provider
            ? { ...item, models: result.models, lastSyncAt: result.lastSyncAt, hasApiKey: item.hasApiKey || Boolean(keys[provider]) }
            : item
        )
      }));
      toast.success(`${providerLabels[provider]} sincronizado: ${result.models.length} modelo(s).`);
    } catch (err) {
      toastError(err);
    } finally {
      setSyncing(prev => ({ ...prev, [provider]: false }));
    }
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

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography variant="h5" style={{ fontWeight: 700 }}>
          Configuração Global de IA
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Chaves e modelos usados pelos agentes premium do CRM. Empresas consomem créditos conforme o plano.
        </Typography>
      </div>

      <Card className={classes.card}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl variant="outlined" fullWidth>
                <InputLabel>Provedor padrão</InputLabel>
                <Select
                  value={preferredProvider}
                  onChange={event => setPreferredProvider(event.target.value)}
                  label="Provedor padrão"
                >
                  {Object.entries(providerLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                label="Modelo LLM do Assistente CRM IA"
                value={crmAiDefaultModel}
                onChange={event => setCrmAiDefaultModel(event.target.value)}
                variant="outlined"
                fullWidth
                placeholder="Ex: openai/gpt-4o-mini ou deepseek/deepseek-chat"
                helperText="Modelo usado pelo Assistente CRM IA. Deixe vazio para usar o padrão do provedor."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Prompt global do Assistente CRM IA"
                value={promptPreview}
                variant="outlined"
                fullWidth
                className={classes.promptPreviewField}
                placeholder="Nenhum prompt global configurado. Clique em editar para definir."
                helperText={crmAiSystemPrompt ? `${crmAiSystemPrompt.length} caracteres configurados` : "Este prompt é aplicado como base para os assistentes globais do CRM."}
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

      {providers.map(provider => (
        <Card key={provider.provider} className={classes.card}>
          <CardContent>
            <div className={classes.providerHeader}>
              <div>
                <Typography variant="h6" style={{ fontWeight: 700 }}>
                  {providerLabels[provider.provider]}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {provider.hasApiKey
                    ? `Chave salva: ${provider.maskedApiKey}`
                    : "Nenhuma chave global salva para este provedor."}
                </Typography>
              </div>
              <Chip
                label={`${provider.models?.length || 0} modelo(s)`}
                color={provider.models?.length ? "primary" : "default"}
                size="small"
              />
            </div>

            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  label={`API key ${providerLabels[provider.provider]}`}
                  value={keys[provider.provider] || ""}
                  onChange={event => setKeys(prev => ({ ...prev, [provider.provider]: event.target.value }))}
                  type={showKeys[provider.provider] ? "text" : "password"}
                  variant="outlined"
                  fullWidth
                  placeholder={provider.maskedApiKey || "Cole uma nova chave para salvar ou sincronizar"}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowKeys(prev => ({ ...prev, [provider.provider]: !prev[provider.provider] }))}>
                          {showKeys[provider.provider] ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Box display="flex" height="100%" alignItems="center" style={{ gap: 8 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={syncing[provider.provider] ? <CircularProgress size={16} /> : <SyncIcon />}
                    onClick={() => handleSync(provider.provider)}
                    disabled={Boolean(syncing[provider.provider]) || (!provider.hasApiKey && !keys[provider.provider])}
                  >
                    Sincronizar modelos
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">
                  Última sincronização: {provider.lastSyncAt ? new Date(provider.lastSyncAt).toLocaleString("pt-BR") : "nunca"}
                </Typography>
                <div className={classes.modelList}>
                  {(provider.models || []).slice(0, 80).map(model => (
                    <Chip
                      key={model.id}
                      label={model.name || model.id}
                      size="small"
                      className={classes.modelChip}
                    />
                  ))}
                  {!provider.models?.length && (
                    <Typography variant="body2" color="textSecondary">
                      Sincronize para listar os modelos disponíveis neste servidor.
                    </Typography>
                  )}
                </div>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}

      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Salvar configuração global
        </Button>
      </Box>

      {/* Modal de edição do Prompt Global */}
      <Dialog
        open={promptModalOpen}
        onClose={handleCancelPromptModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Editar Prompt Global do Assistente CRM IA</DialogTitle>
        <DialogContent className={classes.promptDialogContent}>
          <TextField
            value={draftPrompt}
            onChange={event => setDraftPrompt(event.target.value)}
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
          <Button onClick={handleCancelPromptModal} color="default">
            Cancelar
          </Button>
          <Button onClick={handleSavePromptModal} variant="contained" color="primary">
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default GlobalAISettings;
