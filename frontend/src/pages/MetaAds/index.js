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
  InputAdornment
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import api from "../../services/api";

const META_EVENTS = [
  "Lead", "Contact", "Schedule", "SubmitApplication",
  "CompleteRegistration", "Purchase", "InitiateCheckout",
  "AddToCart", "ViewContent", "Subscribe", "CustomizeProduct",
  "Custom"
];

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 900,
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
    flexShrink: 0,
    "& svg": { color: "#fff", fontSize: 28 }
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
  mappingRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 40px",
    gap: theme.spacing(1.5),
    alignItems: "center",
    marginBottom: theme.spacing(1)
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
  testBtn: {
    borderColor: "#1877F2",
    color: "#1877F2"
  }
}));

const MetaAdsPage = () => {
  const classes = useStyles();
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [active, setActive] = useState(false);
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [tokenVisible, setTokenVisible] = useState(false);

  const [pipelines, setPipelines] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // New mapping form
  const [newPipelineId, setNewPipelineId] = useState("");
  const [newStageId, setNewStageId] = useState("");
  const [newEventName, setNewEventName] = useState("Lead");
  const [newCustomEventName, setNewCustomEventName] = useState("");
  const [availableStages, setAvailableStages] = useState([]);

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await api.get("/ad-tracking/meta/config");
      if (data.found) {
        setActive(data.active || false);
        setPixelId(data.credentials?.pixelId || "");
        setAccessToken(data.credentials?.accessToken || "");
      }
    } catch (err) {
      console.error(err);
      setHasError(true);
    }
  }, []);

  const loadMappings = useCallback(async () => {
    try {
      const { data } = await api.get("/ad-tracking/meta/mappings");
      setMappings(data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadPipelines = useCallback(async () => {
    try {
      const { data } = await api.get("/pipelines");
      setPipelines(data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const { data } = await api.get("/ad-tracking/meta/events?limit=30");
      setEvents(data.rows || []);
    } catch (err) {
      console.error(err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadConfig(), loadMappings(), loadPipelines(), loadEvents()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (newPipelineId) {
      const pipeline = pipelines.find(p => String(p.id) === String(newPipelineId));
      setAvailableStages(pipeline?.stages || []);
      setNewStageId("");
    }
  }, [newPipelineId, pipelines]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/ad-tracking/meta/config", {
        active,
        credentials: {
          pixelId,
          ...(accessToken && !accessToken.includes("...") ? { accessToken } : {})
        }
      });
      toast.success("Integração Meta Ads salva com sucesso!");
      loadConfig();
    } catch (err) {
      toast.error("Erro ao salvar configuração.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/ad-tracking/meta/test");
      if (data.ok) {
        toast.success(data.message || "Conexão testada com sucesso!");
      } else {
        toast.error(data.message || "Falha na conexão.");
      }
    } catch (err) {
      toast.error("Erro ao testar conexão.");
    } finally {
      setTesting(false);
    }
  };

  const handleAddMapping = async () => {
    if (!newPipelineId || !newStageId || !newEventName) {
      toast.warn("Selecione o funil, a etapa e o evento.");
      return;
    }
    const finalEvent = newEventName === "Custom" ? (newCustomEventName || "Custom") : newEventName;
    try {
      await api.post("/ad-tracking/meta/mappings", {
        pipelineId: newPipelineId,
        stageId: newStageId,
        eventName: finalEvent,
        customEventName: newEventName === "Custom" ? newCustomEventName : null
      });
      toast.success("Mapeamento adicionado!");
      setNewPipelineId("");
      setNewStageId("");
      setNewEventName("Lead");
      setNewCustomEventName("");
      loadMappings();
    } catch (err) {
      toast.error("Erro ao adicionar mapeamento.");
    }
  };

  const handleDeleteMapping = async (id) => {
    try {
      await api.delete(`/ad-tracking/meta/mappings/${id}`);
      toast.success("Mapeamento removido.");
      loadMappings();
    } catch (err) {
      toast.error("Erro ao remover mapeamento.");
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.info("Copiado!"));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (hasError) {
    return (
      <Box p={3}>
        <Typography color="error">
          Erro ao carregar configuração. Verifique o console ou tente atualizar a página.
        </Typography>
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
        <Box
          className={classes.providerIcon}
          style={{ background: "linear-gradient(135deg, #1877F2 0%, #0D65D9 100%)" }}
        >
          <Typography style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>f</Typography>
        </Box>
        <Box>
          <Typography variant="caption" style={{ color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>
            CONVERSÕES
          </Typography>
          <Typography variant="h5" style={{ fontWeight: 700 }}>Meta Ads</Typography>
          <Typography variant="body2" color="textSecondary">
            Dispare eventos no Pixel da Meta quando o lead mudar de etapa no CRM.
          </Typography>
        </Box>
      </Box>

      {/* Card principal */}
      <Card className={classes.card} elevation={0}>
        <CardContent>
          <Box className={classes.cardHeader}>
            <Box>
              <Typography style={{ fontWeight: 700 }}>Meta Ads (Conversions API)</Typography>
              <Typography variant="body2" color="textSecondary">
                Dispare eventos de conversão ao mover leads no CRM
              </Typography>
            </Box>
            <FormControlLabel
              control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} color="primary" />}
              label={active ? "Ativo" : "Inativo"}
            />
          </Box>

          {/* Como configurar */}
          <Box className={classes.instructionBox}>
            <Typography style={{ fontWeight: 700, fontSize: 13, color: "#1877F2", marginBottom: 8 }}>
              Como configurar
            </Typography>
            {[
              "Acesse o Gerenciador de Eventos da Meta e selecione seu Pixel.",
              "Copie o Pixel ID encontrado nas configurações do Pixel.",
              "Gere um Access Token em Configurações → Conversions API → Gerar Token.",
              "Cole o Pixel ID e o Access Token nos campos abaixo.",
              "Configure os mapeamentos de conversão: escolha o funil, a etapa e o evento.",
              "Ative e salve a integração."
            ].map((step, i) => (
              <Box key={i} className={classes.instructionStep}>
                <span className={classes.stepNumber}>{i + 1}.</span>
                <span>{step}</span>
              </Box>
            ))}
          </Box>

          {/* Credenciais */}
          <Typography className={classes.sectionTitle}>Credenciais</Typography>
          <Box display="flex" flexDirection="column" style={{ gap: 16, marginBottom: 16 }}>
            <TextField
              label="Pixel ID"
              placeholder="123456789012345"
              variant="outlined"
              size="small"
              fullWidth
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
            />
            <TextField
              label="Access Token (Conversions API)"
              placeholder="EAAxxxxxxxxxxxxxxx..."
              variant="outlined"
              size="small"
              fullWidth
              type={tokenVisible ? "text" : "password"}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setTokenVisible(!tokenVisible)}>
                      {tokenVisible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                    {accessToken && (
                      <IconButton size="small" onClick={() => handleCopy(accessToken)}>
                        <FileCopyIcon fontSize="small" />
                      </IconButton>
                    )}
                  </InputAdornment>
                )
              }}
            />
          </Box>

          <Box display="flex" gap={1} style={{ gap: 8 }}>
            <Button
              variant="outlined"
              className={classes.testBtn}
              onClick={handleTest}
              disabled={testing || !pixelId}
              startIcon={testing ? <CircularProgress size={14} /> : null}
            >
              Testar Conexão
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Mapeamento */}
      <Card className={classes.card} elevation={0}>
        <CardContent>
          <Box className={classes.cardHeader}>
            <Box>
              <Typography style={{ fontWeight: 700 }}>Mapeamento de Conversões</Typography>
              <Typography variant="body2" color="textSecondary">
                Defina qual evento de conversão será disparado quando um lead for movido para uma coluna específica do CRM.
              </Typography>
            </Box>
          </Box>

          {/* Form nova linha */}
          <Box className={classes.mappingRow}>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Funil (Quadro)</InputLabel>
              <Select value={newPipelineId} onChange={(e) => setNewPipelineId(e.target.value)} label="Funil (Quadro)">
                <MenuItem value=""><em>Selecione</em></MenuItem>
                {pipelines.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Coluna (Etapa)</InputLabel>
              <Select value={newStageId} onChange={(e) => setNewStageId(e.target.value)} label="Coluna (Etapa)" disabled={!newPipelineId}>
                <MenuItem value=""><em>Selecione</em></MenuItem>
                {availableStages.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Evento de Conversão</InputLabel>
              <Select value={newEventName} onChange={(e) => setNewEventName(e.target.value)} label="Evento de Conversão">
                {META_EVENTS.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
              </Select>
            </FormControl>
            <IconButton size="small" onClick={handleAddMapping} color="primary">
              <AddIcon />
            </IconButton>
          </Box>

          {newEventName === "Custom" && (
            <Box mb={1}>
              <TextField
                label="Nome do evento customizado"
                variant="outlined"
                size="small"
                value={newCustomEventName}
                onChange={(e) => setNewCustomEventName(e.target.value)}
                style={{ width: 280 }}
              />
            </Box>
          )}

          {!pixelId && (
            <Box style={{ display: "flex", alignItems: "center", gap: 6, color: "#999", fontSize: 12, marginTop: 8 }}>
              <ErrorIcon style={{ fontSize: 14 }} />
              Preencha o Pixel ID e Access Token para ativar a integração.
            </Box>
          )}

          <Divider style={{ margin: "12px 0" }} />

          {/* Lista de mapeamentos existentes */}
          {mappings.length === 0 ? (
            <Box className={classes.emptyState}>Nenhum mapeamento configurado.</Box>
          ) : (
            mappings.map((m) => (
              <Box key={m.id} className={classes.mappingRow} style={{ padding: "4px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <Typography variant="body2">{m.pipeline?.name || `Pipeline ${m.pipelineId}`}</Typography>
                <Typography variant="body2">{m.stage?.name || `Etapa ${m.stageId}`}</Typography>
                <Chip label={m.eventName} size="small" variant="outlined" className={classes.statusChip} />
                <IconButton size="small" onClick={() => handleDeleteMapping(m.id)}>
                  <DeleteIcon fontSize="small" style={{ color: "#f44336" }} />
                </IconButton>
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      {/* Últimos disparos */}
      <Card className={classes.card} elevation={0}>
        <CardContent>
          <Typography style={{ fontWeight: 700, marginBottom: 12 }}>Últimos Disparos</Typography>
          {eventsLoading ? (
            <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24} /></Box>
          ) : events.length === 0 ? (
            <Box className={classes.emptyState}>
              Nenhum evento registrado ainda. Mova um lead no CRM para testar.
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" style={{ borderRadius: 8 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data/Hora</TableCell>
                    <TableCell>Lead</TableCell>
                    <TableCell>Funil</TableCell>
                    <TableCell>Etapa</TableCell>
                    <TableCell>Evento</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell style={{ fontSize: 12 }}>
                        {new Date(e.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell style={{ fontSize: 12 }}>{e.leadId || "-"}</TableCell>
                      <TableCell style={{ fontSize: 12 }}>{e.pipelineId || "-"}</TableCell>
                      <TableCell style={{ fontSize: 12 }}>{e.stageId || "-"}</TableCell>
                      <TableCell style={{ fontSize: 12 }}>{e.eventName}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={e.status}
                          icon={e.status === "success" ? <CheckCircleIcon style={{ fontSize: 12 }} /> : e.status === "failed" ? <ErrorIcon style={{ fontSize: 12 }} /> : null}
                          style={{
                            fontSize: 11,
                            backgroundColor: e.status === "success" ? "#E8F5E9" : e.status === "failed" ? "#FFEBEE" : "#FFF8E1",
                            color: e.status === "success" ? "#2E7D32" : e.status === "failed" ? "#C62828" : "#E65100"
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Botão salvar */}
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Salvar Integração
        </Button>
      </Box>
    </Box>
  );
};

export default MetaAdsPage;
