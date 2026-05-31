import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import SyncIcon from "@material-ui/icons/Sync";
import SaveIcon from "@material-ui/icons/Save";
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
  }
}));

const providerLabels = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  groq: "Groq"
};

const defaultKeys = {
  openai: "",
  gemini: "",
  openrouter: "",
  groq: ""
};

const isSuperAdminUser = user =>
  Boolean(user?.super) || user?.profile === "super" ||
  (user?.profile === "admin" && Number(user?.companyId) === 1);

const GlobalAPISettings = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [settings, setSettings] = useState(null);
  const [keys, setKeys] = useState(defaultKeys);

  const providers = settings?.providers || [];

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getGlobalAiSettings();
        setSettings(data);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (user && !isSuperAdminUser(user)) return <ForbiddenPage />;

  const handleSave = async () => {
    setSaving(true);
    try {
      const providersWithNewKeys = Object.entries(keys)
        .filter(([, value]) => value?.trim())
        .map(([provider]) => provider);

      let data = await updateGlobalAiSettings({ keys });

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
      toast.success("Chaves de API salvas com sucesso.");
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

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography variant="h5" style={{ fontWeight: 700 }}>
          Chaves de API dos Provedores de IA
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Configure as chaves de API e sincronize os modelos de cada provedor.
        </Typography>
      </div>

      {providers.map(provider => (
        <Card key={provider.provider} className={classes.card}>
          <CardContent>
            <div className={classes.providerHeader}>
              <div>
                <Typography variant="h6" style={{ fontWeight: 700 }}>
                  {providerLabels[provider.provider] || provider.provider}
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
                  label={`API key ${providerLabels[provider.provider] || provider.provider}`}
                  value={keys[provider.provider] || ""}
                  onChange={e => setKeys(prev => ({ ...prev, [provider.provider]: e.target.value }))}
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
                  Última sincronização:{" "}
                  {provider.lastSyncAt
                    ? new Date(provider.lastSyncAt).toLocaleString("pt-BR")
                    : "nunca"}
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
                      Sincronize para listar os modelos disponíveis neste provedor.
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
          Salvar chaves de API
        </Button>
      </Box>
    </div>
  );
};

export default GlobalAPISettings;
