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
  Accordion,
  AccordionSummary,
  AccordionDetails
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
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import TrackChangesIcon from "@material-ui/icons/TrackChanges";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import api from "../../services/api";

const GOOGLE_EVENTS = [
  "LEAD", "PURCHASE", "SIGN_UP", "CONTACT",
  "BOOK_APPOINTMENT", "SUBMIT_LEAD_FORM",
  "SUBSCRIBE_PAID", "ADD_TO_CART", "BEGIN_CHECKOUT", "PAGE_VIEW", "custom"
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
    background: "linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC04 75%, #EA4335 100%)",
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
    background: theme.palette.type === "dark" ? "rgba(66,133,244,0.08)" : "#F0F7FF",
    borderRadius: 8,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderLeft: "4px solid #4285F4"
  },
  instructionStep: {
    display: "flex",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    fontSize: 13
  },
  stepNumber: {
    color: "#4285F4",
    fontWeight: 700,
    minWidth: 18
  },
  gclidBox: {
    background: theme.palette.type === "dark" ? "rgba(52,168,83,0.08)" : "#F0FFF4",
    borderRadius: 8,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderLeft: "4px solid #34A853"
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
    borderColor: "#4285F4",
    color: "#4285F4"
  },
  fieldRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("xs")]: { gridTemplateColumns: "1fr" }
  }
}));

