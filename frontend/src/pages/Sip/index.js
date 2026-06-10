import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Typography,
  makeStyles,
} from "@material-ui/core";
import SettingsInputComponentIcon from "@material-ui/icons/SettingsInputComponent";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const WEBPHONE_DEFAULTS = {
  host: "sip.wapainel.com.br",
  port: 443,
  websocketProtocol: "wss",
  wsPath: "/ws",
  sipDomain: "sip.wapainel.com.br",
  displayName: "AtendZappy",
  stunServer: "stun:stun.l.google.com:19302",
};

const PROVIDER_PRESETS = {
  brfone: {
    label: "BR Fone / SobreIP",
    host: "voz.sobreip.com.br",
    port: 5060,
    transport: "udp",
    domain: "voz.sobreip.com.br",
  },
  sipserver: {
    label: "SIPServer",
    host: "sip1.sipserver.com.br",
    port: 5060,
    transport: "udp",
    domain: "sip1.sipserver.com.br",
  },
  zentrunk: {
    label: "Zentrunk",
    host: "",
    port: 5060,
    transport: "udp",
    domain: "",
  },
  twilio: {
    label: "Twilio SIP",
    host: "",
    port: 5060,
    transport: "tls",
    domain: "",
  },
  custom: {
    label: "Outro / Personalizado",
    host: "",
    port: 5060,
    transport: "udp",
    domain: "",
  },
};

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  paper: {
    borderRadius: 16,
    padding: theme.spacing(4),
    border: "1px solid #dbe7df",
    boxShadow: "0 24px 40px rgba(15, 23, 42, 0.06)",
    background: "#fafafa",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#111827",
    color: "#fff",
  },
  description: {
    color: "#52627a",
    marginBottom: theme.spacing(3),
    maxWidth: 880,
  },
  section: {
    border: "1px solid #dbe7df",
    borderRadius: 8,
    padding: theme.spacing(2),
    backgroundColor: "#fff",
    marginBottom: theme.spacing(2),
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
    },
  },
  sectionTitle: {
    fontWeight: 900,
    color: "#111827",
  },
  sectionText: {
    color: "#52627a",
    marginTop: 4,
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: theme.spacing(1),
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  statusItem: {
    border: "1px solid #dbe7df",
    borderRadius: 8,
    padding: theme.spacing(1.5),
    backgroundColor: "#f8fbf9",
  },
  statusLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  statusValue: {
    color: "#111827",
    fontWeight: 900,
    marginTop: 4,
  },
  buttonRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(2),
    marginTop: theme.spacing(3),
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      alignItems: "stretch",
    },
  },
  saveBtn: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 800,
    minWidth: 220,
    height: 44,
    boxShadow: "none",
    background: "#16a34a",
    color: "#fff",
    "&:hover": {
      boxShadow: "none",
      background: "#15803d",
    },
  },
  testBtn: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 700,
    height: 44,
  },
  unauthorized: {
    padding: theme.spacing(6),
    textAlign: "center",
  },
  didRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto auto",
    gap: theme.spacing(1),
    alignItems: "center",
    marginBottom: theme.spacing(1),
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
}));

const initialState = {
  label: "",
  host: WEBPHONE_DEFAULTS.host,
  port: WEBPHONE_DEFAULTS.port,
  websocketProtocol: WEBPHONE_DEFAULTS.websocketProtocol,
  wsPath: WEBPHONE_DEFAULTS.wsPath,
  sipDomain: WEBPHONE_DEFAULTS.sipDomain,
  username: "",
  authUser: "",
  password: "",
  displayName: WEBPHONE_DEFAULTS.displayName,
  outboundProxy: "",
  stunServer: WEBPHONE_DEFAULTS.stunServer,
  registerOnStartup: true,
  enabled: false,
  metadata: {
    dids: [],
    providerConfig: {
      type: "brfone",
      name: PROVIDER_PRESETS.brfone.label,
      host: PROVIDER_PRESETS.brfone.host,
      port: PROVIDER_PRESETS.brfone.port,
      transport: PROVIDER_PRESETS.brfone.transport,
      domain: PROVIDER_PRESETS.brfone.domain,
      username: "",
      authUser: "",
      mainDid: "",
    },
    routeConfig: {
      inboundTargetType: "user",
      outboundMode: "defaultDid",
    },
  },
};

