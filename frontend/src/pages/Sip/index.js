import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  FormControlLabel,
  Grid,
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

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  paper: {
    borderRadius: 20,
    padding: theme.spacing(4),
    border: "1px solid #dbe7df",
    boxShadow: "0 24px 40px rgba(15, 23, 42, 0.06)",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbf9 100%)",
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
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
    color: "#fff",
  },
  description: {
    color: "#64748b",
    marginBottom: theme.spacing(3),
    maxWidth: 780,
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
    borderRadius: 12,
    textTransform: "none",
    fontWeight: 800,
    minWidth: 220,
    height: 44,
    boxShadow: "none",
    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    color: "#fff",
    "&:hover": {
      boxShadow: "none",
      background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    },
  },
  testBtn: {
    borderRadius: 12,
    textTransform: "none",
    fontWeight: 700,
    height: 44,
  },
  unauthorized: {
    padding: theme.spacing(6),
    textAlign: "center",
  },
}));

const initialState = {
  label: "",
  host: "",
  port: 7443,
  websocketProtocol: "wss",
  wsPath: "",
  sipDomain: "",
  username: "",
  authUser: "",
  password: "",
  displayName: "",
  outboundProxy: "",
  stunServer: "",
  registerOnStartup: true,
  enabled: false,
};

const Sip = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState(initialState);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/sip-settings");
        if (mounted && data) {
          setSettings((previous) => ({
            ...previous,
            ...data,
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

  if (user?.profile !== "admin" && user?.profile !== "super") {
    return (
      <Container maxWidth="sm" className={classes.root}>
        <Paper className={classes.paper}>
          <Box className={classes.unauthorized}>
            <Typography variant="h6" style={{ fontWeight: 800, marginBottom: 8 }}>
              Configuração restrita
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Apenas administradores podem configurar o SIP da empresa.
            </Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setSettings((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : name === "port" ? Number(value) || 0 : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/sip-settings", settings);
      toast.success("Configuração SIP salva com sucesso.");
      setSettings((previous) => ({ ...previous, password: "" }));
    } catch (error) {
      toastError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/sip-settings/test", settings);
      toast.success(data?.message || "Configuração validada.");
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
              Configuração SIP do Webphone
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Administra o registro do softphone embutido usado pela equipe.
            </Typography>
          </div>
        </div>

        <Typography variant="body2" className={classes.description}>
          Essa configuração alimenta o Webphone do Kanban, o mini-webphone dentro do lead e as sequências
          automatizadas de ligação. Apenas administradores conseguem alterar esse cadastro.
        </Typography>

        <form onSubmit={handleSave}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Nome da conexão" name="label" variant="outlined" value={settings.label} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Host SIP" name="host" variant="outlined" value={settings.host} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField fullWidth label="Porta" name="port" type="number" variant="outlined" value={settings.port} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField fullWidth label="WS/WSS" name="websocketProtocol" variant="outlined" value={settings.websocketProtocol} onChange={handleChange} />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Caminho WebSocket" name="wsPath" placeholder="/ws" variant="outlined" value={settings.wsPath} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Domínio SIP" name="sipDomain" variant="outlined" value={settings.sipDomain} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Display Name" name="displayName" variant="outlined" value={settings.displayName} onChange={handleChange} />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Usuário / Ramal" name="username" variant="outlined" value={settings.username} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Authorization User" name="authUser" variant="outlined" value={settings.authUser} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Senha"
                name="password"
                type="password"
                variant="outlined"
                placeholder="Deixe em branco para manter"
                value={settings.password}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Outbound Proxy" name="outboundProxy" variant="outlined" value={settings.outboundProxy} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="STUN Server" name="stunServer" variant="outlined" value={settings.stunServer} onChange={handleChange} />
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" flexWrap="wrap" gridGap={16}>
                <FormControlLabel
                  control={<Switch color="primary" checked={settings.enabled} onChange={handleChange} name="enabled" />}
                  label="Habilitar Webphone SIP"
                />
                <FormControlLabel
                  control={<Switch color="primary" checked={settings.registerOnStartup} onChange={handleChange} name="registerOnStartup" />}
                  label="Registrar automaticamente ao entrar"
                />
              </Box>
            </Grid>
          </Grid>

          <div className={classes.buttonRow}>
            <Button variant="outlined" className={classes.testBtn} onClick={handleTest} disabled={saving || testing}>
              {testing ? <CircularProgress size={18} /> : "Validar configuração"}
            </Button>

            <Button type="submit" className={classes.saveBtn} disabled={saving || testing}>
              {saving ? <CircularProgress size={18} style={{ color: "#fff" }} /> : "Salvar conexão SIP"}
            </Button>
          </div>
        </form>
      </Paper>
    </Container>
  );
};

export default Sip;