const GoogleAdsPage = () => {
  const classes = useStyles();
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  const [active, setActive] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [conversionActionId, setConversionActionId] = useState("");
  const [developerToken, setDeveloperToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");

  const [visibilityMap, setVisibilityMap] = useState({
    developerToken: false, clientSecret: false, refreshToken: false
  });

  const [pipelines, setPipelines] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [newPipelineId, setNewPipelineId] = useState("");
  const [newStageId, setNewStageId] = useState("");
  const [newEventName, setNewEventName] = useState("LEAD");
  const [newCustomEventName, setNewCustomEventName] = useState("");
  const [availableStages, setAvailableStages] = useState([]);

  const toggleVisibility = (field) =>
    setVisibilityMap(prev => ({ ...prev, [field]: !prev[field] }));

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await api.get("/ad-tracking/google/config");
      if (data.found) {
        setActive(data.active || false);
        const creds = data.credentials || {};
        setCustomerId(creds.customerId || "");
        setConversionActionId(creds.conversionActionId || "");
        setDeveloperToken(creds.developerToken || "");
        setClientId(creds.clientId || "");
        setClientSecret(creds.clientSecret || "");
        setRefreshToken(creds.refreshToken || "");
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadMappings = useCallback(async () => {
    try {
      const { data } = await api.get("/ad-tracking/google/mappings");
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
      const { data } = await api.get("/ad-tracking/google/events?limit=30");
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

  const buildCredentials = () => ({
    customerId,
    conversionActionId,
    ...(developerToken && !developerToken.includes("...") ? { developerToken } : {}),
    ...(clientId ? { clientId } : {}),
    ...(clientSecret && !clientSecret.includes("...") ? { clientSecret } : {}),
    ...(refreshToken && !refreshToken.includes("...") ? { refreshToken } : {})
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/ad-tracking/google/config", {
        active,
        credentials: buildCredentials()
      });
      toast.success("Integração Google Ads salva com sucesso!");
      loadConfig();
    } catch (err) {
      toast.error("Erro ao salvar configuração.");
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const { data } = await api.post("/ad-tracking/google/test");
      if (data.ok) {
        toast.success(data.message || "Configuração validada com sucesso!");
      } else {
        toast.error(data.message || "Falha na validação.");
      }
    } catch (err) {
      toast.error("Erro ao validar configuração.");
    } finally {
      setValidating(false);
    }
  };

  const handleAddMapping = async () => {
    if (!newPipelineId || !newStageId || !newEventName) {
      toast.warn("Selecione o funil, a etapa e o evento.");
      return;
    }
    const finalEvent = newEventName === "custom" ? (newCustomEventName || "custom") : newEventName;
    try {
      await api.post("/ad-tracking/google/mappings", {
        pipelineId: newPipelineId,
        stageId: newStageId,
        eventName: finalEvent,
        customEventName: newEventName === "custom" ? newCustomEventName : null
      });
      toast.success("Mapeamento adicionado!");
      setNewPipelineId("");
      setNewStageId("");
      setNewEventName("LEAD");
      setNewCustomEventName("");
      loadMappings();
    } catch (err) {
      toast.error("Erro ao adicionar mapeamento.");
    }
  };

  const handleDeleteMapping = async (id) => {
    try {
      await api.delete(`/ad-tracking/google/mappings/${id}`);
      toast.success("Mapeamento removido.");
      loadMappings();
    } catch (err) {
      toast.error("Erro ao remover mapeamento.");
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.info("Copiado!"));
  };

  const SecretField = ({ label, value, onChange, fieldKey, placeholder }) => (
    <TextField
      label={label}
      placeholder={placeholder}
      variant="outlined"
      size="small"
      fullWidth
      type={visibilityMap[fieldKey] ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => toggleVisibility(fieldKey)}>
              {visibilityMap[fieldKey] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
            {value && (
              <IconButton size="small" onClick={() => handleCopy(value)}>
                <FileCopyIcon fontSize="small" />
              </IconButton>
            )}
          </InputAdornment>
        )
      }}
    />
  );

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
          <TrackChangesIcon style={{ color: "#fff", fontSize: 26 }} />
        </Box>
        <Box>
          <Typography variant="caption" style={{ color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>
            CONVERSÕES
          </Typography>
          <Typography variant="h5" style={{ fontWeight: 700 }}>Google Ads</Typography>
          <Typography variant="body2" color="textSecondary">
            Envie conversões ao Google Ads conforme o lead avança no funil.
          </Typography>
        </Box>
      </Box>

      {/* Card principal */}
      <Card className={classes.card} elevation={0}>
        <CardContent>
          <Box className={classes.cardHeader}>
            <Box>
              <Typography style={{ fontWeight: 700 }}>Google Ads (Enhanced Conversions)</Typography>
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
            <Typography style={{ fontWeight: 700, fontSize: 13, color: "#4285F4", marginBottom: 8 }}>
              Como configurar
            </Typography>
            {[
              "No Google Ads, copie o Customer ID (canto superior direito, formato 123-456-7890).",
              "Vá em Ferramentas → Conversões e copie o ID da ação de conversão.",
              "Configure OAuth e Developer Token para integração com a API do Google Ads.",
              "Cole os dados nos campos abaixo e valide a conexão.",
              "Configure os mapeamentos de conversão: escolha o funil, a etapa e o evento que será enviado.",
              "Ative e salve a integração."
            ].map((step, i) => (
              <Box key={i} className={classes.instructionStep}>
                <span className={classes.stepNumber}>{i + 1}.</span>
                <span>{step}</span>
              </Box>
            ))}
          </Box>

          {/* GCLID */}
          <Box className={classes.gclidBox}>
            <Typography style={{ fontWeight: 700, fontSize: 13, color: "#34A853", marginBottom: 4 }}>
              Captura automática de GCLID
            </Typography>
            <Typography variant="body2" color="textSecondary" style={{ fontSize: 13 }}>
              Quando existir GCLID associado ao lead, o sistema usa <strong>Click Conversion</strong>.
              Sem GCLID, usa <strong>Enhanced Conversions</strong> com dados hasheados do contato.
            </Typography>
          </Box>

          {/* Credenciais básicas */}
          <Typography className={classes.sectionTitle}>Credenciais</Typography>
          <Box className={classes.fieldRow}>
            <TextField
              label="Customer ID"
              placeholder="123-456-7890"
              variant="outlined"
              size="small"
              fullWidth
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
            <TextField
              label="Conversion Action ID"
              placeholder="123456789"
              variant="outlined"
              size="small"
              fullWidth
              value={conversionActionId}
              onChange={(e) => setConversionActionId(e.target.value)}
            />
          </Box>

          {/* OAuth accordion */}
          <Accordion elevation={0} style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, marginBottom: 16 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography style={{ fontWeight: 600, fontSize: 14 }}>OAuth / Developer Token</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" style={{ gap: 16, width: "100%" }}>
                <SecretField
                  label="Developer Token"
                  placeholder="Token do API Center do Google Ads"
                  value={developerToken}
                  onChange={setDeveloperToken}
                  fieldKey="developerToken"
                />
                <TextField
                  label="Client ID (OAuth)"
                  placeholder="xxx.apps.googleusercontent.com"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
                <SecretField
                  label="Client Secret (OAuth)"
                  placeholder=""
                  value={clientSecret}
                  onChange={setClientSecret}
                  fieldKey="clientSecret"
                />
                <SecretField
                  label="Refresh Token (OAuth)"
                  placeholder="Token de atualização com escopo adwords"
                  value={refreshToken}
                  onChange={setRefreshToken}
                  fieldKey="refreshToken"
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          <Box>
            <Button
              variant="outlined"
              className={classes.testBtn}
              onClick={handleValidate}
              disabled={validating || !customerId}
              startIcon={validating ? <CircularProgress size={14} /> : null}
            >
              Validar Configuração
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
                Defina qual evento será registrado quando um lead entrar na coluna. O rótulo do evento é usado no log interno; a conversão enviada ao Google usa a ação configurada acima.
              </Typography>
            </Box>
          </Box>

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
              <InputLabel>Evento</InputLabel>
              <Select value={newEventName} onChange={(e) => setNewEventName(e.target.value)} label="Evento">
                {GOOGLE_EVENTS.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
              </Select>
            </FormControl>
            <IconButton size="small" onClick={handleAddMapping} color="primary">
              <AddIcon />
            </IconButton>
          </Box>

          {newEventName === "custom" && (
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

          {!customerId && (
            <Box style={{ display: "flex", alignItems: "center", gap: 6, color: "#999", fontSize: 12, marginTop: 8 }}>
              <ErrorIcon style={{ fontSize: 14 }} />
              Preencha o Customer ID e Conversion Action ID para ativar a integração.
            </Box>
          )}

          <Divider style={{ margin: "12px 0" }} />

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

export default GoogleAdsPage;