const getProviderConfig = (metadata = {}) => {
  if (metadata.providerConfig && typeof metadata.providerConfig === "object") {
    return metadata.providerConfig;
  }

  if (metadata.provider && typeof metadata.provider === "object") {
    return metadata.provider;
  }

  const providerType = typeof metadata.provider === "string" ? metadata.provider : "custom";
  const preset = PROVIDER_PRESETS[providerType] || PROVIDER_PRESETS.custom;

  return {
    type: providerType,
    name: preset.label,
    host: metadata.trunkHost || preset.host,
    port: metadata.trunkPort || preset.port,
    transport: metadata.transport || preset.transport,
    domain: metadata.trunkHost || preset.domain,
    username: "",
    authUser: "",
    mainDid: metadata.trunkDid || metadata.defaultDid || "",
  };
};

const Sip = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState(initialState);
  const [newDid, setNewDid] = useState({ label: "", number: "" });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/sip-settings");
        if (mounted && data) {
          const metadata = data.metadata || {};
          const providerConfig = getProviderConfig(metadata);
          setSettings((previous) => ({
            ...previous,
            ...data,
            host: data.host || WEBPHONE_DEFAULTS.host,
            port: data.port || WEBPHONE_DEFAULTS.port,
            websocketProtocol: data.websocketProtocol || WEBPHONE_DEFAULTS.websocketProtocol,
            wsPath: data.wsPath || WEBPHONE_DEFAULTS.wsPath,
            sipDomain: data.sipDomain || WEBPHONE_DEFAULTS.sipDomain,
            displayName: data.displayName || WEBPHONE_DEFAULTS.displayName,
            stunServer: data.stunServer || WEBPHONE_DEFAULTS.stunServer,
            metadata: {
              ...(metadata || {}),
              providerConfig,
              routeConfig: {
                ...(previous.metadata.routeConfig || {}),
                ...(metadata.routeConfig || {}),
              },
              dids: Array.isArray(data.dids) ? data.dids : metadata?.dids || [],
            },
            password: "",
          }));
        }
      } catch (error) {
        toastError(error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const dids = Array.isArray(settings.metadata?.dids) ? settings.metadata.dids : [];
  const providerConfig = getProviderConfig(settings.metadata || {});
  const routeConfig = settings.metadata?.routeConfig || initialState.metadata.routeConfig;

  const defaultDid = useMemo(() => (
    dids.find((did) => did.default) || dids[0] || null
  ), [dids]);

  if (user?.profile !== "admin" && user?.profile !== "super") {
    return (
      <Container maxWidth="sm" className={classes.root}>
        <Paper className={classes.paper}>
          <Box className={classes.unauthorized}>
            <Typography variant="h6" style={{ fontWeight: 800, marginBottom: 8 }}>
              Configuracao restrita
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Apenas administradores podem configurar o SIP da empresa.
            </Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  const updateMetadata = (patch) => {
    setSettings((previous) => ({
      ...previous,
      metadata: {
        ...(previous.metadata || {}),
        ...patch,
      },
    }));
  };

  const updateProvider = (patch) => {
    updateMetadata({
      providerConfig: {
        ...providerConfig,
        ...patch,
      },
    });
  };

  const updateRoute = (patch) => {
    updateMetadata({
      routeConfig: {
        ...routeConfig,
        ...patch,
      },
    });
  };

  const handleProviderTypeChange = (event) => {
    const type = event.target.value;
    const preset = PROVIDER_PRESETS[type] || PROVIDER_PRESETS.custom;
    updateProvider({
      type,
      name: preset.label,
      host: preset.host || providerConfig.host || "",
      port: preset.port,
      transport: preset.transport,
      domain: preset.domain || providerConfig.domain || "",
    });
  };

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setSettings((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : name === "port" ? Number(value) || 0 : value,
    }));
  };

  const setDids = (nextDids) => {
    updateMetadata({ dids: nextDids });
  };

  const handleAddDid = () => {
    const number = String(newDid.number || "").replace(/\D/g, "");
    if (!number) {
      toast.info("Informe o numero DID.");
      return;
    }

    if (dids.some((did) => did.number === number)) {
      toast.info("Este DID ja foi adicionado.");
      return;
    }

    setDids([
      ...dids,
      {
        number,
        label: newDid.label.trim() || number,
        default: dids.length === 0,
      },
    ]);
    setNewDid({ label: "", number: "" });
  };

  const handleRemoveDid = (number) => {
    const nextDids = dids
      .filter((did) => did.number !== number)
      .map((did, index) => ({ ...did, default: index === 0 }));
    setDids(nextDids);
  };

  const handleDefaultDid = (number) => {
    setDids(dids.map((did) => ({ ...did, default: did.number === number })));
  };

  const buildPayload = () => {
    const mainDid = String(providerConfig.mainDid || "").replace(/\D/g, "");
    const nextDids = dids.length || !mainDid
      ? dids
      : [{ label: providerConfig.name || mainDid, number: mainDid, default: true }];

    return {
      ...settings,
      host: settings.host || WEBPHONE_DEFAULTS.host,
      port: Number(settings.port) || WEBPHONE_DEFAULTS.port,
      websocketProtocol: settings.websocketProtocol || WEBPHONE_DEFAULTS.websocketProtocol,
      wsPath: settings.wsPath || WEBPHONE_DEFAULTS.wsPath,
      sipDomain: settings.sipDomain || WEBPHONE_DEFAULTS.sipDomain,
      authUser: settings.authUser || settings.username,
      metadata: {
        ...(settings.metadata || {}),
        providerConfig: {
          ...providerConfig,
          mainDid,
          username: providerConfig.username || settings.username,
          authUser: providerConfig.authUser || providerConfig.username || settings.authUser || settings.username,
        },
        routeConfig,
        dids: nextDids,
      },
    };
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload();
      await api.post("/sip-settings", payload);
      toast.success("Configuracao SIP salva com sucesso.");
      setSettings((previous) => ({
        ...previous,
        metadata: {
          ...(previous.metadata || {}),
          providerConfig: {
            ...providerConfig,
            password: "",
          },
        },
        password: "",
      }));
    } catch (error) {
      toastError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/sip-settings/test", buildPayload());
      toast.success(data?.message || "Configuracao validada.");
    } catch (error) {
      toastError(error);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" className={classes.root}>
      <Paper className={classes.paper}>
        <div className={classes.header}>
          <div className={classes.iconWrap}>
            <SettingsInputComponentIcon />
          </div>
          <div>
            <Typography variant="h5" style={{ fontWeight: 900 }}>
              SIP / Webphone
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Configure o provedor da empresa e mantenha o Webphone conectado ao servidor SIP do WA Painel.
            </Typography>
          </div>
        </div>

        <Typography variant="body2" className={classes.description}>
          O Webphone conecta no servidor SIP do WA Painel. O provedor SIP e usado pelo Asterisk para realizar e receber chamadas.
        </Typography>

        <form onSubmit={handleSave}>
          <Box className={classes.section}>
            <div className={classes.sectionHeader}>
              <div>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Provedor SIP da empresa
                </Typography>
                <Typography variant="body2" className={classes.sectionText}>
                  Dados recebidos da operadora, como BR Fone, SIPServer, Zentrunk ou Twilio SIP.
                </Typography>
              </div>
            </div>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Nome da conexao" name="label" variant="outlined" value={settings.label} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Tipo de provedor" variant="outlined" value={providerConfig.type || "custom"} onChange={handleProviderTypeChange}>
                  {Object.entries(PROVIDER_PRESETS).map(([value, preset]) => (
                    <MenuItem key={value} value={value}>{preset.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="DID principal" variant="outlined" value={providerConfig.mainDid || ""} onChange={(event) => updateProvider({ mainDid: event.target.value.replace(/\D/g, "") })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Host do provedor" variant="outlined" value={providerConfig.host || ""} onChange={(event) => updateProvider({ host: event.target.value })} required />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Porta SIP" type="number" variant="outlined" value={providerConfig.port || 5060} onChange={(event) => updateProvider({ port: Number(event.target.value) || 0 })} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField select fullWidth label="Transporte" variant="outlined" value={providerConfig.transport || "udp"} onChange={(event) => updateProvider({ transport: event.target.value })}>
                  <MenuItem value="udp">UDP</MenuItem>
                  <MenuItem value="tcp">TCP</MenuItem>
                  <MenuItem value="tls">TLS</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Dominio do provedor" variant="outlined" value={providerConfig.domain || ""} onChange={(event) => updateProvider({ domain: event.target.value })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Usuario SIP" variant="outlined" value={providerConfig.username || ""} onChange={(event) => updateProvider({ username: event.target.value })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Authorization User" variant="outlined" value={providerConfig.authUser || ""} onChange={(event) => updateProvider({ authUser: event.target.value })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Senha SIP" type="password" variant="outlined" placeholder="Deixe em branco para manter" value={providerConfig.password || ""} onChange={(event) => updateProvider({ password: event.target.value })} />
              </Grid>
            </Grid>
          </Box>

          <Box className={classes.section}>
            <div className={classes.sectionHeader}>
              <div>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Servidor Webphone
                </Typography>
                <Typography variant="body2" className={classes.sectionText}>
                  O navegador registra no Asterisk do WA Painel. Estes campos ficam prontos para o SaaS multiempresa.
                </Typography>
              </div>
            </div>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Host WSS" name="host" variant="outlined" value={settings.host} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Porta WSS" name="port" type="number" variant="outlined" value={settings.port} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField select fullWidth label="Protocolo" name="websocketProtocol" variant="outlined" value={settings.websocketProtocol} onChange={handleChange}>
                  <MenuItem value="wss">WSS</MenuItem>
                  <MenuItem value="ws">WS</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Caminho WebSocket" name="wsPath" placeholder="/ws" variant="outlined" value={settings.wsPath} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Dominio SIP interno" name="sipDomain" variant="outlined" value={settings.sipDomain} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Display Name" name="displayName" variant="outlined" value={settings.displayName} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="STUN Server" name="stunServer" variant="outlined" value={settings.stunServer} onChange={handleChange} />
              </Grid>
            </Grid>
          </Box>

          <Box className={classes.section}>
            <div className={classes.sectionHeader}>
              <div>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Numeros / DIDs
                </Typography>
                <Typography variant="body2" className={classes.sectionText}>
                  Os DIDs ficam vinculados a empresa e sao sincronizados para a tabela de roteamento.
                </Typography>
              </div>
            </div>

            {dids.map((did) => (
              <div className={classes.didRow} key={did.number}>
                <TextField
                  label="Nome do DID"
                  variant="outlined"
                  size="small"
                  value={did.label || ""}
                  onChange={(event) =>
                    setDids(dids.map((item) => item.number === did.number ? { ...item, label: event.target.value } : item))
                  }
                />
                <TextField
                  label="Numero DID"
                  variant="outlined"
                  size="small"
                  value={did.number}
                  onChange={(event) => {
                    const nextNumber = event.target.value.replace(/\D/g, "");
                    setDids(dids.map((item) => item.number === did.number ? { ...item, number: nextNumber } : item));
                  }}
                />
                <Button variant={did.default ? "contained" : "outlined"} color="primary" onClick={() => handleDefaultDid(did.number)}>
                  {did.default ? "Padrao" : "Usar padrao"}
                </Button>
                <Button variant="outlined" color="secondary" onClick={() => handleRemoveDid(did.number)}>
                  Remover
                </Button>
              </div>
            ))}

            <div className={classes.didRow}>
              <TextField label="Nome do DID" variant="outlined" size="small" value={newDid.label} onChange={(event) => setNewDid((previous) => ({ ...previous, label: event.target.value }))} />
              <TextField label="Numero DID" variant="outlined" size="small" value={newDid.number} onChange={(event) => setNewDid((previous) => ({ ...previous, number: event.target.value }))} placeholder="Ex: 1231970516" />
              <Button variant="outlined" color="primary" onClick={handleAddDid}>
                Adicionar DID
              </Button>
            </div>
          </Box>

          <Box className={classes.section}>
            <div className={classes.sectionHeader}>
              <div>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Ramais da equipe
                </Typography>
                <Typography variant="body2" className={classes.sectionText}>
                  O ramal visual pode repetir em empresas diferentes; o isolamento interno usa companyId.
                </Typography>
              </div>
            </div>

            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Ramal do usuario" name="username" variant="outlined" value={settings.username} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Auth User do ramal" name="authUser" variant="outlined" value={settings.authUser} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Senha do ramal" name="password" type="password" variant="outlined" placeholder="Deixe em branco para manter" value={settings.password} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="DID padrao do ramal" variant="outlined" value={defaultDid?.number || providerConfig.mainDid || ""} disabled />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" flexWrap="wrap" gridGap={16}>
                  <FormControlLabel control={<Switch color="primary" checked={settings.enabled} onChange={handleChange} name="enabled" />} label="Habilitar Webphone SIP" />
                  <FormControlLabel control={<Switch color="primary" checked={settings.registerOnStartup} onChange={handleChange} name="registerOnStartup" />} label="Registrar automaticamente ao entrar" />
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box className={classes.section}>
            <div className={classes.sectionHeader}>
              <div>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Rotas
                </Typography>
                <Typography variant="body2" className={classes.sectionText}>
                  Preparacao para o Asterisk rotear entrada e saida por empresa sem expor dialplan ao usuario.
                </Typography>
              </div>
            </div>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField select fullWidth label="Entrada: quando receber chamada no DID" variant="outlined" value={routeConfig.inboundTargetType || "user"} onChange={(event) => updateRoute({ inboundTargetType: event.target.value })}>
                  <MenuItem value="user">Tocar para usuario</MenuItem>
                  <MenuItem value="queue">Tocar para fila/equipe</MenuItem>
                  <MenuItem value="extension">Tocar para ramal</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField select fullWidth label="Saida: chamadas saintes" variant="outlined" value={routeConfig.outboundMode || "defaultDid"} onChange={(event) => updateRoute({ outboundMode: event.target.value })}>
                  <MenuItem value="defaultDid">Usar DID padrao</MenuItem>
                  <MenuItem value="localDdd">Preferir DID por DDD</MenuItem>
                  <MenuItem value="userBinding">Usar DID vinculado ao usuario</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>

          <Box className={classes.section}>
            <div className={classes.sectionHeader}>
              <div>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  Status / Testes
                </Typography>
                <Typography variant="body2" className={classes.sectionText}>
                  Esta etapa prepara os dados. A geracao/reload do Asterisk sera feita em fase controlada.
                </Typography>
              </div>
            </div>

            <div className={classes.statusGrid}>
              <div className={classes.statusItem}>
                <div className={classes.statusLabel}>Configuracao</div>
                <div className={classes.statusValue}>{settings.enabled ? "Salva e ativa" : "Desativada"}</div>
              </div>
              <div className={classes.statusItem}>
                <div className={classes.statusLabel}>DID cadastrado</div>
                <div className={classes.statusValue}>{defaultDid?.number || "Pendente"}</div>
              </div>
              <div className={classes.statusItem}>
                <div className={classes.statusLabel}>Webphone</div>
                <div className={classes.statusValue}>{settings.host ? "Pronto para runtime" : "Pendente"}</div>
              </div>
              <div className={classes.statusItem}>
                <div className={classes.statusLabel}>Asterisk</div>
                <div className={classes.statusValue}>Aguardando geracao</div>
              </div>
            </div>
          </Box>

          <Divider />

          <div className={classes.buttonRow}>
            <Button variant="outlined" className={classes.testBtn} onClick={handleTest} disabled={saving || testing}>
              {testing ? <CircularProgress size={18} /> : "Validar configuracao"}
            </Button>

            <Button type="submit" className={classes.saveBtn} disabled={saving || testing}>
              {saving ? <CircularProgress size={18} style={{ color: "#fff" }} /> : "Salvar conexao SIP"}
            </Button>
          </div>
        </form>
      </Paper>
    </Container>
  );
};

export default Sip;
